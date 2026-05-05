"""
Auth utilities — bcrypt + JWT.

Uses bcrypt directly (not passlib) to avoid version compatibility issues
between passlib and modern bcrypt 4.x on Python 3.13.
"""
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# bcrypt has a 72-byte hard limit on input length
BCRYPT_MAX_BYTES = 72


def _truncate_password(password: str) -> bytes:
    """
    Encode password to UTF-8 bytes and truncate to bcrypt's 72-byte limit.
    Bcrypt has always silently ignored bytes past 72 anyway — we just make
    the truncation explicit so newer bcrypt versions don't raise.
    """
    pw_bytes = password.encode("utf-8")
    if len(pw_bytes) > BCRYPT_MAX_BYTES:
        # Truncate at byte boundary (safe — just drops trailing bytes)
        pw_bytes = pw_bytes[:BCRYPT_MAX_BYTES]
    return pw_bytes


def hash_password(password: str) -> str:
    """Hash a password using bcrypt. Returns string for DB storage."""
    pw_bytes = _truncate_password(password)
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(pw_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        pw_bytes = _truncate_password(plain)
        hashed_bytes = hashed.encode("utf-8") if isinstance(hashed, str) else hashed
        return bcrypt.checkpw(pw_bytes, hashed_bytes)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise exc
    except JWTError:
        raise exc

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not user:
        raise exc
    return user
