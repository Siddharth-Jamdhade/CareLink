"""Compatibility entry point: uvicorn main:app. Existing app.main remains supported."""
from app.main import app

__all__ = ['app']
