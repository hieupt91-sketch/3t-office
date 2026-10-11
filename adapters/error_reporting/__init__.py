"""Offline-first technical error reporting for the 3T Office desktop app."""

from .reporter import ErrorReporter, load_client_config, sanitize_text

__all__ = ["ErrorReporter", "load_client_config", "sanitize_text"]
