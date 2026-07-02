# 07 — UX Redesign

## Design Language

Premium dark, AI-first, terminal-precise. Inspirations mapped to concrete decisions:

| Inspiration | What we take |
|---|---|
| Linear | Density + keyboard-first: ⌘K command palette, list virtuosity, subtle borders (`white/8`), no chrome |
| Raycast | The omnibox as the primary action surface |
| Perplexity | Streaming answers with inline citations→ here, inline *data blocks* (charts/tables in-message), follow-up chips |
| Robinhood | Number-first hero: net worth + delta sparkline as the emotional anchor; green/red micro-animations |
| CRED | Glass cards, gradient accents used sparingly (one gradient per screen max) |
| Apple | Type hierarchy does the work; motion 150–200ms ease-out only |

**Tokens (Tailwind v4 `@theme`):** bg `#0A0B0F`, surface `#12141A`, glass `rgba(255,255,255,0.04)` + `backdrop-blur-xl` + 1px `white/8` border; accent `#6366F1→#8B5CF6` gradient; profit `#22C55E`, loss `#EF4444`; text hi `#F4F4F5` / mid `#A1A1AA` / low `#52525B`. Numerals: `Geist Mono` tabular for all money; `Inter` elsewhere. Radius 12/16. Dark is the only theme at launch (light mode is roadmap).

**AI-first interaction pattern (global):** persistent **Copilot Dock** — collapsed pill bottom-center on desktop ("Ask anything about your money…"), expands to a right slide-over; full-screen chat page for deep sessions. `⌘K` opens the omnibox: type a question → routes to copilot; type an asset → navigates; type "add" → intake.

## Dashboard (desktop)

```
┌──────────────────────────────────────────────────────────────────────┐
│ ◆ TradingAI      ⌘K Search or ask…                    LIVE ● │ RB ▾ │
├────────┬─────────────────────────────────────────────────────────────┤
│        │  Net Worth                                    Health  78/100│
│  ⌂ Home│  ₹48,32,410  ▲ ₹1,24,300 (2.6%) this month    ▁▂▄▅▆▅▇      │
│  ◱ Port│                                                             │
│  ✦ AI  │ ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐  │
│  ↔ Exp │ │ Allocation    │ │ Today's movers│ │ ✦ Copilot insights│  │
│  ▤ Mkts│ │ ◐ donut       │ │ HDFCBANK +2.1%│ │ "Equity crossed   │  │
│  ⚙ Set │ │ EQ 62% DB 24% │ │ GOLDBEES −0.4%│ │  70% — rebalance?"│  │
│        │ └───────────────┘ └───────────────┘ │ [Show me] [Later] │  │
│        │ ┌─────────────────────────────────┐ └───────────────────┘  │
│        │ │ Performance (1M ▾)   ~~~/\~~~~/ │ ┌───────────────────┐  │
│        │ │                                 │ │ Upcoming          │  │
│        │ └─────────────────────────────────┘ │ SIP ₹10k · Jul 5  │  │
│        │                                     │ TCS earnings Jul 9│  │
├────────┴─────────────────────────────────────┴───────────────────┴──┤
│              ✦  Ask anything about your money…              [dock]  │
└──────────────────────────────────────────────────────────────────────┘
```

No BTC chart. The hero is *the user's* money; insights cards are copilot-generated nudges with one-tap deep links into chat.

## Portfolio

```
┌ Portfolio ───────────────────────────────────────────────────────────┐
│ ₹48.3L invested ₹41.1L  ▲17.5%        [✦ Add with AI]  [+ Manual ▾] │
│ ── Holdings ─ Allocation ─ Performance ─ Advisor ──                  │
│ ┌ filter: All ▾  search…                sort: Value ▾ ┐              │
│ │ ● HDFCBANK   Stock·NSE   200 qty  ₹3.4L  ▲12.4%  ⋮ │              │
│ │ ● Parag Flexi MF·SIP ✓   1,240 u  ₹2.1L  ▲8.2%   ⋮ │              │
│ │ ● Farmland   Custom·RA    —       ₹12L   marked 3mo│ ← staleness  │
│ └──────────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
[✦ Add with AI] → right sheet:
│ ✦ "Tell me what you bought."                                        │
│ ▸ "200 HDFC Bank shares at ₹1700 last March"                        │
│ ✦ Found HDFCBANK · NSE · ISIN INE040A01034                          │
│    When exactly, and which broker?    [Mar 2025 ▾] [Zerodha][Groww] │
│ ┌ ReviewCard: STOCK HDFCBANK · 200 @ ₹1,700 · Zerodha ─ [Edit][✓Add]│
```

Answer chips wherever the AI can enumerate options — typing is the fallback, not the default.

## Chat (full screen)

```
┌ ✦ Copilot ────────────────────────────── history ▾ ─┐
│ ▸ How diversified am I?                              │
│ ✦ Your score is 6.8/10. Equity-heavy:                │
│   ┌ chart: allocation vs recommended (grouped bars) ┐│
│   └─────────────────────────────────────────────────┘│
│   Top concentration: HDFCBANK is 18% of equity.      │
│   ┌ table: overexposed sectors ┐                     │
│   [Rebalance ideas] [Sector detail] [What's healthy?]│ ← follow-ups
│ ▸ If I invest ₹10,000 monthly for 10 years?          │
│ ✦ At 12%: ₹23.2L (invested ₹12L)                     │
│   ┌ chart: projection curve w/ scrubber ┐            │
│   [Try 15 years] [Add step-up] [Compare lumpsum]     │
├──────────────────────────────────────────────────────┤
│ ✦ Ask… ("Can I retire at 50?")                 ⏎     │
└──────────────────────────────────────────────────────┘
```

Every number a block, streamed progressively: text deltas render immediately, chart blocks skeleton-in when their tool resolves.

## Mobile (bottom-tab, thumb-first)

```
┌────────────────┐  Home: net-worth hero + sparkline,
│ ₹48.3L  ▲2.6%  │  horizontally-scrolling insight cards,
│ ▁▂▄▆▅▇         │  movers list.
│ [✦ insights →] │  Center tab is the Copilot (like
│ movers…        │  Robinhood's search-center pattern).
├────────────────┤  Intake runs full-screen with chips;
│ ⌂  ◱  ✦  ↔  ▤ │  charts in chat render full-width,
└────────────────┘  tables collapse to key-value cards.
```

## UX Rules

1. Money never wraps or reflows — tabular numerals, fixed-width columns.
2. Skeletons everywhere; no spinners over content. Optimistic add/delete with undo toast.
3. One gradient element per screen; glass only on overlays/cards, never nested.
4. Every AI mutation ends in a human-approved card. Every AI number is tappable → "how was this calculated?"
5. `LIVE / DEMO` mode pill always visible (DataProvider state).
6. Empty states are prompts, not blanks: "No assets yet — tell me what you own."
