"""
Security & JWT Management
الأمان والتحقق من الهوية
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Optional

import bcrypt
from jose import JWTError, jwt

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "change-this-in-production-secure-random-key-1234567890")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode('utf-8'),
        bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8'))


def create_access_token(
        data: dict,
        expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[Dict]:
    try:
        from token_manager import TokenManager

        if TokenManager.is_token_blacklisted(token):
            logger.warning(f"Blacklisted token attempted to be used")
            return None

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload
    except JWTError as e:
        logger.error(f"Token verification failed: {e}")
        return None
    except ImportError:
        logger.warning("TokenManager not available, skipping blacklist check")
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if payload.get("type") != token_type:
                return None
            return payload
        except JWTError as e:
            logger.error(f"Token verification failed: {e}")
            return None


def create_tokens(user_id: int, username: str, role: str) -> Dict[str, str]:
    access_token = create_access_token({
        "sub": str(user_id),
        "username": username,
        "role": role
    })
    refresh_token = create_refresh_token({
        "sub": str(user_id),
        "username": username
    })
    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }
