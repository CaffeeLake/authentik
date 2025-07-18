"""event utilities"""

import re
from copy import copy
from dataclasses import asdict, is_dataclass
from datetime import date, datetime, time, timedelta
from enum import Enum
from pathlib import Path
from types import GeneratorType, NoneType
from typing import Any
from uuid import UUID

from django.contrib.auth.models import AnonymousUser
from django.core.handlers.wsgi import WSGIRequest
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from django.db.models.base import Model
from django.http.request import HttpRequest
from django.utils import timezone
from django.views.debug import SafeExceptionReporterFilter
from geoip2.models import ASN, City
from guardian.conf import settings
from guardian.utils import get_anonymous_user

from authentik.blueprints.v1.common import YAMLTag
from authentik.core.models import User
from authentik.events.context_processors.asn import ASN_CONTEXT_PROCESSOR
from authentik.events.context_processors.geoip import GEOIP_CONTEXT_PROCESSOR
from authentik.policies.types import PolicyRequest

# Special keys which are *not* cleaned, even when the default filter
# is matched
ALLOWED_SPECIAL_KEYS = re.compile("passing|password_change_date", flags=re.I)


def cleanse_item(key: str, value: Any) -> Any:
    """Cleanse a single item"""
    if isinstance(value, dict):
        return cleanse_dict(value)
    if isinstance(value, list | tuple | set):
        for idx, item in enumerate(value):
            value[idx] = cleanse_item(key, item)
        return value
    try:
        if not SafeExceptionReporterFilter.hidden_settings.search(key):
            return value
        if ALLOWED_SPECIAL_KEYS.search(key):
            return value
        return SafeExceptionReporterFilter.cleansed_substitute
    except TypeError:  # pragma: no cover
        return value


def cleanse_dict(source: dict[Any, Any]) -> dict[Any, Any]:
    """Cleanse a dictionary, recursively"""
    final_dict = {}
    for key, value in source.items():
        new_value = cleanse_item(key, value)
        if new_value is not ...:
            final_dict[key] = new_value
    return final_dict


def model_to_dict(model: Model) -> dict[str, Any]:
    """Convert model to dict"""
    name = str(model)
    if hasattr(model, "name"):
        name = model.name
    return {
        "app": model._meta.app_label,
        "model_name": model._meta.model_name,
        "pk": model.pk,
        "name": name,
    }


def get_user(user: User | AnonymousUser) -> dict[str, Any]:
    """Convert user object to dictionary"""
    if isinstance(user, AnonymousUser):
        try:
            user = get_anonymous_user()
        except User.DoesNotExist:
            return {}
    user_data = {
        "username": user.username,
        "pk": user.pk,
        "email": user.email,
    }
    if user.username == settings.ANONYMOUS_USER_NAME:
        user_data["is_anonymous"] = True
    return user_data


def sanitize_item(value: Any) -> Any:  # noqa: PLR0911, PLR0912
    """Sanitize a single item, ensure it is JSON parsable"""
    if is_dataclass(value):
        # Because asdict calls `copy.deepcopy(obj)` on everything that's not tuple/dict,
        # and deepcopy doesn't work with HttpRequest (neither django nor rest_framework).
        # (more specifically doesn't work with ResolverMatch)
        # rest_framework's custom Request class makes this more complicated as it also holds a
        # thread lock.
        # Since this class is mainly used for Events which already hold the http request context
        # we just remove the http_request from the shallow policy request
        # Currently, the only dataclass that actually holds an http request is a PolicyRequest
        if isinstance(value, PolicyRequest) and value.http_request is not None:
            value: PolicyRequest = copy(value)
            value.http_request = None
        value = asdict(value)
    if isinstance(value, dict):
        return sanitize_dict(value)
    if isinstance(value, GeneratorType):
        return sanitize_item(list(value))
    if isinstance(value, list | tuple | set):
        new_values = []
        for item in value:
            new_value = sanitize_item(item)
            if new_value:
                new_values.append(new_value)
        return new_values
    if isinstance(value, User | AnonymousUser):
        return sanitize_dict(get_user(value))
    if isinstance(value, models.Model):
        return sanitize_dict(model_to_dict(value))
    if isinstance(value, UUID):
        return value.hex
    if isinstance(value, HttpRequest | WSGIRequest):
        return ...
    if isinstance(value, City):
        return GEOIP_CONTEXT_PROCESSOR.city_to_dict(value)
    if isinstance(value, ASN):
        return ASN_CONTEXT_PROCESSOR.asn_to_dict(value)
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, Exception):
        return str(value)
    if isinstance(value, YAMLTag):
        return str(value)
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, type):
        return {
            "type": value.__name__,
            "module": value.__module__,
        }
    # See
    # https://github.com/encode/django-rest-framework/blob/master/rest_framework/utils/encoders.py
    # For Date Time string spec, see ECMA 262
    # https://ecma-international.org/ecma-262/5.1/#sec-15.9.1.15
    if isinstance(value, datetime):
        representation = value.isoformat()
        if representation.endswith("+00:00"):
            representation = representation[:-6] + "Z"
        return representation
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, time):
        if timezone and timezone.is_aware(value):
            raise ValueError("JSON can't represent timezone-aware times.")
        return value.isoformat()
    if isinstance(value, timedelta):
        return str(value.total_seconds())
    if callable(value):
        return {
            "type": "callable",
            "name": value.__name__,
            "module": value.__module__,
        }
    # List taken from the stdlib's JSON encoder (_make_iterencode, encoder.py:415)
    if isinstance(value, bool | int | float | NoneType | list | tuple | dict):
        return value
    try:
        return DjangoJSONEncoder().default(value)
    except TypeError:
        return str(value)
    return str(value)


def sanitize_dict(source: dict[Any, Any]) -> dict[Any, Any]:
    """clean source of all Models that would interfere with the JSONField.
    Models are replaced with a dictionary of {
        app: str,
        name: str,
        pk: Any
    }"""
    final_dict = {}
    for key, value in source.items():
        new_value = sanitize_item(value)
        if new_value is not ...:
            final_dict[key] = new_value
    return final_dict
