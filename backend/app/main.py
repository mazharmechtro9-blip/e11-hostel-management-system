import json
import logging
import secrets
import time
from collections import defaultdict, deque
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.middleware import BoundedRequestBodyMiddleware
from app.core.security import token_hash
from app.database.models import UserSession
from app.database.session import SessionLocal
from app.modules import analytics, auth, finance, imports, knowledge, operations

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("e11.api")
app = FastAPI(
    title="E-11 Hostel Management API",
    version="0.1.0",
    description="Database-driven hostel operations. All monetary amounts are exact PKR rupees.",
)
app.add_middleware(BoundedRequestBodyMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token", "X-Request-ID", "Idempotency-Key"],
)
if settings.production:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts.split(","))

# Development single-process limiter. Production deployments must use a shared
# ingress/Redis-backed limiter; see deployment security documentation.
_attempts: dict[str, deque[float]] = defaultdict(deque)


def limited(key: str, maximum: int, seconds: int) -> bool:
    now = time.monotonic()
    queue = _attempts[key]
    while queue and queue[0] <= now - seconds:
        queue.popleft()
    if len(queue) >= maximum:
        return True
    queue.append(now)
    if len(_attempts) > 10000:
        for stale_key in list(_attempts)[:1000]:
            if not _attempts[stale_key] or _attempts[stale_key][-1] < now - 60:
                _attempts.pop(stale_key, None)
    return False


@app.middleware("http")
async def security_context(request: Request, call_next):
    started = time.monotonic()
    request_id = str(uuid4())
    request.state.request_id = request_id
    path = request.url.path
    ip = request.client.host if request.client else "unknown"
    write = request.method in {"POST", "PUT", "PATCH", "DELETE"}
    if (
        request.headers.get("content-length", "0").isdigit()
        and int(request.headers.get("content-length", "0")) > 6 * 1024 * 1024
    ):
        return JSONResponse(
            status_code=413, content={"detail": "Request is too large", "request_id": request_id}
        )
    if write:
        limit = 12 if path.endswith("/auth/login") or "/mfa/" in path else 60
        category = (
            "authentication" if "/auth/" in path else "receipts" if "/receipts" in path else "write"
        )
        if limited(f"{ip}:{category}", limit, 60):
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests; try again shortly",
                    "request_id": request_id,
                },
                headers={"Retry-After": "60"},
            )
        public = path in {"/api/v1/auth/login", "/api/v1/bookings", "/api/v1/ai/public-chat"}
        origin = request.headers.get("origin")
        if (
            origin
            and origin.rstrip("/") not in settings.allowed_origins
            and (not public or path == "/api/v1/auth/login")
        ):
            return JSONResponse(
                status_code=403,
                content={"detail": "Request origin is not allowed", "request_id": request_id},
            )
        if not public:
            raw = request.cookies.get("e11_session")
            header = request.headers.get("x-csrf-token", "")
            cookie = request.cookies.get("e11_csrf", "")
            if raw:
                with SessionLocal() as db:
                    session = db.scalar(
                        select(UserSession).where(UserSession.token_hash == token_hash(raw))
                    )
                    csrf_valid = (
                        session
                        and header
                        and cookie
                        and secrets.compare_digest(header, cookie)
                        and secrets.compare_digest(header, session.csrf_token)
                    )
                if not csrf_valid:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "CSRF validation failed", "request_id": request_id},
                    )
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            json.dumps({"event": "request.failed", "request_id": request_id, "path": path})
        )
        response = JSONResponse(
            status_code=500,
            content={"detail": "An unexpected error occurred", "request_id": request_id},
        )
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if not path.startswith("/api/v1/public/"):
        response.headers["Cache-Control"] = "no-store"
    if settings.production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    logger.info(
        json.dumps(
            {
                "event": "request.completed",
                "request_id": request_id,
                "method": request.method,
                "path": path,
                "status": response.status_code,
                "duration_ms": round((time.monotonic() - started) * 1000, 2),
            }
        )
    )
    return response


@app.exception_handler(HTTPException)
async def application_error(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": getattr(request.state, "request_id", None)},
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    errors = [
        {"field": ".".join(str(part) for part in item["loc"]), "message": item["msg"]}
        for item in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Please check the submitted information",
            "errors": errors,
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.exception_handler(IntegrityError)
async def integrity_error(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=409,
        content={
            "detail": "This change conflicts with an existing record or active allocation",
            "request_id": getattr(request.state, "request_id", None),
        },
    )


@app.get("/health", tags=["Health"])
def health():
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected", "environment": settings.app_env}
    except Exception as exc:
        raise HTTPException(503, "Database connection unavailable") from exc


for module in (auth, analytics, operations, finance, knowledge, imports):
    app.include_router(module.router, prefix="/api/v1")
