"""Approved public knowledge retrieval and deliberately read-only assistants.

The local hashing embedder is a development retrieval baseline, not an LLM.
Neither user text nor retrieved documents are interpreted as commands or SQL.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import hashlib
import math
import re
from typing import Protocol
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text, func, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.dependencies import get_db, require_roles
from app.database.base import Base
from app.database.models import (
    Allocation,
    AuditEvent,
    Bed,
    Complaint,
    Invoice,
    Payment,
    Room,
    RoomType,
    Setting,
    User,
)


class KnowledgeDocument(Base):
    __tablename__ = "ai_knowledge_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    title: Mapped[str] = mapped_column(String(160))
    content: Mapped[str] = mapped_column(Text)
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class KnowledgeChunk(Base):
    __tablename__ = "ai_knowledge_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    document_id: Mapped[str] = mapped_column(
        ForeignKey("ai_knowledge_documents.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int]
    content: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(JSON)


class EmbeddingProvider(Protocol):
    """Replace with a separately configured, tested embedding service in production."""

    def embed(self, text: str) -> list[float]: ...


class LocalHashEmbedding:
    dimensions = 128

    def embed(self, text: str) -> list[float]:
        result = [0.0] * self.dimensions
        for token, count in Counter(re.findall(r"[\w]+", text.lower())).items():
            index = (
                int.from_bytes(hashlib.sha256(token.encode()).digest()[:4], "big") % self.dimensions
            )
            result[index] += count
        norm = math.sqrt(sum(value * value for value in result))
        return [value / norm if norm else 0.0 for value in result]


class TextChunker:
    def split(self, text: str, size: int = 700, overlap: int = 100) -> list[str]:
        if size <= overlap or overlap < 0:
            raise ValueError("Chunk size must exceed a nonnegative overlap")
        normalized = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text).strip()
        return [
            normalized[start : start + size] for start in range(0, len(normalized), size - overlap)
        ]


class AIKnowledgeService:
    def __init__(self, db: Session, embeddings: EmbeddingProvider | None = None):
        self.db = db
        self.embeddings = embeddings or LocalHashEmbedding()

    def ingest(self, user: User, title: str, content: str, approved: bool) -> KnowledgeDocument:
        document = KnowledgeDocument(
            title=title, content=content, approved=approved, created_by=user.id
        )
        self.db.add(document)
        self.db.flush()
        for position, chunk in enumerate(TextChunker().split(content)):
            self.db.add(
                KnowledgeChunk(
                    document_id=document.id,
                    position=position,
                    content=chunk,
                    embedding=self.embeddings.embed(chunk),
                )
            )
        self.db.add(
            AuditEvent(
                actor_id=user.id,
                action="knowledge.ingested",
                entity="knowledge_document",
                entity_id=document.id,
                details={"approved": approved, "role": user.role},
            )
        )
        self.db.commit()
        return document

    def retrieve(self, question: str, limit: int = 3) -> list[dict]:
        vector = self.embeddings.embed(question)
        rows = self.db.execute(
            select(KnowledgeChunk, KnowledgeDocument)
            .join(KnowledgeDocument, KnowledgeDocument.id == KnowledgeChunk.document_id)
            .where(KnowledgeDocument.approved.is_(True))
            .limit(1000)
        ).all()
        ranked = sorted(
            (
                (sum(a * b for a, b in zip(vector, chunk.embedding, strict=True)), chunk, doc)
                for chunk, doc in rows
            ),
            key=lambda item: item[0],
            reverse=True,
        )
        return [
            {
                "document_id": doc.id,
                "title": doc.title,
                "text": chunk.content,
                "score": round(score, 4),
            }
            for score, chunk, doc in ranked[:limit]
            if score >= 0.12
        ]


class ChatInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    message: str = Field(min_length=1, max_length=2000)


class DocumentInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(min_length=3, max_length=160)
    content: str = Field(min_length=20, max_length=50000)
    approved: bool = False


class ApprovalInput(BaseModel):
    approved: bool


router = APIRouter(tags=["Knowledge and assistants"])
owner = require_roles("owner")


@router.get("/ai/knowledge")
def documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(owner),
):
    rows = db.scalars(
        select(KnowledgeDocument)
        .order_by(KnowledgeDocument.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": [
            {
                "id": row.id,
                "title": row.title,
                "content": row.content,
                "approved": row.approved,
                "created_at": row.created_at,
            }
            for row in rows
        ],
        "total": db.scalar(select(func.count(KnowledgeDocument.id))) or 0,
    }


@router.post("/ai/knowledge", status_code=201)
def ingest_document(
    payload: DocumentInput, db: Session = Depends(get_db), user: User = Depends(owner)
):
    row = AIKnowledgeService(db).ingest(user, payload.title, payload.content, payload.approved)
    return {
        "id": row.id,
        "title": row.title,
        "approved": row.approved,
        "message": "Text parsed, chunked and indexed with the development retrieval provider.",
    }


@router.patch("/ai/knowledge/{document_id}")
def approve_document(
    document_id: str,
    payload: ApprovalInput,
    db: Session = Depends(get_db),
    user: User = Depends(owner),
):
    document = db.get(KnowledgeDocument, document_id)
    if not document:
        raise HTTPException(404, "Knowledge document not found")
    document.approved = payload.approved
    db.add(
        AuditEvent(
            actor_id=user.id,
            action="knowledge.approval_changed",
            entity="knowledge_document",
            entity_id=document.id,
            details={"approved": payload.approved, "role": user.role},
        )
    )
    db.commit()
    return {"id": document.id, "approved": document.approved}


def reply(answer: str, sources: list[dict]) -> dict:
    return {
        "answer": answer,
        "message": answer,
        "sources": sources,
        "mode": "deterministic_fallback",
        "provider": "Local FAQ and development retrieval",
        "notice": "Development assistant: no external language model is connected. Responses cannot perform actions.",
    }


@router.post("/ai/public-chat")
def public_chat(payload: ChatInput, db: Session = Depends(get_db)):
    question = payload.message.lower()
    prices = db.scalars(select(RoomType).order_by(RoomType.capacity)).all()
    if any(
        word in question for word in ("price", "rent", "seater", "fee", "kitna", "کرایہ", "قیمت")
    ):
        number = re.search(r"\b([2-6])\b", question)
        selected = [row for row in prices if not number or row.capacity == int(number.group(1))]
        answer = "; ".join(
            f"{row.name}: PKR {row.monthly_price:,} per student / month" for row in selected
        )
        return reply(
            answer or "Please ask the hostel office about current pricing.",
            [{"title": "Configured room prices"}],
        )
    if any(word in question for word in ("book", "booking", "register", "بکنگ")):
        return reply(
            "Choose a room category on Rooms & Pricing, complete the booking form, and submit it yourself. "
            "Management reviews the request before approving it and assigning an available bed. "
            "I cannot submit a request or reserve a bed on your behalf.",
            [{"title": "Booking procedure"}],
        )
    keys = {
        "refund": "refund_policy",
        "rules": "house_rules",
        "policy": "booking_policy",
        "contact": "phone",
        "phone": "phone",
        "location": "address",
        "address": "address",
        "facilit": "facilities",
        "wifi": "facilities",
        "laundry": "facilities",
        "mess": "facilities",
        "transport": "facilities",
        "pick": "facilities",
    }
    for word, key in keys.items():
        if word in question:
            record = db.get(Setting, key)
            if record and record.value:
                return reply(str(record.value), [{"title": f"Approved public setting: {key}"}])
    sources = AIKnowledgeService(db).retrieve(payload.message)
    if sources:
        # Quote retrieved text as data. No instruction execution, private queries, or external tools.
        answer = "From the approved hostel knowledge base:\n\n" + "\n\n".join(
            source["text"] for source in sources
        )
        return reply(answer, sources)
    return reply(
        "I can help with published room prices, facilities, booking, and approved hostel policies. "
        "For questions not covered by published information, contact the hostel office. "
        "Private resident records and financial actions are unavailable here.",
        [],
    )


@router.post("/ai/admin-chat")
def admin_chat(payload: ChatInput, db: Session = Depends(get_db), user: User = Depends(owner)):
    question = payload.message.lower()
    if any(word in question for word in ("rent", "revenue", "collect", "due", "financial")):
        verified = (
            db.scalar(
                select(func.coalesce(func.sum(Payment.amount), 0)).where(
                    Payment.status == "verified"
                )
            )
            or 0
        )
        outstanding = (
            db.scalar(select(func.coalesce(func.sum(Invoice.total - Invoice.paid_amount), 0))) or 0
        )
        return reply(
            f"Across recorded billing periods, verified collections are PKR {verified:,}; "
            f"outstanding invoice balances total PKR {outstanding:,}. Pending submissions are excluded.",
            [{"title": "Verified payment ledger and invoice balances"}],
        )
    if any(word in question for word in ("complaint", "issue", "maintenance")):
        rows = db.execute(
            select(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category)
        ).all()
        return reply(
            "Recorded complaint categories: "
            + (", ".join(f"{category}: {count}" for category, count in rows) or "none yet"),
            [{"title": "Complaint aggregates"}],
        )
    usable = (Bed.status == "available") & (Room.status == "available")
    beds = (
        db.scalar(select(func.count(Bed.id)).join(Room, Room.id == Bed.room_id).where(usable)) or 0
    )
    occupied = (
        db.scalar(
            select(func.count(Allocation.id))
            .join(Bed, Bed.id == Allocation.bed_id)
            .join(Room, Room.id == Bed.room_id)
            .where(Allocation.active.is_(True), usable)
        )
        or 0
    )
    return reply(
        f"Recorded capacity includes {beds} operational beds and {occupied} active allocations. "
        "Use the floor map to inspect individual rooms. This assistant provides read-only summaries.",
        [{"title": "Bed and active allocation records"}],
    )
