"""
Simple TTL-based caching utility for Flask routes
Provides in-memory caching with time-to-live (TTL) support
"""

import time
import hashlib
import json
from functools import wraps
from typing import Any, Callable, Optional
import logging

logger = logging.getLogger(__name__)

# Simple in-memory cache store
_cache_store = {}


class CacheEntry:
    """Cache entry with TTL"""

    def __init__(self, value: Any, ttl: int):
        self.value = value
        self.expires_at = time.time() + ttl

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Generate a cache key from function arguments

    Args:
        prefix: Cache key prefix (usually function name)
        *args: Positional arguments
        **kwargs: Keyword arguments

    Returns:
        MD5 hash of serialized arguments
    """
    try:
        # Serialize arguments
        key_data = {
            'args': args,
            'kwargs': kwargs
        }
        serialized = json.dumps(key_data, sort_keys=True, default=str)
        hash_obj = hashlib.md5(serialized.encode())
        return f"{prefix}:{hash_obj.hexdigest()}"
    except Exception as e:
        logger.warning(f"Failed to generate cache key: {e}")
        # Fallback to timestamp-based key (effectively no caching)
        return f"{prefix}:{time.time()}"


def cache_with_ttl(ttl: int = 60, key_prefix: Optional[str] = None):
    """
    Decorator for caching function results with TTL

    Args:
        ttl: Time-to-live in seconds (default: 60)
        key_prefix: Custom cache key prefix (default: function name)

    Usage:
        @cache_with_ttl(ttl=300)  # 5 minutes
        def expensive_query():
            return execute_query("SELECT ...")

    """

    def decorator(func: Callable) -> Callable:
        cache_prefix = key_prefix or func.__name__

        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = generate_cache_key(cache_prefix, *args, **kwargs)

            # Check cache
            if cache_key in _cache_store:
                entry = _cache_store[cache_key]
                if not entry.is_expired():
                    logger.debug(f"Cache HIT: {cache_key}")
                    return entry.value
                else:
                    # Expired, remove it
                    logger.debug(f"Cache EXPIRED: {cache_key}")
                    del _cache_store[cache_key]

            # Cache miss - execute function
            logger.debug(f"Cache MISS: {cache_key}")
            result = func(*args, **kwargs)

            # Store in cache
            _cache_store[cache_key] = CacheEntry(result, ttl)

            return result

        # Add cache control methods
        wrapper.cache_clear = lambda: clear_cache_by_prefix(cache_prefix)
        wrapper.cache_info = lambda: get_cache_info(cache_prefix)

        return wrapper

    return decorator


def clear_cache():
    """Clear all cache entries"""
    global _cache_store
    count = len(_cache_store)
    _cache_store = {}
    logger.info(f"Cleared {count} cache entries")
    return count


def clear_cache_by_prefix(prefix: str):
    """Clear cache entries matching a prefix"""
    global _cache_store
    keys_to_delete = [k for k in _cache_store.keys() if k.startswith(prefix)]
    for key in keys_to_delete:
        del _cache_store[key]
    logger.info(f"Cleared {len(keys_to_delete)} cache entries with prefix '{prefix}'")
    return len(keys_to_delete)


def clear_expired_cache():
    """Remove all expired cache entries"""
    global _cache_store
    keys_to_delete = [k for k, v in _cache_store.items() if v.is_expired()]
    for key in keys_to_delete:
        del _cache_store[key]
    logger.debug(f"Cleared {len(keys_to_delete)} expired cache entries")
    return len(keys_to_delete)


def get_cache_info(prefix: Optional[str] = None) -> dict:
    """
    Get cache statistics

    Args:
        prefix: Optional prefix to filter stats

    Returns:
        Dict with cache stats
    """
    if prefix:
        entries = {k: v for k, v in _cache_store.items() if k.startswith(prefix)}
    else:
        entries = _cache_store

    expired = sum(1 for v in entries.values() if v.is_expired())
    active = len(entries) - expired

    return {
        'total_entries': len(entries),
        'active_entries': active,
        'expired_entries': expired,
        'prefix': prefix or 'all'
    }


def cache_route_with_user(ttl: int = 60):
    """
    Decorator for caching Flask route results with user-specific caching

    Usage:
        @app.route('/api/data')
        @token_required
        @cache_route_with_user(ttl=300)
        def get_data():
            ...
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get user from request context (set by @token_required)
            from flask import request

            user_id = None
            if hasattr(request, 'current_user'):
                user_id = request.current_user.get('user_id')

            # Generate cache key including user_id
            cache_key = generate_cache_key(
                func.__name__,
                user_id,
                request.args.to_dict(),
                *args,
                **kwargs
            )

            # Check cache
            if cache_key in _cache_store:
                entry = _cache_store[cache_key]
                if not entry.is_expired():
                    logger.debug(f"Route cache HIT: {func.__name__} (user: {user_id})")
                    return entry.value
                else:
                    del _cache_store[cache_key]

            # Cache miss - execute function
            logger.debug(f"Route cache MISS: {func.__name__} (user: {user_id})")
            result = func(*args, **kwargs)

            # Store in cache
            _cache_store[cache_key] = CacheEntry(result, ttl)

            return result

        return wrapper

    return decorator


# Scheduled cleanup task (call this periodically)
def cleanup_cache_task():
    """Background task to cleanup expired cache entries"""
    while True:
        time.sleep(60)  # Run every minute
        cleared = clear_expired_cache()
        if cleared > 0:
            logger.info(f"Cache cleanup: removed {cleared} expired entries")
