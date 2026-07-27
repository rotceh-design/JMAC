# Jhon Aire - HVAC Web Platform

Professional climate control services platform with full-stack features.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Database:** PostgreSQL + Prisma 7 ORM
- **Auth:** Custom JWT with RBAC
- **Styling:** Tailwind CSS v4
- **Payments:** Stripe (sandbox ready)
- **Testing:** Vitest

## Local Setup

### Prerequisites

- Node.js 20.19+
- PostgreSQL 14+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd jhon_aire

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secrets

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed demo data
node prisma/seed.js

# Start development server
npm run dev
```

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@jhon-aire.cl | admin123 | ADMIN |
| ops@jhon-aire.cl | ops123 | OPERATIONS |
| support@jhon-aire.cl | support123 | SUPPORT |
| tech@jhon-aire.cl | tech123 | TECHNICIAN |

## Environment Variables

See `.env.example` for all required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - JWT signing secret
- `STRIPE_SECRET_KEY` - Stripe sandbox key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `RESEND_API_KEY` - Email service key

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
```

## Project Structure

```
src/
  app/
    (public)/        # Public pages (catalog, quote, checkout)
    dashboard/       # Protected dashboard pages
    api/             # API routes
  components/        # React components
  lib/               # Utilities (auth, db, validation)
prisma/
  schema.prisma      # Database schema
  seed.js            # Seed script
tests/               # Test files
```

## Features

### Phase 1 - Foundations
- User authentication with JWT
- RBAC for 4 roles (Admin, Operations, Support, Technician)
- Protected dashboards with light/dark mode

### Phase 2 - Public Portal
- Product catalog with filters
- Quote calculator wizard
- Checkout with Stripe integration
- Scheduling system

### Phase 3 - Operations
- Work order Kanban board
- Mobile-first technician app
- Digital signature capture
- Safety checklist

### Phase 4 - Support
- Equipment registry by serial number
- Warranty tracking with alerts
- Support ticket system with SLA

### Phase 5 - Admin/CRM
- Customer 360° profiles
- Financial dashboard
- Excel export for reports

### Phase 6 - Hardening
- Rate limiting on auth/quote endpoints
- Security headers (CSP, X-Frame-Options, etc.)
- 51 unit tests passing
# JMAC
