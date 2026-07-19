from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import User
from app.models import Dog, HealthRecord
from app.schemas import DogCreate, DogOut, HealthRecordCreate, HealthRecordOut
from app.routers.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[DogOut])
def list_dogs(
    sex: str = None,
    breed: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Dog).filter(Dog.owner_id == current_user.id, Dog.is_active == True)
    if sex:
        query = query.filter(Dog.sex == sex)
    if breed:
        query = query.filter(Dog.breed == breed)
    return query.order_by(Dog.name).all()


@router.post("/", response_model=DogOut, status_code=201)
def create_dog(
    data: DogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dog = Dog(id=str(uuid.uuid4()), owner_id=current_user.id, **data.model_dump())
    db.add(dog)
    db.commit()
    db.refresh(dog)
    return dog


@router.get("/{dog_id}", response_model=DogOut)
def get_dog(
    dog_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dog = db.query(Dog).filter(Dog.id == dog_id, Dog.owner_id == current_user.id).first()
    if not dog:
        raise HTTPException(404, "Dog not found")
    return dog


@router.put("/{dog_id}", response_model=DogOut)
def update_dog(
    dog_id: str,
    data: DogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dog = db.query(Dog).filter(Dog.id == dog_id, Dog.owner_id == current_user.id).first()
    if not dog:
        raise HTTPException(404, "Dog not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(dog, field, value)
    db.commit()
    db.refresh(dog)
    return dog


@router.delete("/{dog_id}", status_code=204)
def delete_dog(
    dog_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dog = db.query(Dog).filter(Dog.id == dog_id, Dog.owner_id == current_user.id).first()
    if not dog:
        raise HTTPException(404, "Dog not found")
    dog.is_active = False  # Soft delete
    db.commit()


def _get_owned_dog(dog_id: str, current_user: User, db: Session) -> Dog:
    dog = db.query(Dog).filter(Dog.id == dog_id, Dog.owner_id == current_user.id).first()
    if not dog:
        raise HTTPException(404, "Dog not found")
    return dog


@router.get("/{dog_id}/health-records", response_model=List[HealthRecordOut])
def list_health_records(
    dog_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _get_owned_dog(dog_id, current_user, db)
    return db.query(HealthRecord).filter(HealthRecord.dog_id == dog_id).order_by(HealthRecord.administered_at.desc()).all()


@router.post("/{dog_id}/health-records", response_model=HealthRecordOut, status_code=201)
def create_health_record(
    dog_id: str,
    data: HealthRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _get_owned_dog(dog_id, current_user, db)
    record = HealthRecord(id=str(uuid.uuid4()), dog_id=dog_id, **data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{dog_id}/health-records/{record_id}", status_code=204)
def delete_health_record(
    dog_id: str,
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    _get_owned_dog(dog_id, current_user, db)
    record = db.query(HealthRecord).filter(HealthRecord.id == record_id, HealthRecord.dog_id == dog_id).first()
    if not record:
        raise HTTPException(404, "Health record not found")
    db.delete(record)
    db.commit()
