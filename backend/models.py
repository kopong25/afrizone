from sqlalchemy import (
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
    grocery    = "grocery"      # Shelf-stable: fufu, garri, spices → USPS/Shippo
    restaurant = "restaurant"   # Hot food: jollof rice, suya → local delivery
    fashion    = "fashion"      # Clothing, fabric → USPS/Shippo
    beauty     = "beauty"       # Hair, cosmetics → USPS/Shippo
    other      = "other"


class DeliveryType(str, enum.Enum):
    shipping       = "shipping"        # Ships nationwide via USPS/Shippo
    local_delivery = "local_delivery"  # Seller delivers locally (prep for Uber Direct)
    pickup         = "pickup"          # Customer picks up in person
    both           = "both"            # Ships + local delivery available


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
    country = Column(String, nullable=False)          # USA, Canada, UK, etc.
    city = Column(String, nullable=True)
    address = Column(String, nullable=True)

    # Business info
    business_type = Column(String, nullable=True)     # Grocery, Fashion, etc.
    vendor_type   = Column(Enum(VendorType, native_enum=False), default=VendorType.other)
    delivery_type = Column(Enum(DeliveryType, native_enum=False), default=DeliveryType.shipping)

    # Local delivery settings (for restaurant vendors / Uber Direct prep)
    delivery_radius_miles = Column(Integer, nullable=True)   # How far they deliver
    delivery_note  = Column(String, nullable=True)             # e.g. "Min order $20, free delivery within 5 miles"
    delivery_fee          = Column(Float, nullable=True)     # Flat delivery fee they charge
    min_order_amount      = Column(Float, nullable=True)     # Minimum order for delivery
    prep_time_minutes     = Column(Integer, nullable=True)   # Avg prep time for hot food
    is_open_now           = Column(Boolean, default=True)    # Restaurant open/closed toggle
    opening_hours         = Column(String, nullable=True)    # e.g. "Mon-Fri 11am-9pm"
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)

    # Afrizone platform
    status = Column(Enum(SellerStatus, native_enum=False), default=SellerStatus.pending)
    tier = Column(Enum(SellerTier, native_enum=False), default=SellerTier.basic)
    subscription_end_date = Column(DateTime(timezone=True), nullable=True)
    is_featured = Column(Boolean, default=False)

    # Stripe Connect
    stripe_account_id = Column(String, nullable=True)  # Stripe Express account
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
    icon = Column(String, nullable=True)          # emoji or icon name
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
    compare_price = Column(Float, nullable=True)   # Original price for "sale" badge
    currency = Column(String, default="USD")

    # Inventory
    stock = Column(Integer, default=0)
    sku = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)

    # Images — stored as JSON array of URLs
    images = Column(JSON, default=list)            # ["url1", "url2", ...]

    # Origin info (cultural context)
    country_of_origin = Column(String, nullable=True)   # e.g., "Nigeria"
    tags = Column(JSON, default=list)              # ["jollof", "rice", "west africa"]

    # Shipping
    weight_kg = Column(Float, nullable=True)
    ships_from = Column(String, nullable=True)

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
    platform_fee = Column(Float, nullable=False)   # Afrizone commission
    seller_amount = Column(Float, nullable=False)  # What seller receives
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
    tracking_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

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
    rating = Column(Integer, nullable=False)        # 1–5
    title = Column(String, nullable=True)
    body = Column(Text, nullable=True)
    is_verified_purchase = Column(Boolean, default=False)
    photos = Column(JSON, default=list)             # ["url1", "url2"]
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
    discount_type = Column(String, default="percent")   # percent | fixed
    discount_value = Column(Float, nullable=False)       # 10 = 10% or $10
    min_order_amount = Column(Float, default=0.0)
    max_uses = Column(Integer, nullable=True)            # None = unlimited
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
    name = Column(String, nullable=False)       # e.g. "Size" or "Color"
    value = Column(String, nullable=False)      # e.g. "Large" or "Red"
    price_modifier = Column(Float, default=0.0) # +/- from base price
    stock = Column(Integer, default=0)
    sku = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    product = relationship("Product", backref="variants")


# ─────────────────────────────────────────────
# REVIEW PHOTOS
# ─────────────────────────────────────────────

# Add photos column to Review — we'll handle via migration note

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
    tier = Column(String, default="basic")          # basic | standard | premium
    stripe_subscription_id = Column(String, nullable=True)
    stripe_customer_id = Column(String, nullable=True)
    status = Column(String, default="active")       # active | cancelled | past_due
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
    label_url = Column(String, nullable=True)       # PDF download URL
    carrier = Column(String, default="USPS")
    service = Column(String, default="Priority")
    rate = Column(Float, nullable=True)             # Cost in USD
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
    type = Column(String, default="seller")         # seller | buyer
    status = Column(String, default="pending")      # pending | completed | rewarded
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