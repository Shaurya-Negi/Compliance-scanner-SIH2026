"""
FastAPI dependency injection for authentication
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import decode_access_token
from app.models import User

# HTTP Bearer token scheme
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token

    Raises:
        HTTPException: 401 if token is invalid or user not found

    Returns:
        User: The authenticated user object
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Dependency to get the current user if authenticated, or None for anonymous access

    Returns:
        Optional[User]: The authenticated user or None
    """
    if credentials is None:
        return None

    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        return None

    email: str = payload.get("sub")
    if email is None:
        return None

    user = db.query(User).filter(User.email == email).first()
    return user


def require_role(required_role: str):
    """
    Dependency factory to enforce role-based access control

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role("admin"))])

    Args:
        required_role: The role required ("consumer", "inspector", "admin")

    Returns:
        Dependency function that validates the user's role
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        # Role hierarchy: admin > inspector > consumer
        role_hierarchy = {"consumer": 0, "inspector": 1, "admin": 2}

        user_level = role_hierarchy.get(current_user.role, 0)
        required_level = role_hierarchy.get(required_role, 0)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )

        return current_user

    return role_checker
