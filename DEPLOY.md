# 🚀 Afrizone Deployment Guide
## GitHub + Render + PostgreSQL

---

## STEP 1 — Push to GitHub

### 1.1 Create a GitHub account
Go to https://github.com and sign up (free).

### 1.2 Create a new repository
- Click the **+** button → **New repository**
- Name it: `afrizone`
- Set to **Public** or **Private**
- Do NOT initialize with README (you already have one)
- Click **Create repository**

### 1.3 Push your code from VSCode terminal

Open VSCode terminal in the `afrizone` root folder and run:

```bash
git init
git add .
git commit -m "Initial Afrizone commit 🌍"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/afrizone.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

✅ Your code is now on GitHub!

---

## STEP 2 — Set up Render PostgreSQL Database

### 2.1 Create Render account
Go to https://render.com and sign up (free tier available).

### 2.2 Create PostgreSQL database
1. Click **New +** → **PostgreSQL**
2. Fill in:
   - **Name:** `afrizone-db`
   - **Database:** `afrizone`
   - **User:** `afrizone_user`
   - **Region:** Ohio (US East) — closest to your users
   - **Plan:** Free (good for development) or Starter $7/mo (for production)
3. Click **Create Database**
4. Wait ~2 minutes for it to provision
5. Copy the **External Database URL** — looks like:
   ```
   postgresql://afrizone_user:xxxx@dpg-xxxxx.oregon-postgres.render.com/afrizone
   ```

---

## STEP 3 — Deploy FastAPI Backend on Render

### 3.1 Create Web Service
1. Click **New +** → **Web Service**
2. Connect your GitHub account and select the `afrizone` repo
3. Fill in settings:
   - **Name:** `afrizone-api`
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free or Starter

### 3.2 Set Environment Variables
In the Render dashboard for your API service, click **Environment** and add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | (paste your PostgreSQL External URL from Step 2) |
| `SECRET_KEY` | (generate: `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `ALGORITHM` | `HS256` |
| `ENVIRONMENT` | `production` |
| `STRIPE_SECRET_KEY` | `sk_live_...` (from Stripe dashboard) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (from Stripe dashboard) |
| `CLOUDINARY_CLOUD_NAME` | (from Cloudinary dashboard) |
| `CLOUDINARY_API_KEY` | (from Cloudinary dashboard) |
| `CLOUDINARY_API_SECRET` | (from Cloudinary dashboard) |
| `SENDGRID_API_KEY` | (from SendGrid dashboard) |
| `FRONTEND_URL` | `https://afrizone-frontend.onrender.com` (set after frontend deploy) |
| `PLATFORM_FEE_PERCENT` | `8` |

4. Click **Create Web Service**

Your API will be live at: `https://afrizone-api.onrender.com`
Test it: `https://afrizone-api.onrender.com/docs`

---

## STEP 4 — Deploy Next.js Frontend on Render

### 4.1 Create Static Site
1. Click **New +** → **Web Service**
2. Select the same `afrizone` repo
3. Fill in settings:
   - **Name:** `afrizone-frontend`
   - **Root Directory:** `frontend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free or Starter

### 4.2 Set Environment Variables

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://afrizone-api.onrender.com` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` |

4. Click **Create Web Service**

Your frontend will be live at: `https://afrizone-frontend.onrender.com`

---

## STEP 5 — Seed the Production Database

After deployment, run the seed script once to populate categories and sample data.

In your local VSCode terminal:
```bash
cd backend
# Temporarily set DATABASE_URL to your Render PostgreSQL URL
$env:DATABASE_URL="postgresql://afrizone_user:xxxx@dpg-xxxxx.render.com/afrizone"
python seed.py
```

---

## STEP 6 — Connect a Custom Domain (Optional)

1. Buy a domain at Namecheap, GoDaddy, or Google Domains
2. In Render dashboard → your frontend service → **Custom Domains**
3. Add `www.afrizone.com` and follow the DNS instructions
4. Render provides free SSL automatically ✅

---

## STEP 7 — Set up Stripe (Real Payments)

1. Go to https://stripe.com and create an account
2. Complete business verification
3. Enable **Stripe Connect** (for multi-vendor payouts)
4. Get your **live keys** from the dashboard
5. Update the environment variables on Render

---

## STEP 8 — Set up Cloudinary (Real Image Uploads)

1. Go to https://cloudinary.com and create a free account
2. Go to **Dashboard** → copy your Cloud Name, API Key, API Secret
3. Update environment variables on Render

---

## Auto-Deploy on Every Push

Once connected, every time you push code to GitHub `main` branch:
- Render **automatically rebuilds and deploys** your backend and frontend
- Zero downtime deployments
- Rollback available if something breaks

```bash
# Make a change, then deploy:
git add .
git commit -m "Add new feature"
git push origin main
# Render automatically deploys in ~3 minutes ✅
```

---

## 📊 Estimated Monthly Costs

| Service | Plan | Cost |
|---------|------|------|
| Render Backend (API) | Starter | $7/mo |
| Render Frontend | Starter | $7/mo |
| Render PostgreSQL | Starter | $7/mo |
| Cloudinary | Free | $0/mo |
| SendGrid | Free (100 emails/day) | $0/mo |
| **TOTAL** | | **~$21/mo** |

Upgrade plans as you grow. Free tier available for initial testing.

---

🌍 **Afrizone is now live and ready for African store owners to join!**
