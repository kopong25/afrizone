vfrom sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, Enum, JSON, BigInteger
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


# ─────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────

class UserRole(str, enum.Enum):
    buyer = "buyer"
    seller = "seller"
    admin = "admin"


class SellerTier(str, enum.Enum):
    basic = "basic"        # $29/mo
    standard = "standard"  # $79/mo
    premium = "premium"    # $149/mo


class SellerStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    suspended = "suspended"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    refunded = "refunded"


class PayoutStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"


# ─────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    role = Column(Enum(UserRole, native_enum=False), default=UserRole.buyer, nullable=False)
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String, nullable=True)
    country = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    store = relationship("Store", back_populates="owner", uselist=False)
    orders = relationship("Order", back_populates="buyer")
    reviews = relationship("Review", back_populates="user")
    cart_items = relationship("CartItem", back_populates="user")


# ─────────────────────────────────────────────
# STORE (Seller's shop)
# ─────────────────────────────────────────────

class VendorType(str, enum.Enum):
    grocery    = "grocery"
    restaurant = "restaurant"
    fashion    = "fashion"
    beauty     = "beauty"
    other      = "other"


class DeliveryType(str, enum.Enum):
    shipping       = "shipping"
    local_delivery = "local_delivery"
    pickup         = "pickup"
    both           = "both"


class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    logo_url = Column(String, nullable=True)
    banner_url = Column(String, nullable=True)

    # Location
    country = Column(String, nullable=False)
    city = Column(String, nullable=True)
    address = Column(String, nullable=True)

    # Business info
    business_type = Column(String, nullable=True)
    vendor_type   = Column(Enum(VendorType, native_enum=False), default=VendorType.other)
    delivery_type = Column(Enum(DeliveryType, native_enum=False), default=DeliveryType.shipping)

    # Local delivery settings
    latitude  = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    delivery_radius_miles = Column(Integer, nullable=True)
    delivery_note  = Column(String, nullable=True)
    delivery_fee          = Column(Float, nullable=True)
    min_order_amount      = Column(Float, nullable=True)
    prep_time_minutes     = Column(Integer, nullable=True)
    is_open_now           = Column(Boolean, default=True)
    opening_hours         = Column(String, nullable=True)
    weekly_hours          = Column(Text, nullable=True)
    timezone              = Column(String, nullable=True, default="America/Chicago")
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)

    # Afrizone platform
    status = Column(Enum(SellerStatus, native_enum=False), default=SellerStatus.pending)
    tier = Column(Enum(SellerTier, native_enum=False), default=SellerTier.basic)
    subscription_end_date = Column(DateTime(timezone=True), nullable=True)
    is_featured = Column(Boolean, default=False)

    # Stripe Connect
    stripe_account_id = Column(String, nullable=True)
    stripe_onboarding_complete = Column(Boolean, default=False)

    # Stats
    total_sales = Column(Integer, default=0)
    total_revenue = Column(Float, default=0.0)
    avg_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="store")
    products = relationship("Product", back_populates="store")
    orders = relationship("Order", back_populates="store")
    payouts = relationship("Payout", back_populates="store")


# ─────────────────────────────────────────────
# CATEGORY
# ─────────────────────────────────────────────

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    icon = Column(String, nullable=True)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    products = relationship("Product", back_populates="category")


# ─────────────────────────────────────────────
# PRODUCT
# ─────────────────────────────────────────────

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    compare_price = Column(Float, nullable=True)
    currency = Column(String, default="USD")

    # Inventory
    stock = Column(Integer, default=0)
    sku = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    # Images
    images = Column(JSON, default=list)

    # Origin info
    country_of_origin = Column(String, nullable=True)
    tags = Column(JSON, default=list)

    # Shipping
    weight_kg = Column(Float, nullable=True)
    ships_from = Column(String, nullable=True)

    # Jersey customization fee
    customization_fee = Column(Float, default=0.0, nullable=True)

    # Stats
    view_count = Column(Integer, default=0)
    sale_count = Column(Integer, default=0)
    avg_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    store = relationship("Store", back_populates="products")
    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
    reviews = relationship("Review", back_populates="product")
    cart_items = relationship("CartItem", back_populates="product")


# ─────────────────────────────────────────────
# CART
# ─────────────────────────────────────────────

class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")


# ─────────────────────────────────────────────
# ORDER
# ─────────────────────────────────────────────

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)

    # Amounts
    subtotal = Column(Float, nullable=False)
    shipping_cost = Column(Float, default=0.0)
    platform_fee = Column(Float, nullable=False)
    seller_amount = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    currency = Column(String, default="USD")

    # Status
    status = Column(Enum(OrderStatus, native_enum=False), default=OrderStatus.pending)

    # Shipping address
    shipping_name = Column(String, nullable=True)
    shipping_address = Column(String, nullable=True)
    shipping_city = Column(String, nullable=True)
    shipping_state = Column(String, nullable=True)
    shipping_country = Column(String, nullable=True)
    shipping_zip = Column(String, nullable=True)

    # Stripe
    stripe_payment_intent_id = Column(String, nullable=True)
    stripe_charge_id = Column(String, nullable=True)

    # Tracking
    tracking_number = Column(String, nullable=True)
    uber_quote_id   = Column(String, nullable=True)
    tracking_url    = Column(String, nullable=True)
    notes           = Column(Text, nullable=True)

    # Delivery
    delivery_method = Column(String, nullable=True)
    delivery_fee    = Column(Float,  nullable=True)

    # ── FIX: store the Shippo rate object_id chosen at checkout ──────────
    # This is the rate_id returned by /delivery/delivery-options.
    # Passing it to Shippo when creating a label guarantees the label cost
    # matches the quoted price exactly — no recalculation, no surprise charges.
    shippo_rate_id  = Column(String, nullable=True)
    # ─────────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    buyer = relationship("User", back_populates="orders")
    store = relationship("Store", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")
    payout = relationship("Payout", back_populates="order", uselist=False)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


# ─────────────────────────────────────────────
# REVIEW
# ─────────────────────────────────────────────

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    title = Column(String, nullable=True)
    body = Column(Text, nullable=True)
    is_verified_purchase = Column(Boolean, default=False)
    photos = Column(JSON, default=list)
    helpful_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="reviews")
    product = relationship("Product", back_populates="reviews")


# ─────────────────────────────────────────────
# PAYOUT (Seller earnings)
# ─────────────────────────────────────────────

class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    status = Column(Enum(PayoutStatus, native_enum=False), default=PayoutStatus.pending)
    stripe_transfer_id = Column(String, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", back_populates="payouts")
    order = relationship("Order", back_populates="payout")


# ─────────────────────────────────────────────
# WISHLIST
# ─────────────────────────────────────────────

class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="wishlist_items")
    product = relationship("Product", backref="wishlisted_by")


# ─────────────────────────────────────────────
# DISCOUNT CODES
# ─────────────────────────────────────────────

class DiscountCode(Base):
    __tablename__ = "discount_codes"

    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    code = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)
    discount_type = Column(String, default="percent")
    discount_value = Column(Float, nullable=False)
    min_order_amount = Column(Float, default=0.0)
    max_uses = Column(Integer, nullable=True)
    uses_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    store = relationship("Store", backref="discount_codes")


# ─────────────────────────────────────────────
# PRODUCT VARIANTS
# ─────────────────────────────────────────────

class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    name = Column(String, nullable=False)
    value = Column(String, nullable=False)
    price_modifier = Column(Float, default=0.0)
    stock = Column(Integer, default=0)
    sku = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    product = relationship("Product", backref="variants")


# ─────────────────────────────────────────────
# MESSAGES (Buyer/Seller Chat)
# ─────────────────────────────────────────────

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    last_message_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    buyer = relationship("User", foreign_keys=[buyer_id], backref="buyer_conversations")
    seller = relationship("User", foreign_keys=[seller_id], backref="seller_conversations")
    store = relationship("Store", backref="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], backref="sent_messages")


# ─────────────────────────────────────────────
# SUBSCRIPTION TIERS
# ─────────────────────────────────────────────

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    tier = Column(String, default="basic")
    stripe_subscription_id = Column(String, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    status = Column(String, default="active")
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    store = relationship("Store", backref="subscription", uselist=False)


# ─────────────────────────────────────────────
# SHIPPING LABELS
# ─────────────────────────────────────────────

class ShippingLabel(Base):
    __tablename__ = "shipping_labels"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    shippo_transaction_id = Column(String, nullable=True)
    tracking_number = Column(String, nullable=True)
    uber_quote_id   = Column(String, nullable=True)
    delivery_method = Column(String, nullable=True)
    delivery_fee    = Column(Float,  nullable=True)
    label_url = Column(String, nullable=True)
    carrier = Column(String, default="USPS")
    service = Column(String, default="Priority")
    rate = Column(Float, nullable=True)
    status = Column(String, default="created")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    order = relationship("Order", backref="shipping_label", uselist=False)


# ─────────────────────────────────────────────
# REFERRALS
# ─────────────────────────────────────────────

class Referral(Base):
    __tablename__ = "referrals"
    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    referred_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    code = Column(String, unique=True, nullable=False, index=True)
    type = Column(String, default="seller")
    status = Column(String, default="pending")
    reward_amount = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    referrer = relationship("User", foreign_keys=[referrer_id], backref="referrals_made")
    referred = relationship("User", foreign_keys=[referred_id], backref="referred_by")


# ─────────────────────────────────────────────
# PASSWORD RESET TOKENS
# ─────────────────────────────────────────────

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    token      = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used       = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user       = relationship("User", backref="reset_tokens")


# ─────────────────────────────────────────────
# ADS
# ─────────────────────────────────────────────

class Ad(Base):
    __tablename__ = "ads"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    subtitle = Column(String(200), nullable=True)
    cta_text = Column(String(50), default="Shop Now")
    cta_url = Column(String(300), default="/")
    image_url = Column(String(500), nullable=True)
    emoji = Column(String(10), default="⚡")
    bg_color = Column(String(20), default="#006B3F")
    accent_color = Column(String(20), default="#FCD116")
    is_featured = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())