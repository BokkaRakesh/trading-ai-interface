// ============================================
// CopilotChat — streaming AI assistant with generative-UI blocks
// (text deltas, charts, tables, suggestion chips) rendered in-message.
// Backed by DataProvider.copilot — works offline via MockProvider.
// ============================================

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { getProvider } from '../../providers/singleton';
import type { ChartSpec, CopilotBlock } from '../../providers/types';

const DONUT_COLORS = ['#6366F1', '#8B5CF6', '#22C55E', '#F59E0B', '#EC4899', '#14B8A6'];

interface ChatMessage {
  role: 'user' | 'assistant';
  blocks: CopilotBlock[];
}

function fmtINR(n: number): string {
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function ChartBlock({ spec }: { spec: ChartSpec }) {
  const data = spec.series[0]?.data ?? [];
  return (
    <div className="mt-2 rounded-xl border border-gray-700/60 bg-gray-900/60 p-3">
      {spec.title && <div className="text-xs font-medium text-gray-400 mb-2">{spec.title}</div>}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          {spec.kind === 'donut' ? (
            <PieChart>
              <Pie data={data} dataKey="y" nameKey="x" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
                {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          ) : spec.kind === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="x" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="y" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="copilotArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="x" tick={{ fill: '#6B7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} tickFormatter={(v: number) => fmtINR(v)} width={70} />
              <Tooltip
                formatter={(v) => (typeof v === 'number' ? fmtINR(v) : String(v ?? ''))}
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="y" stroke="#6366F1" strokeWidth={2} fill="url(#copilotArea)" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BlockRenderer({ block, onPrompt }: { block: CopilotBlock; onPrompt: (p: string) => void }) {
  switch (block.type) {
    case 'text':
      return <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{block.text}</p>;
    case 'chart':
      return <ChartBlock spec={block.spec} />;
    case 'table':
      return (
        <div className="mt-2 overflow-x-auto rounded-xl border border-gray-700/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800/80">
                {block.columns.map((c) => (
                  <th key={c} className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-t border-gray-800">
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2 text-gray-200 tabular-nums">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'suggestions':
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {block.prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onPrompt(prompt)}
              className="px-3 py-1.5 rounded-full text-xs text-indigo-300 border border-indigo-800/60 bg-indigo-950/40 hover:bg-indigo-900/50 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export default function CopilotChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [starters, setStarters] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const provider = getProvider();

  useEffect(() => {
    void provider.copilot.suggestions().then(setStarters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || busy) return;
    setInput('');
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: 'user', blocks: [{ type: 'text', id: 'u', text: prompt }] },
      { role: 'assistant', blocks: [] },
    ]);

    try {
      await provider.copilot.chat(null, prompt, (e) => {
        setMessages((m) => {
          const out = [...m];
          const last = { ...out[out.length - 1] };
          const blocks = [...last.blocks];
          if (e.event === 'delta') {
            const idx = blocks.findIndex((b) => b.type === 'text' && b.id === e.blockId);
            if (idx >= 0) {
              const tb = blocks[idx];
              if (tb.type === 'text') blocks[idx] = { ...tb, text: tb.text + e.text };
            } else {
              blocks.push({ type: 'text', id: e.blockId, text: e.text });
            }
          } else if (e.event === 'block') {
            blocks.push(e.block);
          }
          last.blocks = blocks;
          out[out.length - 1] = last;
          return out;
        });
      });
    } catch {
      setMessages((m) => {
        const out = [...m];
        out[out.length - 1] = {
          role: 'assistant',
          blocks: [{ type: 'text', id: 'err', text: 'Something went wrong. Please try again.' }],
        };
        return out;
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-indigo-950/50 to-gray-900">
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
          <Sparkles className="w-4 h-4 text-white" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-white leading-tight">Portfolio Copilot</h2>
          <p className="text-[11px] text-gray-500 leading-tight">Ask anything about your money</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-6">
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <Sparkles className="w-6 h-6 text-white" />
            </span>
            <div>
              <p className="text-white font-medium">Ask anything about your portfolio</p>
              <p className="text-xs text-gray-500 mt-1">Diversification, simulations, sector exposure, retirement…</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="px-3.5 py-2 rounded-xl text-xs text-indigo-300 border border-indigo-800/60 bg-indigo-950/40 hover:bg-indigo-900/50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`${
                m.role === 'user'
                  ? 'max-w-[80%] bg-indigo-600 text-white px-3.5 py-2 rounded-2xl rounded-br-sm text-sm'
                  : 'max-w-[92%] w-full space-y-1'
              }`}
            >
              {m.blocks.map((b, j) => (
                <BlockRenderer key={`${i}-${j}`} block={b} onPrompt={(p) => void send(p)} />
              ))}
              {m.role === 'assistant' && m.blocks.length === 0 && (
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> analyzing your portfolio…
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void send(input); }}
            disabled={busy}
            placeholder='Try "Can I retire at 50?"'
            className="flex-1 px-3.5 py-2.5 text-sm text-white bg-gray-800 border border-gray-700 rounded-xl placeholder-gray-500 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={busy || !input.trim()}
            className="p-2.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
