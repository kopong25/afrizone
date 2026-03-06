# 🌍 Afrizone — Pan-African Marketplace

Amazon-style multi-vendor e-commerce platform for African stores in the USA, Canada & Europe.

**Stack:** FastAPI (Python) · PostgreSQL (Render) · Next.js · Stripe Connect · Cloudinary

---

## 📁 Project Structure

```
afrizone/
├── backend/               # FastAPI Python backend
│   ├── main.py            # App entry point
│   ├── database.py        # DB connection & session
│   ├── models.py          # SQLAlchemy ORM models
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── auth.py            # JWT auth utilities
│   ├── routers/
│   │   ├── auth.py        # /auth endpoints
│   │   ├── sellers.py     # /sellers endpoints
│   │   ├── products.py    # /products endpoints
│   │   ├── orders.py      # /orders endpoints
│   │   ├── payments.py    # /payments + Stripe
│   │   ├── reviews.py     # /reviews endpoints
│   │   └── admin.py       # /admin endpoints
│   ├── utils/
│   │   ├── cloudinary.py  # Image upload helper
│   │   └── email.py       # SendGrid email helper
│   ├── requirements.txt
│   └── .env.example
├── frontend/              # Next.js frontend
│   ├── pages/
│   │   ├── index.js       # Homepage
│   │   ├── _app.js        # App wrapper
│   │   ├── login.js       # Login page
│   │   ├── register.js    # Register page
│   │   ├── products/
│   │   │   └── [id].js    # Product detail page
│   │   ├── seller/
│   │   │   ├── dashboard.js
│   │   │   ├── products.js
│   │   │   └── orders.js
│   │   └── admin/
│   │       └── dashboard.js
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.js
│   │   │   └── Footer.js
│   │   ├── ui/
│   │   │   ├── ProductCard.js
│   │   │   └── StoreCard.js
│   │   └── seller/
│   │       └── ProductForm.js
│   ├── lib/
│   │   └── api.js         # Axios API client
│   ├── styles/
│   │   └── globals.css
│   ├── package.json
│   └── .env.local.example
├── render.yaml            # Render.com deployment config
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (local or Render)
- Stripe account
- Cloudinary account
- SendGrid account

---

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Copy env file and fill in your values
cp .env.example .env

# Run database migrations (creates all tables)
python -c "from database import engine; from models import Base; Base.metadata.create_all(bind=engine)"

# Start development server
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file
cp .env.local.example .env.local

# Start development server
npm run dev
```

Frontend available at: http://localhost:3000

---

## 🌐 Deploy to Render

1. Push code to GitHub
2. Go to https://render.com → New → Blueprint
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml` and create all services
5. Set environment variables in Render dashboard

---

## 💳 Stripe Setup (Multi-Vendor)

1. Create account at https://stripe.com
2. Enable Stripe Connect in your dashboard
3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env`
4. Sellers will onboard via Stripe Express during registration

---

## 📧 Environment Variables

See `backend/.env.example` and `frontend/.env.local.example` for all required variables.

---

## 🔐 User Roles

| Role | Access |
|------|--------|
| `buyer` | Browse, purchase, review products |
| `seller` | All buyer access + manage store, products, orders |
| `admin` | Full platform access + approve sellers, manage disputes |

---

## 📦 Key Features Built

- ✅ JWT Authentication (register, login, refresh)
- ✅ Seller onboarding & store management
- ✅ Product CRUD with image upload (Cloudinary)
- ✅ Product search & filtering
- ✅ Shopping cart & order management
- ✅ Stripe Connect payments & seller payouts
- ✅ Product reviews & ratings
- ✅ Admin dashboard
- ✅ Email notifications (SendGrid)
- ✅ Subscription tier management

---

Built with ❤️ for the African diaspora community.
