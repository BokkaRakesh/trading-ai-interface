# TradingAI — Smart Trading & Portfolio Assistant

Full-stack personal finance dashboard for Indian retail investors.

See **[vite-project/README.md](vite-project/README.md)** for complete documentation — features, tech stack, project structure, API reference, environment variables, and setup instructions.

## Quick Start

```bash
cd vite-project
npm install
npm run dev          # http://localhost:5173
```

## Deploy to Vercel

The frontend ships in **mock mode** by default — it works with zero backend.

1. Push this repo to GitHub.
2. In Vercel: **Add New Project** → import the repo → set **Root Directory** to `vite-project`.
3. Framework preset: **Vite** (auto-detected). Build `npm run build`, output `dist` (defaults).
4. Environment variables: `VITE_DATA_MODE=mock` (or `api` + `VITE_API_BASE` once the FastAPI backend is hosted).
5. Deploy. SPA routing and cache headers are configured in `vite-project/vercel.json`.

Sanity tests: `cd vite-project && npx tsx tests/sanity.mjs`

Architecture redesign docs: [docs/architecture/](docs/architecture/)
- Real-time trading APIs (Binance, Alpha Vantage)
- AI integration (OpenAI / Azure OpenAI)
- Portfolio tracking
- Alerts and notifications
- Multi-agent trading strategies

## 🏗️ Architecture Diagram
+--------------------------------------------------+
|                  Frontend (React)                |
|--------------------------------------------------|
|                                                  |
|  +----------------+     +----------------------+  |
|  |  Chat UI       |     |  Trading Chart UI   |  |
|  |----------------|     |---------------------|  |
|  | Message List   |     | Chart Component     |  |
|  | Input Box      |     | Market Data (Mock)  |  |
|  +--------+-------+     +----------+----------+  |
|           |                         |             |
|           |                         |             |
|           +-----------+-------------+             |
|                       |                           |
|              +--------v--------+                  |
|              | State Manager   |                  |
|              | (React/Zustand) |                  |
|              +--------+--------+                  |
|                       |                           |
|             +---------v----------+                |
|             | Mock AI Engine     |                |
|             | (Simulated Logic)  |                |
|             +--------------------+                |
|                                                  |
+--------------------------------------------------+

              (Future Integration Layer)

     +--------------------------------------+
     | External APIs / Services             |
     |--------------------------------------|
     | - Trading APIs (Binance, AlphaVantage)
     | - AI APIs (OpenAI / Azure OpenAI)
     +--------------------------------------+

     ## 💡 Design Approach

- Built UI-first to focus on user experience
- Decoupled architecture for easy API integration
- Simulated AI + trading data for rapid prototyping
- Component-driven development for scalability
