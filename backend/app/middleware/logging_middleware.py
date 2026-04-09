import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("app.middleware.logging")

class ForbiddenLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        if response.status_code == 403:
            # For 403 Forbidden, we want to log the details for debugging
            # Note: We can't easily read the response body here without complex buffering, 
            # but we can log the request path and user if available.
            user_agent = request.headers.get("user-agent", "unknown")
            logger.warning(
                f"403 Forbidden: Path={request.url.path} Method={request.method} "
                f"IP={request.client.host} UA={user_agent}"
            )
            
        return response
