from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from jose import jwt, JWTError
from app.core.config import JWT_SECRET, JWT_ALGORITHM, IS_CLOUD_DB
from app.middleware.org_context import org_id_context

class OrgInjectionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Bypass removed: extract org_id for all DBs

        # Clear context var for each request
        org_id_context.set(None)
        
        # Extract token from Authorization header or cookies
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                org_id = payload.get("org_id")
                if org_id is not None:
                    org_id_context.set(org_id)
            except JWTError:
                pass # Invalid token, let standard auth handle it
        
        response = await call_next(request)
        return response
