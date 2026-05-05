from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from auth_utils import hash_password, verify_password, create_access_token, get_current_user
import models

router = APIRouter()


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None


def _user_out(user: models.User) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email}


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if not req.name.strip():
        raise HTTPException(400, "Name is required")
    if not req.email.strip() or "@" not in req.email:
        raise HTTPException(400, "Valid email is required")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if len(req.password.encode("utf-8")) > 72:
        raise HTTPException(400, "Password must be 72 characters or fewer (bcrypt limit)")
    if db.query(models.User).filter(models.User.email == req.email.lower()).first():
        raise HTTPException(400, "Email already registered")

    user = models.User(
        name=req.name.strip(),
        email=req.email.lower().strip(),
        password_hash=hash_password(req.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "user": _user_out(user)}


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return {"access_token": create_access_token(user.id), "token_type": "bearer", "user": _user_out(user)}


@router.get("/me")
def me(current_user: models.User = Depends(get_current_user)):
    return _user_out(current_user)


@router.put("/me")
def update_me(
    req: UpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if req.name is not None:
        if not req.name.strip():
            raise HTTPException(400, "Name cannot be empty")
        current_user.name = req.name.strip()
    if req.email is not None:
        email = req.email.lower().strip()
        taken = db.query(models.User).filter(
            models.User.email == email,
            models.User.id != current_user.id
        ).first()
        if taken:
            raise HTTPException(400, "Email already in use")
        current_user.email = email
    if req.password:
        if len(req.password) < 6:
            raise HTTPException(400, "Password must be at least 6 characters")
        current_user.password_hash = hash_password(req.password)
    db.commit()
    db.refresh(current_user)
    return _user_out(current_user)
