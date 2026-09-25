from datetime import datetime
from enum import Enum
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Enum as SqlEnum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, Enum):
    OFFICER = "officer"
    REVIEWER = "reviewer"
    ADMIN = "admin"


class StandardRelationshipType(str, Enum):
    NORMATIVE_REFERENCE = "normative_reference"
    TEST_METHOD = "test_method"
    TERMINOLOGY = "terminology"
    SAFETY = "safety"
    INSTALLATION = "installation"
    RELATED_PRODUCT = "related_product"


class AnalysisStatus(str, Enum):
    DRAFT = "draft"
    ANALYZED = "analyzed"
    REVIEWED = "reviewed"
    EXPORTED = "exported"


class ReviewerDecision(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EDITED = "edited"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        SqlEnum(UserRole, name="user_role"),
        default=UserRole.OFFICER,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    analyses: Mapped[list["Analysis"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Standard(Base):
    __tablename__ = "standards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    is_number: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(500))
    scope: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    aliases: Mapped[list[str]] = mapped_column(JSONB, default=list)
    technical_parameters: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    version_edition: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amendments: Mapped[list[Any]] = mapped_column(JSONB, default=list)
    certification_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    source_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(384), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="standard",
        cascade="all, delete-orphan",
    )
    outgoing_relationships: Mapped[list["StandardRelationship"]] = relationship(
        foreign_keys="StandardRelationship.from_standard_id",
        back_populates="from_standard",
        cascade="all, delete-orphan",
    )
    incoming_relationships: Mapped[list["StandardRelationship"]] = relationship(
        foreign_keys="StandardRelationship.to_standard_id",
        back_populates="to_standard",
        cascade="all, delete-orphan",
    )


class StandardRelationship(Base):
    __tablename__ = "standard_relationships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    from_standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE"),
        index=True,
    )
    to_standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE"),
        index=True,
    )
    relationship_type: Mapped[StandardRelationshipType] = mapped_column(
        SqlEnum(StandardRelationshipType, name="standard_relationship_type"),
    )

    from_standard: Mapped[Standard] = relationship(
        foreign_keys=[from_standard_id],
        back_populates="outgoing_relationships",
    )
    to_standard: Mapped[Standard] = relationship(
        foreign_keys=[to_standard_id],
        back_populates="incoming_relationships",
    )


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    title: Mapped[str] = mapped_column(String(500))
    raw_input_text: Mapped[str] = mapped_column(Text)
    uploaded_filename: Mapped[str | None] = mapped_column(String(500), nullable=True)
    input_language: Mapped[str] = mapped_column(String(50))
    extracted_requirements: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    status: Mapped[AnalysisStatus] = mapped_column(
        SqlEnum(AnalysisStatus, name="analysis_status"),
        default=AnalysisStatus.DRAFT,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user: Mapped[User] = relationship(back_populates="analyses")
    recommendations: Mapped[list["Recommendation"]] = relationship(
        back_populates="analysis",
        cascade="all, delete-orphan",
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        back_populates="analysis",
        cascade="all, delete-orphan",
    )


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_id: Mapped[int] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"),
        index=True,
    )
    standard_id: Mapped[int] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE"),
        index=True,
    )
    rank: Mapped[int] = mapped_column(Integer)
    confidence_score: Mapped[float] = mapped_column(Float)
    relationship_type: Mapped[StandardRelationshipType | None] = mapped_column(
        SqlEnum(StandardRelationshipType, name="recommendation_relationship_type"),
        nullable=True,
    )
    semantic_similarity: Mapped[float] = mapped_column(Float)
    parameter_coverage: Mapped[float] = mapped_column(Float)
    evidence_snippets: Mapped[list[dict[str, str]]] = mapped_column(JSONB, default=list)
    reviewer_decision: Mapped[ReviewerDecision | None] = mapped_column(
        SqlEnum(ReviewerDecision, name="reviewer_decision"),
        nullable=True,
    )
    reviewer_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    analysis: Mapped[Analysis] = relationship(back_populates="recommendations")
    standard: Mapped[Standard] = relationship(back_populates="recommendations")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    analysis_id: Mapped[int] = mapped_column(
        ForeignKey("analyses.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    action: Mapped[str] = mapped_column(String(100))
    details: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    analysis: Mapped[Analysis] = relationship(back_populates="audit_logs")
    user: Mapped[User] = relationship(back_populates="audit_logs")
