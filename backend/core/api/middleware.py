import time
import uuid

import redis
from django.conf import settings
from django.http import JsonResponse

class SlidingWindowLogRateLimiterMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

        redis_url = getattr(settings, "REDIS_URL")
        self.redis = redis.from_url(redis_url)

        self.window = getattr(settings, "RATE_LIMIT_WINDOW")
        self.limit = getattr(settings, "RATE_LIMIT_LIMIT")

        self.rules = getattr(settings, "RATE_LIMITED_PATHS")

        self._check = self.redis.register_script("""
            local key = KEYS[1]
            local window = tonumber(ARGV[1])
            local limit = tonumber(ARGV[2])
            local now = tonumber(ARGV[3])
            local member = ARGV[4]

            redis.call("ZREMRANGEBYSCORE", key, 0, now - window)
            local current = redis.call("ZCARD", key)

            if current < limit then
                redis.call("ZADD", key, now, member)
                redis.call("EXPIRE", key, window)
                return 1
            end

            return 0
        """)

    def _should_rate_limit(self, request):
        if not self.rules:
            return True  # default: limit everything (backward compatible)

        path = request.path
        method = request.method.upper()

        for rule in self.rules:
            # Exact path match (use startswith if you want prefix matching)
            if path == rule["path"]:
                allowed_methods = rule.get("methods")
                if allowed_methods is None:
                    return True
                if method in [m.upper() for m in allowed_methods]:
                    return True

        return False

    def __call__(self, request):
        # skip rate limiting if this request doesn't match any rule
        if not self._should_rate_limit(request):
            return self.get_response(request)

        try:
            identifier = self.get_identifier(request)
            key = f"ratelimit:{identifier}"

            now = int(time.time())
            member = f"{now}:{uuid.uuid4()}"

            allowed = self._check(keys=[key], args=[self.window, self.limit, now, member])

            if not allowed:
                return JsonResponse(
                    {"error": "Too many requests. Please try again later."},
                    status=429,
                )

        except redis.ConnectionError:
            pass

        return self.get_response(request)

    def get_identifier(self, request):
        x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded:
            return x_forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")
