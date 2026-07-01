"""
User, Household, and HouseholdMember models.

Households are the ownership unit for all assets — a household can have
multiple members (e.g., spouses sharing a joint portfolio view).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import HouseholdRole

if TYPE_CHECKING:
    from .asset import Asset
    from .statements import StatementSource
    from .history import PortfolioSummary


class User(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """Application user.  Owns one or more Households."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        doc="Login email address (unique, lowercased at application layer).",
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        doc="E.164 format recommended, e.g. +919876543210.",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────

    memberships: Mapped[List[HouseholdMember]] = relationship(
        "HouseholdMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id!r} email={self.email!r}>"


class Household(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, Base):
    """
    Logical grouping of assets.
    
    A single user can have multiple households (e.g., personal vs. joint),
    or multiple family members can share one household.
    """

    __tablename__ = "households"

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Display name, e.g. 'Bokka Rakesh — Personal' or 'Joint Account'.",
    )
    owner_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        doc="Primary owner of this household.",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    base_currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        default="INR",
        server_default="INR",
        doc="ISO 4217 currency code used as the reporting currency.",
    )

    # ── Relationships ─────────────────────────────────────────────────────────

    owner: Mapped[User] = relationship(
        "User",
        foreign_keys=[owner_id],
    )
    members: Mapped[List[HouseholdMember]] = relationship(
        "HouseholdMember",
        back_populates="household",
        cascade="all, delete-orphan",
    )
    assets: Mapped[List[Asset]] = relationship(
        "Asset",
        back_populates="household",
    )
    statements: Mapped[List[StatementSource]] = relationship(
        "StatementSource",
        back_populates="household",
    )
    portfolio_summaries: Mapped[List[PortfolioSummary]] = relationship(
        "PortfolioSummary",
        back_populates="household",
    )

    def __repr__(self) -> str:
        return f"<Household id={self.id!r} name={self.name!r}>"


class HouseholdMember(TimestampMixin, Base):
    """
    Many-to-many join table between User and Household with a role column.

    A user must have exactly one role per household.
    """

    __tablename__ = "household_members"

    __table_args__ = (
        UniqueConstraint("household_id", "user_id", name="uq_household_member"),
    )

    household_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("households.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role: Mapped[HouseholdRole] = mapped_column(
        Enum(HouseholdRole, name="household_role"),
        nullable=False,
        default=HouseholdRole.VIEWER,
        doc="OWNER: full control; ADMIN: edit; VIEWER: read-only.",
    )
    invited_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────

    household: Mapped[Household] = relationship(
        "Household",
        back_populates="members",
    )
    user: Mapped[User] = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="memberships",
    )

    def __repr__(self) -> str:
        return (
            f"<HouseholdMember household={self.household_id!r} "
            f"user={self.user_id!r} role={self.role.value!r}>"
        )
