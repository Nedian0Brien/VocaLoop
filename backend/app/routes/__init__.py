from .auth import router as auth_router
from .account import router as account_router
from .folders import router as folders_router
from .settings import router as settings_router
from .uploads import router as uploads_router
from .words import router as words_router

__all__ = [
    "account_router",
    "auth_router",
    "folders_router",
    "settings_router",
    "uploads_router",
    "words_router",
]
