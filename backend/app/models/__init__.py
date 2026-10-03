from app.models.crm import Customer, Employee, Payment, Permission, RolePermission
from app.models.security import Role, User
from app.models.company import Company, Branch
from app.models.product import Category, Product
from app.models.sales import Sale, SaleDetail
from app.models.inventory import Inventory, InventoryMovement
from app.models.targets import Target
from app.models.audit import AuditLog
from app.models.api_record import ApiRecord
from app.models.analytics import (
    Dataset,
    DatasetVariable,
    Observation,
    StatisticalAnalysis,
    StatisticalResult,
    BayesAnalysis,
    RandomVariable,
    Insight,
    Report,
)