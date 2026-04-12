from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any
from datetime import datetime
from models import UserRole, SellerTier, SellerStatus, OrderStatus, PayoutStatus


# ─────────────────────────────────────────────
# AUTH / USER SCHEMAS
# ─────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.buyer
    country: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    avatar_url: Optional[str]
    country: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─────────────────────────────────────────────
# STORE / SELLER SCHEMAS
# ─────────────────────────────────────────────

class StoreCreate(BaseModel):
    name: str
    description: Optional[str] = None
    country: str
    city: Optional[str] = None
    business_type: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    business_type: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    vendor_type: Optional[str] = None
    delivery_type: Optional[str] = None
    delivery_radius_miles: Optional[int] = None
    delivery_note: Optional[str] = None
    is_open_now: Optional[bool] = None
    prep_time_minutes: Optional[int] = None
    opening_hours: Optional[str] = None
    weekly_hours: Optional[Any] = None
    timezone: Optional[str] = None


class StoreOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    logo_url: Optional[str]
    banner_url: Optional[str]
    country: str
    city: Optional[str]
    business_type: Optional[str]
    status: SellerStatus
    tier: SellerTier
    is_featured: bool
    total_sales: int
    avg_rating: float
    review_count: int
    stripe_onboarding_complete: bool
    owner_id: Optional[int] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    total_revenue: Optional[float] = None
    vendor_type: Optional[str] = None
    delivery_type: Optional[str] = None
    delivery_radius_miles: Optional[int] = None
    delivery_note: Optional[str] = None
    created_at: datetime
    is_open_now: Optional[bool] = None
    prep_time_minutes: Optional[int] = None
    opening_hours: Optional[str] = None
    weekly_hours: Optional[str] = None
    timezone: Optional[str] = None

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# PRODUCT SCHEMAS
# ─────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    compare_price: Optional[float] = None
    currency: str = "USD"
    stock: int = 0
    sku: Optional[str] = None
    category_id: Optional[int] = None
    country_of_origin: Optional[str] = None
    tags: List[str] = []
    weight_kg: Optional[float] = None
    ships_from: Optional[str] = None

    @field_validator("price")
    @classmethod
    def price_positive(cls, v):
        if v <= 0:
            raise ValueError("Price must be greater than 0")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    compare_price: Optional[float] = None
    stock: Optional[int] = None
    category_id: Optional[int] = None
    country_of_origin: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    icon: Optional[str]

    model_config = {"from_attributes": True}


class StoreMinimal(BaseModel):
    id: int
    name: str
    slug: str
    vendor_type: Optional[str] = None
    delivery_type: Optional[str] = None
    delivery_radius_miles: Optional[int] = None
    delivery_note: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None

    model_config = {"from_attributes": True}


class ProductOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    price: float
    compare_price: Optional[float]
    currency: str
    stock: int
    images: List[str]
    country_of_origin: Optional[str]
    tags: List[str]
    is_active: bool
    is_featured: bool
    view_count: int
    sale_count: int
    avg_rating: float
    review_count: int
    store: Optional[StoreOut] = None
    category: Optional[CategoryOut] = None
    vendor_type: Optional[str] = None
    delivery_type: Optional[str] = None
    delivery_radius_miles: Optional[int] = None
    delivery_note: Optional[str] = None
    is_open_now: Optional[bool] = None
    prep_time_minutes: Optional[int] = None
    opening_hours: Optional[str] = None
    weekly_hours: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductListOut(BaseModel):
    """Lighter version for listing pages (no store details)"""
    id: int
    name: str
    slug: str
    price: float
    compare_price: Optional[float]
    currency: str
    images: List[str]
    country_of_origin: Optional[str]
    avg_rating: float
    review_count: int
    stock: int
    is_featured: bool
    tags: List[str] = []
    store_id: int
    store: Optional[StoreMinimal] = None
    created_at: datetime

    model_config = {"from_attributes": True}

# ─────────────────────────────────────────────
# CART SCHEMAS
# ─────────────────────────────────────────────

class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v):
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class CartItemOut(BaseModel):
    id: int
    quantity: int
    product: ProductListOut

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# ORDER SCHEMAS
# ─────────────────────────────────────────────

class ShippingAddress(BaseModel):
    name: str
    address: str
    city: str
    state: str
    country: str
    zip: str


class OrderCreate(BaseModel):
    store_id: int
    items: List[CartItemCreate]
    shipping: ShippingAddress
    delivery_method: Optional[str] = None
    delivery_fee: Optional[float] = None
    uber_quote_id: Optional[str] = None


class OrderItemOut(BaseModel):
    id: int
    quantity: int
    unit_price: float
    total_price: float
    product: ProductListOut

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    subtotal: float
    shipping_cost: float
    platform_fee: float
    seller_amount: float
    total: float
    currency: str
    status: OrderStatus
    shipping_name: Optional[str]
    shipping_address: Optional[str]
    shipping_city: Optional[str]
    shipping_country: Optional[str]
    tracking_number: Optional[str]
    tracking_url: Optional[str]
    stripe_payment_intent_id: Optional[str]
    delivery_method: Optional[str] = None
    delivery_fee: Optional[float] = None
    items: List[OrderItemOut]
    store: Optional[StoreOut] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None


# ─────────────────────────────────────────────
# REVIEW SCHEMAS
# ─────────────────────────────────────────────

class ReviewCreate(BaseModel):
    product_id: int
    rating: int
    title: Optional[str] = None
    body: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v):
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewOut(BaseModel):
    id: int
    rating: int
    title: Optional[str]
    body: Optional[str]
    is_verified_purchase: bool
    photos: Optional[List[str]] = []
    helpful_count: Optional[int] = 0
    user: UserOut
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# PAYMENT SCHEMAS
# ─────────────────────────────────────────────

class CheckoutSession(BaseModel):
    order_id: int


class CheckoutResponse(BaseModel):
    client_secret: str
    payment_intent_id: str


class PayoutOut(BaseModel):
    id: int
    amount: float
    currency: str
    status: PayoutStatus
    stripe_transfer_id: Optional[str]
    paid_at: Optional[datetime]
    vendor_type: Optional[str] = None
    delivery_type: Optional[str] = None
    delivery_radius_miles: Optional[int] = None
    delivery_note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# PAGINATION
# ─────────────────────────────────────────────

class PaginatedProducts(BaseModel):
    items: List[ProductListOut]
    total: int
    page: int
    pages: int
    size: int


class PaginatedOrders(BaseModel):
    items: List[OrderOut]
    total: int
    page: int
    pages: int
    size: int


# ─────────────────────────────────────────────
# ADMIN SCHEMAS
# ─────────────────────────────────────────────

class SellerApproval(BaseModel):
    status: SellerStatus
    reason: Optional[str] = None


class PlatformStats(BaseModel):
    total_users: int
    total_sellers: int
    total_products: int
    total_orders: int
    total_revenue: float
    pending_sellers: int


# ─────────────────────────────────────────────
# WISHLIST
# ─────────────────────────────────────────────

class WishlistItemOut(BaseModel):
    id: int
    product: "ProductListOut"
    created_at: datetime
    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# DISCOUNT CODES
# ─────────────────────────────────────────────

class DiscountCodeCreate(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: str = "percent"
    discount_value: float
    min_order_amount: float = 0.0
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None

class DiscountCodeOut(BaseModel):
    id: int
    code: str
    description: Optional[str]
    discount_type: str
    discount_value: float
    min_order_amount: float
    max_uses: Optional[int]
    uses_count: int
    is_active: bool
    expires_at: Optional[datetime]
    created_at: datetime
    model_config = {"from_attributes": True}

class ApplyDiscountRequest(BaseModel):
    code: str
    subtotal: float


# ─────────────────────────────────────────────
# PRODUCT VARIANTS
# ─────────────────────────────────────────────

class VariantCreate(BaseModel):
    name: str
    value: str
    price_modifier: float = 0.0
    stock: int = 0
    sku: Optional[str] = None

class VariantOut(BaseModel):
    id: int
    name: str
    value: str
    price_modifier: float
    stock: int
    sku: Optional[str]
    is_active: bool
    model_config = {"from_attributes": True}
