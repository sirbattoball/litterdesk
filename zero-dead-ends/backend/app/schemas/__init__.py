from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    kennel_name: Optional[str] = None
    breeds: Optional[List[str]] = []


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    kennel_name: Optional[str]
    breeds: Optional[List[str]] = []
    subscription_plan: str
    subscription_active: bool
    stripe_onboarded: bool

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    kennel_name: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    breeds: Optional[List[str]] = None
    bio: Optional[str] = None


# ─── Dog Schemas ──────────────────────────────────────────────────────────────

class DogCreate(BaseModel):
    name: str
    breed: str
    sex: str
    dob: Optional[date] = None
    registered_name: Optional[str] = None
    color: Optional[str] = None
    weight_lbs: Optional[float] = None
    akc_number: Optional[str] = None
    registration_org: Optional[str] = None
    health_tests: Optional[Dict[str, Any]] = {}
    health_notes: Optional[str] = None
    photo_url: Optional[str] = None
    is_external: Optional[bool] = False


class DogOut(BaseModel):
    id: str
    name: str
    registered_name: Optional[str]
    breed: str
    sex: str
    dob: Optional[date]
    color: Optional[str]
    weight_lbs: Optional[float]
    akc_number: Optional[str]
    health_tests: Optional[Dict]
    photo_url: Optional[str]
    is_active: bool
    is_external: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Litter Schemas ───────────────────────────────────────────────────────────

class LitterCreate(BaseModel):
    name: Optional[str] = None
    breed: str
    sire_id: Optional[str] = None
    dam_id: Optional[str] = None
    breeding_date: Optional[date] = None
    due_date: Optional[date] = None
    whelp_date: Optional[date] = None
    go_home_date: Optional[date] = None
    puppy_price: Optional[float] = None
    deposit_amount: Optional[float] = None
    notes: Optional[str] = None


class LitterUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    num_males: Optional[int] = None
    num_females: Optional[int] = None
    whelp_date: Optional[date] = None
    go_home_date: Optional[date] = None
    puppy_price: Optional[float] = None
    deposit_amount: Optional[float] = None
    notes: Optional[str] = None
    waitlist_open: Optional[bool] = None


class LitterOut(BaseModel):
    id: str
    name: Optional[str]
    breed: str
    status: str
    sire_id: Optional[str]
    dam_id: Optional[str]
    breeding_date: Optional[date]
    due_date: Optional[date]
    whelp_date: Optional[date]
    go_home_date: Optional[date]
    num_males: int
    num_females: int
    puppy_price: Optional[float]
    deposit_amount: Optional[float]
    notes: Optional[str]
    waitlist_open: bool
    created_at: datetime
    sire: Optional[DogOut] = None
    dam: Optional[DogOut] = None

    class Config:
        from_attributes = True


# ─── Puppy Schemas ────────────────────────────────────────────────────────────

class PuppyCreate(BaseModel):
    collar_color: Optional[str] = None
    name: Optional[str] = None
    sex: Optional[str] = None
    birth_weight_oz: Optional[float] = None
    color: Optional[str] = None
    markings: Optional[str] = None
    notes: Optional[str] = None
    is_keeper: Optional[bool] = False


class PuppyOut(BaseModel):
    id: str
    collar_color: Optional[str]
    name: Optional[str]
    sex: Optional[str]
    birth_weight_oz: Optional[float]
    current_weight_oz: Optional[float]
    color: Optional[str]
    is_available: bool
    is_keeper: bool
    photo_url: Optional[str]

    class Config:
        from_attributes = True


# ─── Buyer Schemas ────────────────────────────────────────────────────────────

class BuyerCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    breed_preference: Optional[str] = None
    sex_preference: Optional[str] = None
    color_preference: Optional[str] = None
    lifestyle_notes: Optional[str] = None
    experience_level: Optional[str] = None
    referral_source: Optional[str] = None


class BuyerUpdate(BaseModel):
    status: Optional[str] = None
    priority_score: Optional[int] = None
    follow_up_date: Optional[datetime] = None
    lifestyle_notes: Optional[str] = None
    experience_level: Optional[str] = None


class BuyerOut(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str]
    city: Optional[str]
    state: Optional[str]
    breed_preference: Optional[str]
    sex_preference: Optional[str]
    status: str
    priority_score: int
    experience_level: Optional[str]
    ai_notes: Optional[str]
    last_contacted: Optional[datetime]
    follow_up_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Contract Schemas ─────────────────────────────────────────────────────────

class ContractCreate(BaseModel):
    buyer_id: str
    litter_id: Optional[str] = None
    sale_price: Optional[float] = None
    deposit_amount: Optional[float] = None
    balance_due_date: Optional[date] = None
    content: Optional[str] = None
    status: Optional[str] = "draft"


class ContractOut(BaseModel):
    id: str
    buyer_id: str
    litter_id: Optional[str]
    status: str
    title: Optional[str]
    content: Optional[str]
    sale_price: Optional[float]
    deposit_amount: Optional[float]
    balance_due: Optional[float]
    sent_at: Optional[datetime]
    signed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    active_litters: int
    total_buyers: int
    buyers_with_deposit: int
    available_puppies: int
    contracts_pending: int
    revenue_this_month: float
    follow_ups_due: int
