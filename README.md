# TradingAI — Smart Trading & Portfolio Assistant

Full-stack personal finance dashboard for Indian retail investors.

See **[vite-project/README.md](vite-project/README.md)** for complete documentation — features, tech stack, project structure, API reference, environment variables, and setup instructions.

## Quick Start

```bash
cd vite-project
npm install
npm run dev          # http://localhost:5174
```
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
