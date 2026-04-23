# Finance App

An AI-powered personal finance platform for tracking transactions, investments, goals, and debts, with an integrated AI assistant for financial insights and natural-language transaction entry.

## Features

- **Dashboard** — spending summary, net worth, and recent activity at a glance
- **Transactions** — manual entry or natural-language input via AI (e.g. "spent R$50 on groceries")
- **Investments** — portfolio tracking for stocks, crypto, REITs, and fixed income with live prices
- **Goals** — savings targets and spending limits with progress tracking
- **Debts** — creditor tracking with interest rates and due dates
- **AI Chat** — conversational assistant for financial advice and transaction creation
- **AI Insights** — automated analysis of spending patterns and financial health

## Tech Stack

**Backend**
- [Fastify](https://fastify.dev/) — HTTP server
- [Prisma](https://www.prisma.io/) — ORM
- [PostgreSQL](https://www.postgresql.org/) — database
- [Google Gemini](https://ai.google.dev/) — AI (primary) / [Ollama](https://ollama.com/) — AI (local fallback)
- [BRAPI](https://brapi.dev/) — Brazilian stock prices
- [CoinGecko](https://www.coingecko.com/en/api) — cryptocurrency prices

**Frontend**
- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — build tool
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) — UI components
- [React Query](https://tanstack.com/query) — server state
- [React Router](https://reactrouter.com/) — routing
- [Recharts](https://recharts.org/) — charts
- [Zod](https://zod.dev/) + [React Hook Form](https://react-hook-form.com/) — form validation

**Infrastructure**
- Docker + Docker Compose — containerisation
- Nginx — frontend static file serving

## Project Structure

```
finance_app/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/         # Migration history
│   ├── src/
│   │   ├── config/env.ts       # Environment variable loader
│   │   ├── db/                 # Prisma client
│   │   ├── middleware/auth.ts  # JWT authentication
│   │   ├── routes/             # API route handlers
│   │   │   ├── auth.ts
│   │   │   ├── transactions.ts
│   │   │   ├── investments.ts
│   │   │   ├── goals.ts
│   │   │   ├── debts.ts
│   │   │   └── ai/             # AI chat & insights routes
│   │   ├── services/           # Business logic & external APIs
│   │   │   ├── gemini.ts
│   │   │   ├── ollama.ts
│   │   │   ├── brapi.ts
│   │   │   └── coingecko.ts
│   │   └── server.ts           # Entry point
│   ├── Dockerfile
│   └── railway.json            # Railway deployment config
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios API clients
│   │   ├── components/         # Reusable UI components
│   │   ├── context/            # React context (auth, etc.)
│   │   ├── hooks/              # Custom hooks
│   │   ├── pages/              # Route-level page components
│   │   └── App.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vercel.json             # Vercel deployment config
└── docker-compose.yml          # Full-stack local/production stack
```

## Local Development

### Prerequisites

- Node.js 22+
- PostgreSQL 16+ (or Docker)
- A Google Gemini API key (or a local Ollama instance)

### Backend

```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run db:migrate     # apply migrations
npm run dev            # starts on http://localhost:3000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local   # set VITE_API_URL=http://localhost:3000
npm install
npm run dev                  # starts on http://localhost:5173
```

### Full stack with Docker

```bash
# from the project root
GEMINI_API_KEY=your-key docker compose up --build
```

Frontend → http://localhost:8080  
Backend → http://localhost:3000  
API docs → http://localhost:3000/docs

## API Overview

All routes are prefixed with `/api`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Obtain JWT |
| GET/POST/DELETE | `/transactions` | Yes | Transactions CRUD |
| GET/POST/PUT/DELETE | `/investments` | Yes | Portfolio CRUD |
| GET/POST/PUT/DELETE | `/goals` | Yes | Goals CRUD |
| GET/POST/PUT/DELETE | `/debts` | Yes | Debts CRUD |
| POST | `/ai/chat` | Yes | AI conversation |
| GET | `/ai/insights` | Yes | Automated insights |
| GET | `/health` | No | Health check |

## Environment Variables

See `backend/.env.example` for the full list. Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing tokens (min 32 chars) |

Optional but recommended:

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key for AI features |
| `BRAPI_TOKEN` | BRAPI token for Brazilian stock prices |
| `COINGECKO_API_KEY` | CoinGecko API key for crypto prices |

## Deployment

See [deploy.md](deploy.md) for full production deployment instructions covering Docker Compose (VPS), Railway, and Vercel.

## License

MIT
