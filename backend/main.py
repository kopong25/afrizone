from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import os

load_dotenv()

from routers import (
    auth, sellers, products, orders, payments,
    uber_direct,
    reviews, admin, wishlist, discounts, variants,
    shipping, messages, subscriptions, referrals,
    ads, push_notifications
)
from database import engine
import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Afrizone API",
    description="Pan-African marketplace — Amazon-style multi-vendor platform.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Rate Limiter ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
ALLOWED_ORIGINS = [
    FRONTEND_URL,
    "http://localhost:3000",
    "https://afrizone-frontend.onrender.com",
    "https://afrizoneshop.com",
    "https://www.afrizoneshop.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── Validation error handler ──────────────────────────────────
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": [{"msg": e["msg"], "loc": e["loc"]} for e in exc.errors()]},
    )

# ── Routers ───────────────────────────────────────────────────
app.include_router(auth.router,               prefix="/auth",          tags=["Auth"])
app.include_router(sellers.router,            prefix="/sellers",       tags=["Sellers"])
app.include_router(products.router,           prefix="/products",      tags=["Products"])
app.include_router(orders.router,             prefix="/orders",        tags=["Orders"])
app.include_router(payments.router,           prefix="/payments",      tags=["Payments"])
app.include_router(reviews.router,            prefix="/reviews",       tags=["Reviews"])
app.include_router(admin.router,              prefix="/admin",         tags=["Admin"])
app.include_router(wishlist.router,           prefix="/wishlist",      tags=["Wishlist"])
app.include_router(discounts.router,          prefix="/discounts",     tags=["Discounts"])
app.include_router(variants.router,           prefix="/variants",      tags=["Variants"])
app.include_router(shipping.router,           prefix="/shipping",      tags=["Shipping"])
app.include_router(messages.router,           prefix="/messages",      tags=["Messages"])
app.include_router(subscriptions.router,      prefix="/subscriptions", tags=["Subscriptions"])
app.include_router(referrals.router,          prefix="/referrals",     tags=["Referrals"])
app.include_router(ads.router,                prefix="/ads",           tags=["Ads"])
app.include_router(push_notifications.router, prefix="/push",          tags=["Push"])
app.include_router(uber_direct.router,        prefix="/uber-direct",   tags=["Uber Direct"])

# ── Health ────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"app": "Afrizone API", "version": "2.0.0", "status": "running", "docs": "/docs"}

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}