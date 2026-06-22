from pydantic import BaseModel, ConfigDict, field_validator

from .common import validate_email as validate_email_value
from .common import validate_password as validate_password_value


class SignupRequest(BaseModel):
    email: str
    password: str
    display_name: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return validate_email_value(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_value(value)


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return validate_email_value(value)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if value == "":
            raise ValueError("must not be empty")
        return value


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    display_name: str | None = None
    photo_url: str | None = None


class AuthResponse(BaseModel):
    user: UserRead


class AccountDeleteRequest(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not value:
            raise ValueError("must not be empty")
        return value
