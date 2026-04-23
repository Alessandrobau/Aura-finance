# Frontend Build Guide — Finance App

## Stack
- **React** (Vite, TypeScript)
- **TailwindCSS** for styling
- **Recharts** for charts
- **React Router v6** for routing
- **Axios** for HTTP requests
- **React Context + useReducer** for auth state (or Zustand if preferred)

---

## Base URL
All API calls go to `http://localhost:3000`. Set in an env var: `VITE_API_URL=http://localhost:3000`.

---

## Authentication

### Storage
Store the JWT in `localStorage` under the key `"financeapp_token"`.  
Attach to every protected request: `Authorization: Bearer <token>`.

### Endpoints

| Method | Route | Body | Response |
|--------|-------|------|----------|
| POST | `/api/auth/register` | `{ nome, email, senha }` | `{ user: { id, nome, email }, token }` |
| POST | `/api/auth/login` | `{ email, senha }` | `{ user: { id, nome, email }, token }` |
| GET | `/api/auth/me` | — | `{ id, nome, email, criadoEm }` |

**Error shape:** `{ error: "message string" }` with HTTP status codes (400, 401, 409).

### Flow
1. On app load, check `localStorage` for token. If present, call `/api/auth/me`.
2. If `/me` fails (401), clear token and redirect to `/login`.
3. On logout, clear token and redirect to `/login`.

---

## Pages & Routes

```
/login              — Login page
/register           — Register page
/                   — Dashboard (protected)
/transactions       — Transaction list (protected)
/investments        — Investment portfolio (protected)
/goals              — Goals tracker (protected)
/debts              — Debt tracker (protected)
/chat               — AI Chatbot (protected)
```

---

## Dashboard (`/`)

### Summary Cards (top row)
Fetch: `GET /api/transactions/summary?mes=<1-12>&ano=<YYYY>`

Response:
```json
{
  "receitas": 5000.00,
  "despesas": 3200.00,
  "saldo": 1800.00,
  "porCategoria": {
    "alimentação": { "total": 800.00, "tipo": "despesa" }
  },
  "periodo": { "mes": 4, "ano": 2026 }
}
```

Display 3 cards: **Total Receitas** (green), **Total Despesas** (red), **Saldo** (blue/red if negative).

### Monthly Pie Chart
Use `porCategoria` from summary. Show despesa categories only.  
Library: `Recharts PieChart` with `Cell` for colors.

### Annual Line Chart
Fetch: `GET /api/transactions/annual?ano=<YYYY>`

Response:
```json
{
  "ano": 2026,
  "meses": [
    { "mes": 1, "receitas": 4000, "despesas": 3000, "saldo": 1000 },
    ...12 items
  ]
}
```

Line chart with 2 lines: Receitas (green) and Despesas (red). X-axis = month names in pt-BR.

### Debt Summary Widget
Fetch: `GET /api/debts`  
Show `totalDivida` as a card. Link to `/debts`.

### Investment Summary Widget
Fetch: `GET /api/investments`  
Show `patrimonioTotal`. Link to `/investments`.

---

## Transactions (`/transactions`)

### List
Fetch: `GET /api/transactions?mes=<>&ano=<>&tipo=<receita|despesa>&categoria=<>&page=1&limit=20`

Response:
```json
{
  "data": [
    {
      "id": "cuid",
      "tipo": "despesa",
      "valor": "120.50",
      "categoria": "alimentação",
      "descricao": "Supermercado",
      "data": "2026-04-23T10:00:00.000Z",
      "criadoPorIa": false
    }
  ],
  "meta": { "total": 45, "page": 1, "limit": 20, "totalPages": 3 }
}
```

Show as a table or card list. Color-code by tipo (green = receita, red = despesa).  
Add a badge "IA" when `criadoPorIa: true`.

### Filters Bar
- Month/Year picker (default: current month)
- Type toggle: Todos / Receitas / Despesas
- Category search input

### Create / Edit Modal
Fields: `tipo` (select), `valor` (number), `categoria` (text or select), `descricao` (text), `data` (date picker).

| Method | Route | Body |
|--------|-------|------|
| POST | `/api/transactions` | `{ tipo, valor, categoria, descricao?, data? }` |
| PUT | `/api/transactions/:id` | same fields, all optional |
| DELETE | `/api/transactions/:id` | — (204 No Content) |

---

## Investments (`/investments`)

### Fetch Portfolio
`GET /api/investments`

Response:
```json
{
  "investimentos": [
    {
      "id": "cuid",
      "tipo": "acao",
      "ticker": "PETR4",
      "quantidade": "100",
      "precoMedio": "35.50",
      "precoAtual": 38.20,
      "valorAtual": 3820.00,
      "valorInvestido": 3550.00,
      "lucroPrejuizo": 270.00,
      "lucroPrejuizoPercent": 7.6,
      "cotacao": { "preco": 38.20, "variacao": 0.45, "variacaoPercent": 1.19, "nome": "Petrobras" }
    }
  ],
  "patrimonioTotal": 15000.00,
  "cotacoes": {}
}
```

### Display
- Summary card: **Patrimônio Total**
- Table per asset: ticker, nome, quantidade, preço médio, preço atual, valor investido, valor atual, lucro/prejuízo (with % and color)
- Donut chart: patrimônio by `tipo` (acao, cripto, renda_fixa, fii)

### Add Investment Modal
Fields: `tipo` (select: acao/cripto/renda_fixa/fii), `ticker` (uppercase), `quantidade` (number), `precoMedio` (number).  
If ticker already exists, the backend averages the price automatically.

| Method | Route | Body |
|--------|-------|------|
| POST | `/api/investments` | `{ tipo, ticker, quantidade, precoMedio }` |
| PUT | `/api/investments/:id` | `{ quantidade?, precoMedio? }` |
| DELETE | `/api/investments/:id` | — |

### Quote Lookup
`GET /api/investments/quote/:ticker` — returns real-time quote for a single ticker.  
Use to show a live price preview when user types a ticker.

---

## Goals (`/goals`)

### Fetch
`GET /api/goals`

Response (array):
```json
[
  {
    "id": "cuid",
    "nome": "Reserva de emergência",
    "tipo": "economizar",
    "valorAlvo": 10000.00,
    "valorAtual": 4500.00,
    "prazo": "2026-12-31T00:00:00.000Z",
    "percentualConcluido": 45.0,
    "valorRestante": 5500.00,
    "concluida": false
  }
]
```

### Display
- Grid of cards, each with:
  - Title + tipo badge
  - Circular progress chart (`Recharts RadialBarChart` or CSS `conic-gradient`)
  - `valorAtual` / `valorAlvo` — formatted as BRL
  - Days until `prazo` (if set)
  - "Concluída" badge when `concluida: true`

### Contribute Modal
`PATCH /api/goals/:id/contribute` with `{ valor: number }` — can be negative to subtract.

| Method | Route | Body |
|--------|-------|------|
| POST | `/api/goals` | `{ nome, valorAlvo, valorAtual?, tipo, prazo? }` |
| PUT | `/api/goals/:id` | same fields, all optional |
| PATCH | `/api/goals/:id/contribute` | `{ valor: number }` |
| DELETE | `/api/goals/:id` | — |

### AI Goal Advice
`GET /api/ai/insights/goal-advice/:id`

Response: `{ insight: "long text string", meta: {...}, contextoFinanceiro: {...} }`.  
Show in a modal or side panel with markdown-rendered text.

---

## Debts (`/debts`)

### Fetch
`GET /api/debts`

Response:
```json
{
  "dividas": [
    {
      "id": "cuid",
      "credor": "Banco X",
      "valorTotal": 5000.00,
      "valorPago": 1500.00,
      "taxaJuros": 2.5,
      "vencimento": "2027-01-01T00:00:00.000Z",
      "valorPendente": 3500.00,
      "percentualPago": 30.0,
      "quitada": false
    }
  ],
  "totalDivida": 8500.00
}
```

### Display
- Summary card: **Total em Dívidas** (red)
- List of debt cards each with: credor, progress bar, valor pendente, taxa de juros, vencimento
- `quitada: true` → show with green strikethrough style

### Register Payment
`PATCH /api/debts/:id/pay` with `{ valor: number }`.

| Method | Route | Body |
|--------|-------|------|
| POST | `/api/debts` | `{ credor, valorTotal, valorPago?, taxaJuros?, vencimento? }` |
| PUT | `/api/debts/:id` | same, all optional |
| PATCH | `/api/debts/:id/pay` | `{ valor: number }` |
| DELETE | `/api/debts/:id` | — |

---

## AI Chat (`/chat`)

### Endpoint
`POST /api/ai/chat`

Request:
```json
{
  "mensagem": "Gastei R$ 50 no almoço hoje",
  "historico": [
    { "role": "user", "content": "..." },
    { "role": "model", "content": "..." }
  ],
  "provider": "auto"
}
```

Response:
```json
{
  "resposta": "Registrei sua despesa de R$ 50,00 em alimentação.",
  "provider": "gemini",
  "transacaoCriada": {
    "id": "cuid",
    "tipo": "despesa",
    "valor": "50.00",
    "categoria": "alimentação",
    "criadoPorIa": true
  }
}
```

### UI
- Full-height chat interface (sticky input at bottom)
- Message bubbles: user (right, blue), model (left, gray)
- When `transacaoCriada` is present, render a highlighted card inside the chat bubble:
  ```
  ✅ Transação registrada: despesa · R$ 50,00 · alimentação
  ```
- Keep `historico` state in component — append each user/model message pair after response
- Provider badge: show "Gemini" or "Ollama (Local)" pill in header
- `provider` field in request defaults to `"auto"` — the backend picks Gemini if key is set, else Ollama

---

## AI Insights

All require auth. Responses contain `{ insight: "text" }` and optionally raw data.

| Route | Trigger | Notes |
|-------|---------|-------|
| `GET /api/ai/insights/weekly-summary` | Button on Dashboard | Show in modal |
| `GET /api/ai/insights/goal-advice/:id` | "Get AI Advice" on goal card | Show in side panel |
| `GET /api/ai/insights/anomalies` | Button on Transactions page | Show list + text |
| `POST /api/ai/insights/categorize` | Body: `{ descricao }` → `{ categoria }` | Auto-fill category when creating transaction |

---

## Error Handling

All errors return:
```json
{ "error": "message string" }
```

Common HTTP codes:
- `400` — validation error (show inline)
- `401` — unauthorized (redirect to `/login`)
- `404` — not found (show toast)
- `409` — conflict, e.g. duplicate email
- `500` — server error (show generic toast)

Use an Axios interceptor to catch 401 globally and clear the token.

---

## Date & Currency Formatting (pt-BR)

```ts
// Currency
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
// → "R$ 1.234,56"

// Date
new Intl.DateTimeFormat('pt-BR').format(new Date(isoString))
// → "23/04/2026"

// Month name
new Date(year, monthIndex).toLocaleString('pt-BR', { month: 'long' })
// → "abril"
```

---

## Suggested Component Structure

```
src/
├── api/
│   ├── client.ts          # Axios instance with base URL + auth interceptor
│   ├── auth.ts
│   ├── transactions.ts
│   ├── investments.ts
│   ├── goals.ts
│   ├── debts.ts
│   └── ai.ts
├── context/
│   └── AuthContext.tsx
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── TransactionsPage.tsx
│   ├── InvestmentsPage.tsx
│   ├── GoalsPage.tsx
│   ├── DebtsPage.tsx
│   └── ChatPage.tsx
├── components/
│   ├── Layout/
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx
│   ├── Charts/
│   │   ├── MonthlyPieChart.tsx
│   │   ├── AnnualLineChart.tsx
│   │   └── CircularProgress.tsx
│   ├── Cards/
│   │   ├── SummaryCard.tsx
│   │   ├── GoalCard.tsx
│   │   └── DebtCard.tsx
│   ├── Modals/
│   │   ├── TransactionModal.tsx
│   │   ├── InvestmentModal.tsx
│   │   ├── GoalModal.tsx
│   │   └── DebtModal.tsx
│   └── Chat/
│       ├── ChatBubble.tsx
│       └── TransactionCard.tsx
└── hooks/
    ├── useTransactions.ts
    ├── useInvestments.ts
    ├── useGoals.ts
    └── useDebts.ts
```

---

## Axios Client Setup

```ts
// src/api/client.ts
import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('financeapp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('financeapp_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```
