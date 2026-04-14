from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, Enum, JSON, Date
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid
import enum


def gen_uuid():
    return str(uuid.uuid4())


# ─── Enums ───────────────────────────────────────────────────────────────────

class SubscriptionPlan(str, enum.Enum):
    free = "free"
    starter = "starter"
    pro = "pro"
    kennel = "kennel"


class DogSex(str, enum.Enum):
    male = "male"
    female = "female"


class LitterStatus(str, enum.Enum):
    planned = "planned"
    pregnant = "pregnant"
    born = "born"
    weaning = "weaning"
    ready = "ready"
    complete = "complete"


class BuyerStatus(str, enum.Enum):
    inquiry = "inquiry"
    waitlisted = "waitlisted"
    deposit_paid = "deposit_paid"
    matched = "matched"
    contract_sent = "contract_sent"
    complete = "complete"
    declined = "declined"


class ContractStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    signed = "signed"
    voided = "voided"


class HealthTestStatus(str, enum.Enum):
    pending = "pending"
    passed = "passed"
    failed = "failed"
    not_required = "not_required"


# ─── User / Breeder ───────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    kennel_name = Column(String)
    phone = Column(String)
    address = Column(String)
    website = Column(String)
    breeds = Column(JSON, default=list)  # ["Golden Retriever", "Labrador"]
    bio = Column(Text)

    # Subscription
    subscription_plan = Column(Enum(SubscriptionPlan), default=SubscriptionPlan.free)
    stripe_customer_id = Column(String)
    stripe_subscription_id = Column(String)
    subscription_active = Column(Boolean, default=False)
    trial_ends_at = Column(DateTime)

    # Stripe Connect (for deposit collection)
    stripe_account_id = Column(String)
    stripe_onboarded = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime)

    # Relations
    dogs = relationship("Dog", back_populates="owner", cascade="all, delete-orphan")
    litters = relationship("Litter", back_populates="breeder", cascade="all, delete-orphan")
    buyers = relationship("Buyer", back_populates="breeder", cascade="all, delete-orphan")


# ─── Dog ──────────────────────────────────────────────────────────────────────

class Dog(Base):
    __tablename__ = "dogs"

    id = Column(String, primary_key=True, default=gen_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False)
    registered_name = Column(String)
    breed = Column(String, nullable=False)
    sex = Column(Enum(DogSex), nullable=False)
    dob = Column(Date)
    color = Column(String)
    weight_lbs = Column(Float)

    # Registration
    akc_number = Column(String)
    registration_org = Column(String)  # AKC, UKC, CKC, etc.

    # Health
    health_tests = Column(JSON, default=dict)  # {"hip": "OFA Good", "eyes": "CAER Clear"}
    health_notes = Column(Text)

    # Genetic
    dna_profile = Column(String)
    color_genetics = Column(String)

    # Media
    photo_url = Column(String)
    photos = Column(JSON, default=list)

    # Pedigree
    sire_id = Column(String, ForeignKey("dogs.id"))
    dam_id = Column(String, ForeignKey("dogs.id"))

    is_active = Column(Boolean, default=True)
    is_external = Column(Boolean, default=False)  # stud dog not owned by breeder

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relations
    owner = relationship("User", back_populates="dogs")
    sire = relationship("Dog", foreign_keys=[sire_id], remote_side="Dog.id")
    dam = relationship("Dog", foreign_keys=[dam_id], remote_side="Dog.id")
    litters_as_sire = relationship("Litter", foreign_keys="Litter.sire_id", back_populates="sire")
    litters_as_dam = relationship("Litter", foreign_keys="Litter.dam_id", back_populates="dam")
    health_records = relationship("HealthRecord", back_populates="dog", cascade="all, delete-orphan")


# ─── Litter ───────────────────────────────────────────────────────────────────

class Litter(Base):
    __tablename__ = "litters"

    id = Column(String, primary_key=True, default=gen_uuid)
    breeder_id = Column(String, ForeignKey("users.id"), nullable=False)

    name = Column(String)  # "Spring 2024 Litter"
    breed = Column(String, nullable=False)
    status = Column(Enum(LitterStatus), default=LitterStatus.planned)

    sire_id = Column(String, ForeignKey("dogs.id"))
    dam_id = Column(String, ForeignKey("dogs.id"))

    # Dates
    breeding_date = Column(Date)
    due_date = Column(Date)
    whelp_date = Column(Date)
    go_home_date = Column(Date)

    # Puppies
    num_males = Column(Integer, default=0)
    num_females = Column(Integer, default=0)
    puppy_price = Column(Float)
    deposit_amount = Column(Float)

    # Details
    notes = Column(Text)
    photos = Column(JSON, default=list)
    waitlist_open = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relations
    breeder = relationship("User", back_populates="litters")
    sire = relationship("Dog", foreign_keys=[sire_id], back_populates="litters_as_sire")
    dam = relationship("Dog", foreign_keys=[dam_id], back_populates="litters_as_dam")
    puppies = relationship("Puppy", back_populates="litter", cascade="all, delete-orphan")
    buyer_litter_matches = relationship("BuyerLitterMatch", back_populates="litter")


# ─── Puppy ────────────────────────────────────────────────────────────────────

class Puppy(Base):
    __tablename__ = "puppies"

    id = Column(String, primary_key=True, default=gen_uuid)
    litter_id = Column(String, ForeignKey("litters.id"), nullable=False)

    collar_color = Column(String)
    name = Column(String)
    sex = Column(Enum(DogSex))
    birth_weight_oz = Column(Float)
    current_weight_oz = Column(Float)
    color = Column(String)
    markings = Column(String)
    notes = Column(Text)
    photo_url = Column(String)

    is_available = Column(Boolean, default=True)
    is_keeper = Column(Boolean, default=False)  # breeder keeping this one

    created_at = Column(DateTime, server_default=func.now())

    litter = relationship("Litter", back_populates="puppies")
    buyer_match = relationship("BuyerLitterMatch", back_populates="puppy", uselist=False)


# ─── Buyer ────────────────────────────────────────────────────────────────────

class Buyer(Base):
    __tablename__ = "buyers"

    id = Column(String, primary_key=True, default=gen_uuid)
    breeder_id = Column(String, ForeignKey("users.id"), nullable=False)

    # Contact
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String)
    city = Column(String)
    state = Column(String)

    # Preferences
    breed_preference = Column(String)
    sex_preference = Column(String)  # male, female, either
    color_preference = Column(String)
    lifestyle_notes = Column(Text)
    experience_level = Column(String)  # first-time, experienced, breeder

    # Status
    status = Column(Enum(BuyerStatus), default=BuyerStatus.inquiry)
    priority_score = Column(Integer, default=50)  # 0-100 AI-generated score
    referral_source = Column(String)

    # AI notes
    ai_notes = Column(Text)  # AI-generated summary of buyer fit

    # Communication
    last_contacted = Column(DateTime)
    follow_up_date = Column(DateTime)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relations
    breeder = relationship("User", back_populates="buyers")
    litter_matches = relationship("BuyerLitterMatch", back_populates="buyer")
    contracts = relationship("Contract", back_populates="buyer")
    communications = relationship("Communication", back_populates="buyer", cascade="all, delete-orphan")


# ─── Buyer-Litter Match ───────────────────────────────────────────────────────

class BuyerLitterMatch(Base):
    __tablename__ = "buyer_litter_matches"

    id = Column(String, primary_key=True, default=gen_uuid)
    buyer_id = Column(String, ForeignKey("buyers.id"), nullable=False)
    litter_id = Column(String, ForeignKey("litters.id"), nullable=False)
    puppy_id = Column(String, ForeignKey("puppies.id"))

    position = Column(Integer)  # waitlist position
    deposit_paid = Column(Boolean, default=False)
    deposit_amount = Column(Float)
    stripe_payment_intent_id = Column(String)

    match_score = Column(Integer)  # AI-calculated match score
    match_notes = Column(Text)

    created_at = Column(DateTime, server_default=func.now())

    buyer = relationship("Buyer", back_populates="litter_matches")
    litter = relationship("Litter", back_populates="buyer_litter_matches")
    puppy = relationship("Puppy", back_populates="buyer_match")


# ─── Contract ─────────────────────────────────────────────────────────────────

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String, primary_key=True, default=gen_uuid)
    breeder_id = Column(String, ForeignKey("users.id"), nullable=False)
    buyer_id = Column(String, ForeignKey("buyers.id"), nullable=False)
    litter_id = Column(String, ForeignKey("litters.id"))

    status = Column(Enum(ContractStatus), default=ContractStatus.draft)

    # Content
    title = Column(String)
    content = Column(Text)  # Full contract text (AI-generated)
    template_vars = Column(JSON, default=dict)  # variables used to generate

    # Pricing
    sale_price = Column(Float)
    deposit_amount = Column(Float)
    balance_due = Column(Float)
    balance_due_date = Column(Date)

    # Signing
    sent_at = Column(DateTime)
    signed_at = Column(DateTime)
    buyer_signature = Column(String)
    sign_token = Column(String, unique=True)  # for email signing link

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    buyer = relationship("Buyer", back_populates="contracts")


# ─── Health Record ────────────────────────────────────────────────────────────

class HealthRecord(Base):
    __tablename__ = "health_records"

    id = Column(String, primary_key=True, default=gen_uuid)
    dog_id = Column(String, ForeignKey("dogs.id"), nullable=False)

    record_type = Column(String)  # vaccination, deworming, vet-visit, test
    description = Column(String, nullable=False)
    administered_by = Column(String)
    administered_at = Column(Date, nullable=False)
    next_due = Column(Date)
    result = Column(String)
    document_url = Column(String)
    notes = Column(Text)

    created_at = Column(DateTime, server_default=func.now())

    dog = relationship("Dog", back_populates="health_records")


# ─── Communication ────────────────────────────────────────────────────────────

class Communication(Base):
    __tablename__ = "communications"

    id = Column(String, primary_key=True, default=gen_uuid)
    buyer_id = Column(String, ForeignKey("buyers.id"), nullable=False)

    channel = Column(String)  # email, sms, note
    direction = Column(String)  # inbound, outbound
    subject = Column(String)
    body = Column(Text)
    sent_at = Column(DateTime, server_default=func.now())
    ai_generated = Column(Boolean, default=False)

    buyer = relationship("Buyer", back_populates="communications")
