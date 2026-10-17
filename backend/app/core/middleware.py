from starlette.responses import JSONResponse


class BoundedRequestBodyMiddleware:
    """Reject oversized bodies before JSON or multipart parsing, including chunked uploads.

    Bodies are buffered only up to the configured bound. The reverse proxy should
    impose the same limit and connection/read deadlines in production.
    """

    def __init__(self, app, max_bytes: int = 6 * 1024 * 1024):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in {"POST", "PUT", "PATCH"}:
            await self.app(scope, receive, send)
            return
        messages = []
        total = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            total += len(message.get("body", b""))
            if total > self.max_bytes:
                await JSONResponse(
                    {
                        "detail": "Request is too large",
                        "request_id": scope.get("state", {}).get("request_id"),
                    },
                    status_code=413,
                )(scope, receive, send)
                return
            messages.append(message)
            if not message.get("more_body", False):
                break
        iterator = iter(messages)

        async def replay():
            try:
                return next(iterator)
            except StopIteration:
                return await receive()

        await self.app(scope, replay, send)
