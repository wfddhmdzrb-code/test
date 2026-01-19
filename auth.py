"""
Authentication Service
خدمة المصادقة
"""

import logging
import os
from typing import Dict, Optional, Tuple

from db import Database
from security import create_tokens, hash_password, verify_password, verify_token

logger = logging.getLogger(__name__)


def register_user(username: str, password: str,
                  email: str) -> Tuple[bool, str, Optional[Dict]]:
    """Register new user"""
    if not username or len(username) < 3:
        return False, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل", None

    if not email or '@' not in email:
        return False, "البريد الإلكتروني غير صحيح", None

    if not password or len(password) < 6:
        return False, "كلمة المرور يجب أن تكون 6 أحرف على الأقل", None

    if Database.user_exists(username):
        return False, "اسم المستخدم موجود بالفعل", None

    hashed_password = hash_password(password)
    user = Database.create_user(username, hashed_password, email, 'viewer')

    if not user:
        return False, "فشل إنشاء المستخدم", None

    return True, "تم التسجيل بنجاح", {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "role": user["role"]
    }


def login_user(username: str,
               password: str) -> Tuple[bool,
                                       str,
                                       Optional[Dict]]:
    """Login user and return tokens"""
    user = Database.get_user(username)
    # DEV MODE: bypass strict login for local single-file runs
    dev_mode = os.getenv('DEV_MODE', 'false').lower() == 'true'

    if dev_mode:
        # ensure admin exists
        if not user:
            Database.create_admin_if_not_exists()
            user = Database.get_user('admin')

        tokens = create_tokens(
            user['id'], user['username'], user.get(
                'role', 'admin'))
        logger.info(f"DEV MODE login granted for: {username}")
        return True, "تم تسجيل الدخول مؤقتاً (DEV MODE)", {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user.get("email"),
                "role": user.get("role", "admin")
            }
        }

    if not user:
        logger.warning(f"Login failed: user not found - {username}")
        return False, "بيانات دخول غير صحيحة", None

    if not user["is_active"]:
        logger.warning(f"Login failed: user inactive - {username}")
        return False, "المستخدم غير مفعل", None

    if not verify_password(password, user["password"]):
        logger.warning(f"Login failed: invalid password - {username}")
        return False, "بيانات دخول غير صحيحة", None

    tokens = create_tokens(user["id"], user["username"], user["role"])

    logger.info(f"User logged in: {username}")

    return True, "تم تسجيل الدخول بنجاح", {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"]
        }
    }


def get_user_from_token(token: str) -> Optional[Dict]:
    """Verify token and get user"""
    payload = verify_token(token, token_type="access")
    if not payload:
        return None

    user_id = int(payload.get("sub"))
    user = Database.get_user_by_id(user_id)

    if not user or not user["is_active"]:
        return None

    return user


def refresh_access_token(
        refresh_token: str) -> Tuple[bool, str, Optional[Dict]]:
    """Refresh access token"""
    payload = verify_token(refresh_token, token_type="refresh")
    if not payload:
        return False, "Refresh token غير صحيح", None

    user_id = int(payload.get("sub"))
    user = Database.get_user_by_id(user_id)

    if not user or not user["is_active"]:
        return False, "المستخدم غير موجود", None

    tokens = create_tokens(user["id"], user["username"], user["role"])

    return True, "تم تحديث التوكن", {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer"
    }
