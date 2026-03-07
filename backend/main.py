from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Import all routers
from routers import auth, sellers, products, orders, payments, reviews, admin, wishlist, discounts, variants

# Import models and create tables on startup
from database import engine
import models

models.Base.metadata.create_all(bind=engine)

# ─────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────

app = FastAPI(
    title="Afrizone API",
    description="Pan-African marketplace backend — Amazon-style multi-vendor platform for African stores in the USA, Canada & Europe.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─────────────────────────────────────────────
# CORS — allow frontend to call API
# ─────────────────────────────────────────────

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# REGISTER ROUTERS
# ─────────────────────────────────────────────

app.include_router(auth.router,     prefix="/auth",     tags=["Authentication"])
app.include_router(sellers.router,  prefix="/sellers",  tags=["Sellers & Stores"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(orders.router,   prefix="/orders",   tags=["Orders"])
app.include_router(payments.router, prefix="/payments", tags=["Payments & Payouts"])
app.include_router(reviews.router,  prefix="/reviews",  tags=["Reviews"])
app.include_router(admin.router,    prefix="/admin",    tags=["Admin"])


# ─────────────────────────────────────────────
# ROOT & HEALTH CHECK
# ─────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {
        "app": "Afrizone API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}