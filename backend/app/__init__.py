"""ForgeAI Studio backend application package.

Exposes the canonical service version for the platform.
"""

from app.config.constants import SERVICE_NAME, VERSION

__version__ = VERSION
__service__ = SERVICE_NAME

__all__ = ["__version__", "__service__"]
