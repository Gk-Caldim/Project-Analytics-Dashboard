import contextvars

# Global context variable to store the current request's org_id
org_id_context = contextvars.ContextVar("org_id", default=None)
