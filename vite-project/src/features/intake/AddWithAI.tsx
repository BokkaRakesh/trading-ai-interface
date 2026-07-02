// ============================================
// Add with AI — conversational asset intake panel.
// Flow: describe holding → AI extracts + resolves → asks only the
// missing required fields (one per turn, chips where possible)
// → editable ReviewCard → confirm → asset appears in portfolio.
// Runs fully offline via MockProvider (demo mode).
// ============================================

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Pencil, Send, Sparkles, X } from 'lucide-react';
import { getProvider } from '../../providers/singleton';
import type { IntakeState } from '../../providers/types';
import { usePortfolioAssetsStore } from '../../stores/portfolioAssetsStore';

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
}

interface AddWithAIProps {
  onClose: () => void;
  onAdded?: () => void;
}

const SLOT_LABELS: Record<string, string> = {
  name: 'Asset',
  symbol: 'Symbol',
  exchange: 'Exchange',
  isin: 'ISIN',
  quantity: 'Quantity',
  purchase_price: 'Buy price (₹)',
  purchase_date: 'Purchase date',
  broker: 'Broker',
  interest_rate: 'Interest rate (%)',
};

const EDITABLE_FIELDS = ['name', 'quantity', 'purchase_price', 'purchase_date', 'broker', 'interest_rate'];

const EXAMPLES = [
  'I have 200 HDFC Bank shares purchased at ₹1700',
  '350 units of Parag Parikh Flexi Cap at NAV ₹86.4',
  '10 grams of gold at ₹8,200 bought in March 2025',
  'FD of ₹2 lakh in SBI at 7.1%',
];

export default function AddWithAI({ onClose, onAdded }: AddWithAIProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', text: 'Tell me what you bought — I’ll figure out the details and only ask what’s missing.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<IntakeState | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);
  const addAsset = usePortfolioAssetsStore((s) => s.addAsset);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, session, busy]);

  const provider = getProvider();
  const readyToReview = session?.status === 'ACTIVE' && session.question === null && !added;

  function say(role: ChatMsg['role'], text: string) {
    setMessages((m) => [...m, { role, text }]);
  }

  function describeExtraction(s: IntakeState): string {
    const parts: string[] = [];
    const v = (k: string) => s.slots[k]?.value;
    if (v('symbol')) parts.push(`Found ${String(v('symbol'))} (${String(v('exchange') ?? '?')})${v('isin') ? ` · ISIN ${String(v('isin'))}` : ''}.`);
    else if (v('name')) parts.push(`Got it — ${String(v('name'))}.`);
    else parts.push('Got it.');
    const known: string[] = [];
    if (v('quantity')) known.push(`${String(v('quantity'))} units`);
    if (v('purchase_price')) known.push(`at ₹${Number(v('purchase_price')).toLocaleString('en-IN')}`);
    if (known.length) parts.push(`Detected ${known.join(' ')}.`);
    return parts.join(' ');
  }

  async function handleStart(text: string) {
    setBusy(true);
    say('user', text);
    try {
      const s = await provider.intake.start(text);
      setSession(s);
      say('assistant', describeExtraction(s));
      if (s.question) say('assistant', s.question.prompt);
      else say('assistant', 'I have everything I need — review and confirm below.');
    } catch {
      say('assistant', 'Something went wrong starting the session. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleAnswer(value: string) {
    if (!session?.question) return;
    setBusy(true);
    say('user', value);
    try {
      const s = await provider.intake.answer(session.sessionId, session.question.field, value);
      setSession(s);
      if (s.question) say('assistant', s.question.prompt);
      else say('assistant', 'All set — review and confirm below.');
    } catch {
      say('assistant', 'Could not record that answer. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!session) return;
    setBusy(true);
    try {
      const numericEdits: Record<string, unknown> = { ...edits };
      const asset = await provider.intake.confirm(session.sessionId, numericEdits);
      const val = (k: string) => edits[k] ?? String(session.slots[k]?.value ?? '');
      const qty = Number(val('quantity')) || 1;
      const price = Number(val('purchase_price')) || 0;
      addAsset({
        asset_id: asset.id,
        asset_type: asset.assetType,
        asset_name: asset.name,
        quantity: qty,
        purchase_price: price,
        purchase_value: qty * price,
        purchase_date: val('purchase_date') || new Date().toISOString().slice(0, 10),
        current_price: price,
        current_value: qty * price,
        gain_loss: 0,
        roi_percent: 0,
        broker: val('broker') || undefined,
      });
      setAdded(true);
      say('assistant', `Added ${asset.name} to your portfolio ✓`);
      onAdded?.();
    } catch {
      say('assistant', 'Could not add the asset. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function resetForAnother() {
    setSession(null);
    setEdits({});
    setAdded(false);
    setMessages([{ role: 'assistant', text: 'What else do you own?' }]);
  }

  function submitInput() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    if (!session || added) void handleStart(text);
    else void handleAnswer(text);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6">
      <div className="w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-indigo-950/60 to-gray-900">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white leading-tight">Add with AI</h3>
              <p className="text-[11px] text-gray-500 leading-tight">Describe it — I&apos;ll ask only what&apos;s missing</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[280px]">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700/60'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex items-center gap-2 text-gray-500 text-xs pl-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> thinking…
            </div>
          )}

          {/* Example prompts (before first message) */}
          {!session && !busy && messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => void handleStart(e)}
                  className="px-3 py-1.5 rounded-full text-xs text-indigo-300 border border-indigo-800/60 bg-indigo-950/40 hover:bg-indigo-900/50 transition-colors text-left"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* Option chips for the current question */}
          {session?.question?.options && !busy && !added && (
            <div className="flex flex-wrap gap-2 pt-1">
              {session.question.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => void handleAnswer(opt)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white bg-gray-800 border border-gray-600 hover:border-indigo-500 hover:bg-gray-700 transition-colors"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Review card */}
          {readyToReview && session && (
            <div className="rounded-xl border border-indigo-700/50 bg-gradient-to-b from-indigo-950/40 to-gray-900 p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 uppercase tracking-wide">
                <Pencil className="w-3 h-3" /> Review &amp; confirm
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {Object.entries(session.slots)
                  .filter(([k]) => k in SLOT_LABELS)
                  .map(([k, slot]) => (
                    <div key={k} className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wide text-gray-500">{SLOT_LABELS[k]}</div>
                      {EDITABLE_FIELDS.includes(k) ? (
                        <input
                          value={edits[k] ?? String(slot.value ?? '')}
                          onChange={(ev) => setEdits((e) => ({ ...e, [k]: ev.target.value }))}
                          className="w-full mt-0.5 px-2 py-1 text-sm text-white bg-gray-800 border border-gray-700 rounded-md focus:border-indigo-500 focus:outline-none"
                        />
                      ) : (
                        <div className="text-sm text-white truncate mt-0.5">{String(slot.value ?? '—')}</div>
                      )}
                      {slot.source !== 'user' && (
                        <div className="text-[10px] text-gray-600">
                          {slot.source === 'lookup' ? 'auto-resolved' : 'inferred'} · {(slot.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  ))}
              </div>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={busy}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition-colors"
              >
                <Check className="w-4 h-4" /> Add to portfolio
              </button>
            </div>
          )}

          {/* Post-add actions */}
          {added && !busy && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={resetForAnother}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-indigo-300 border border-indigo-800/60 bg-indigo-950/40 hover:bg-indigo-900/50 transition-colors"
              >
                Add another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-white bg-gray-800 border border-gray-600 hover:bg-gray-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-800 bg-gray-900">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitInput(); }}
              disabled={busy}
              placeholder={
                session?.question
                  ? session.question.inputHint === 'date'
                    ? 'e.g. 2025-03-15'
                    : 'Type your answer…'
                  : '"I have 200 HDFC Bank shares at ₹1700…"'
              }
              className="flex-1 px-3.5 py-2 text-sm text-white bg-gray-800 border border-gray-700 rounded-xl placeholder-gray-500 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={submitInput}
              disabled={busy || !input.trim()}
              className="p-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
