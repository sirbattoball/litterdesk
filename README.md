# 🐾 LitterDesk

**Breeder operations platform** — manage litters, qualify buyers, generate AI contracts, and collect deposits.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, Tailwind CSS, TanStack Query |
| Backend | FastAPI (Python), SQLAlchemy, Alembic |
| Database | PostgreSQL 16 |
| Auth | JWT (python-jose + bcrypt) |
| Payments | Stripe (subscriptions + Connect) |
| AI | Anthropic Claude (contracts, scoring, emails) |
| Email | Resend |
| Queue | Celery + Redis |
| Hosting | Railway (recommended) or any VPS |

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker Desktop
- Stripe account
- Anthropic account
- Resend account

### 1. Clone & Configure

```bash
git clone https://github.com/yourname/litterdesk
cd litterdesk
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start Database & Redis

```bash
docker compose up -d postgres redis
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App running at: http://localhost:3000

### 5. Start Background Workers (optional for dev)

```bash
cd backend
source venv/bin/activate
celery -A app.worker worker --loglevel=info &
celery -A app.worker beat --loglevel=info &
```

---

## Stripe Setup

### Create Products

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Create subscription products
stripe products create --name="LitterDesk Starter"
stripe prices create \
  --product=prod_XXX \
  --unit-amount=2900 \
  --currency=usd \
  --recurring[interval]=month

stripe products create --name="LitterDesk Pro"
stripe prices create \
  --product=prod_YYY \
  --unit-amount=7900 \
  --currency=usd \
  --recurring[interval]=month

stripe products create --name="LitterDesk Kennel"
stripe prices create \
  --product=prod_ZZZ \
  --unit-amount=14900 \
  --currency=usd \
  --recurring[interval]=month
```

### Webhook (local testing)

```bash
stripe listen --forward-to localhost:8000/api/payments/webhook
# Copy the webhook secret to .env STRIPE_WEBHOOK_SECRET
```

---

## Deploy to Railway (Recommended)

Railway handles PostgreSQL, Redis, and both services with zero ops.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init

# Deploy backend
cd backend
railway up --service backend --set-env DATABASE_URL=$DATABASE_URL

# Deploy frontend  
cd frontend
railway up --service frontend

# Set environment variables
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set STRIPE_SECRET_KEY=sk_live_...
# ... set all vars from .env.example
```

**Monthly cost on Railway:** ~$20–40 depending on usage.

---

## Deploy to VPS (Ubuntu 22.04)

```bash
# On your server
git clone https://github.com/yourname/litterdesk /opt/litterdesk
cd /opt/litterdesk
cp .env.example .env
# Edit .env with production values

# Run deployment
chmod +x scripts/deploy.sh
./scripts/deploy.sh vps

# Set up SSL with Let's Encrypt
apt install certbot python3-certbot-nginx
certbot --nginx -d litterdesk.com -d www.litterdesk.com
```

---

## Project Structure

```
litterdesk/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Environment config
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models/__init__.py   # All database models
│   │   ├── schemas/__init__.py  # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── auth.py          # JWT auth
│   │   │   ├── dogs.py          # Dog CRUD
│   │   │   ├── litters.py       # Litter management
│   │   │   ├── buyers.py        # Buyer CRM
│   │   │   ├── contracts.py     # Contract lifecycle
│   │   │   ├── payments.py      # Stripe integration
│   │   │   ├── ai_agent.py      # AI endpoints
│   │   │   └── dashboard.py     # Stats & activity
│   │   ├── services/
│   │   │   ├── ai_service.py    # Claude AI functions
│   │   │   └── email_service.py # Resend email
│   │   ├── tasks.py             # Celery background jobs
│   │   └── worker.py            # Celery config
│   ├── migrations/              # Alembic migrations
│   ├── requirements.txt
│   ├── alembic.ini
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                   # Landing page
│   │   │   ├── login/page.tsx             # Login
│   │   │   ├── register/page.tsx          # Registration
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx             # Dashboard shell
│   │   │       ├── page.tsx               # Dashboard home
│   │   │       ├── litters/page.tsx       # Litters list
│   │   │       ├── buyers/page.tsx        # Buyers CRM
│   │   │       ├── buyers/[id]/page.tsx   # Buyer detail + AI
│   │   │       └── contracts/             # Contracts
│   │   ├── components/
│   │   │   ├── Providers.tsx
│   │   │   └── layout/Sidebar.tsx
│   │   └── lib/
│   │       ├── api.ts           # Axios API client
│   │       └── store.ts         # Zustand auth store
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── nginx/nginx.conf
├── docker-compose.yml
├── .env.example
├── scripts/deploy.sh
└── docs/
    ├── BUSINESS_MODEL.md
    └── LAUNCH_PLAN.md
```

---

## API Endpoints Summary

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Get JWT token
- `GET  /api/auth/me` — Current user
- `PUT  /api/auth/me` — Update profile

### Core Resources
- `/api/dogs` — CRUD for dogs
- `/api/litters` — CRUD + puppies + waitlist
- `/api/buyers` — CRM + waitlist assignment
- `/api/contracts` — Generate, send, sign

### AI Features (Pro plan)
- `POST /api/ai/generate-contract` — Claude writes full contract
- `POST /api/ai/score-buyer` — Claude scores buyer 0-100
- `POST /api/ai/draft-email` — Claude drafts follow-up email
- `POST /api/ai/match-litter/{id}` — AI matches buyers to puppies
- `POST /api/ai/litter-announcement/{id}` — Generate social content

### Payments
- `POST /api/payments/create-subscription/{plan}` — Stripe checkout
- `POST /api/payments/create-portal` — Billing portal
- `POST /api/payments/collect-deposit` — Buyer deposit
- `POST /api/payments/stripe-connect/onboard` — Breeder onboarding
- `POST /api/payments/webhook` — Stripe events

---

## Revenue Targets

| Plan | Price | Users Needed for $5k/mo |
|------|-------|------------------------|
| Starter | $29 | 173 |
| Pro | $79 | 64 |
| Kennel | $149 | 34 |
| **Mix (realistic)** | — | **~55 Pro + 15 Starter + 3 Kennel** |

---

## License

MIT — build on it, sell it, make money.
