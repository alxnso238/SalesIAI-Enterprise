from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.companies import router as companies_router
from app.api.routes.branches import router as branches_router
from app.api.routes.products import router as products_router
from app.api.routes.sales import router as sales_router
from app.api.routes.inventory import router as inventory_router
from app.api.routes.vectors import router as vectors_router
from app.api.routes.matrices import router as matrices_router
from app.api.routes.operations import router as operations_router
from app.api.routes.reports import router as reports_router
from app.api.routes.resources import router as resources_router
from app.api.routes.audit import router as audit_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(companies_router, prefix="/companies", tags=["companies"])
api_router.include_router(branches_router, prefix="/branches", tags=["branches"])
api_router.include_router(products_router, prefix="/products", tags=["products"])
api_router.include_router(sales_router, prefix="/sales", tags=["sales"])
api_router.include_router(inventory_router, prefix="/inventory", tags=["inventory"])
api_router.include_router(vectors_router, prefix="/vectors", tags=["vectors"])
api_router.include_router(matrices_router, prefix="/matrices", tags=["matrices"])
api_router.include_router(operations_router, prefix="/operations", tags=["operations"])
api_router.include_router(reports_router, prefix="/reports", tags=["reports"])
api_router.include_router(resources_router, prefix="/resources", tags=["resources"])
api_router.include_router(audit_router, prefix="/audit", tags=["audit"])
