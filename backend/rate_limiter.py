"""
Thread-safe in-memory sliding-window rate limiter for protecting endpoints
against abuse, credential stuffing, and session crashes.
"""
import time
import os
import threading
from typing import Tuple, Dict, List
from functools import wraps
from flask import request, session, jsonify


class SlidingWindowRateLimiter:
    def __init__(self):
        self._lock = threading.Lock()
        self._storage: Dict[str, List[float]] = {}
        self._last_cleanup = time.time()

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> Tuple[bool, int]:
        """
        Determines if a request for the given key is allowed within the time window.
        Returns (is_allowed, retry_after_seconds).
        """
        now = time.time()
        with self._lock:
            # Periodic cleanup of expired entries every 300 seconds or when storage grows large
            if now - self._last_cleanup > 300 or len(self._storage) > 2000:
                self._cleanup_expired(now)

            timestamps = self._storage.get(key, [])
            cutoff = now - window_seconds
            # Keep only timestamps within the current sliding window
            valid_timestamps = [t for t in timestamps if t > cutoff]

            if len(valid_timestamps) >= max_requests:
                oldest = valid_timestamps[0]
                retry_after = max(1, int(oldest + window_seconds - now) + 1)
                self._storage[key] = valid_timestamps
                return False, retry_after

            valid_timestamps.append(now)
            self._storage[key] = valid_timestamps
            return True, 0

    def _cleanup_expired(self, now: float):
        """Remove keys that have no timestamps in the last 15 minutes."""
        max_age_cutoff = now - 900
        keys_to_delete = []
        for key, timestamps in self._storage.items():
            active = [t for t in timestamps if t > max_age_cutoff]
            if not active:
                keys_to_delete.append(key)
            else:
                self._storage[key] = active
        for key in keys_to_delete:
            del self._storage[key]
        self._last_cleanup = now

    def reset(self):
        """Clears all rate limit records (useful for test isolation)."""
        with self._lock:
            self._storage.clear()
            self._last_cleanup = time.time()


# Global limiter instance
limiter = SlidingWindowRateLimiter()


def get_client_ip() -> str:
    """Extract real client IP even behind reverse proxies like Vercel or Render."""
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip.strip()
    return request.remote_addr or '127.0.0.1'


def get_client_identity(include_session: bool = True) -> str:
    """
    Builds a unique composite key combining IP and session ID or user ID.
    Prevents single-session spam and IP-based brute force.
    """
    ip = get_client_ip()
    if include_session:
        sid = session.get('sid', 'anon')
        uid = session.get('user_id', '')
        return f"{ip}:{sid}:{uid}"
    return ip


def rate_limit(max_requests: int = 5, window_seconds: int = 60, key_prefix: str = "default", message: str = None):
    """
    Flask route decorator for sliding-window rate limiting.
    Returns HTTP 429 (Too Many Requests) when limits are exceeded.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Allow disabling in test environments unless explicitly enabled
            if os.environ.get('DISABLE_RATE_LIMITS', 'false').lower() == 'true':
                return fn(*args, **kwargs)

            try:
                from flask import current_app
                if current_app and current_app.config.get('TESTING') and not current_app.config.get('RATELIMIT_ENABLED'):
                    return fn(*args, **kwargs)
            except Exception:
                pass

            # Dynamically check environment override if set (e.g. LOGIN_RATE_LIMIT)
            env_limit_key = f"{key_prefix.upper()}_RATE_LIMIT"
            actual_max = int(os.environ.get(env_limit_key, max_requests))
            env_window_key = f"{key_prefix.upper()}_RATE_WINDOW"
            actual_window = int(os.environ.get(env_window_key, window_seconds))

            # For login, track by IP so rotating or clearing session cookies cannot bypass rate limiting
            if key_prefix == 'login':
                identity = get_client_ip()
            else:
                identity = get_client_identity()

            client_key = f"{key_prefix}:{identity}"
            allowed, retry_after = limiter.is_allowed(client_key, actual_max, actual_window)

            if not allowed:
                default_msg = f"Too many requests. Please wait {retry_after} seconds before trying again."
                resp = jsonify({
                    "status": "rate_limited",
                    "message": message or default_msg,
                    "retry_after": retry_after
                })
                resp.status_code = 429
                resp.headers['Retry-After'] = str(retry_after)
                return resp

            return fn(*args, **kwargs)
        return wrapper
    return decorator
