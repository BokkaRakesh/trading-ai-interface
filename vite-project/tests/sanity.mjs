// QA sanity suite — exercises MockProvider end-to-end (no DOM).
// Run: npx -y tsx tests/sanity.mjs
import { createMockProvider } from '../src/providers/MockProvider';

let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} ${detail}`); }
}

const p = createMockProvider();

console.log('\n[1] Portfolio API');
const summary = await p.portfolio.getSummary();
check('summary totals positive', summary.totalValue > 0 && summary.totalInvested > 0);
check('allocation sums to ~100%', Math.abs(summary.allocation.reduce((s, a) => s + a.pct, 0) - 100) < 0.5);
const assets = await p.portfolio.listAssets();
const baseCount = assets.length;
check('assets listed', baseCount > 0);
const filtered = await p.portfolio.listAssets({ search: 'hdfc' });
check('search filter works', filtered.length === 1 && filtered[0].symbol === 'HDFCBANK');
const perf = await p.portfolio.getPerformance('1M');
check('performance series returned', perf.length > 10 && perf.every((d) => d.value > 0));

console.log('\n[2] Intake: happy path (stock, missing date + broker)');
let s = await p.intake.start('I have 200 HDFC Bank shares purchased at ₹1700');
check('type inferred STOCK', s.assetType === 'STOCK', `got ${s.assetType}`);
check('qty extracted', s.slots.quantity?.value === 200);
check('price extracted', s.slots.purchase_price?.value === 1700);
check('symbol resolved', s.slots.symbol?.value === 'HDFCBANK');
check('ISIN resolved', String(s.slots.isin?.value ?? '').startsWith('INE'));
check('asks a question for missing field', s.question !== null);
check('first missing q is purchase_date', s.question?.field === 'purchase_date', `got ${s.question?.field}`);
s = await p.intake.answer(s.sessionId, s.question.field, '2025-03-15');
check('next q is broker with options', s.question?.field === 'broker' && (s.question?.options?.length ?? 0) > 0);
s = await p.intake.answer(s.sessionId, 'broker', 'Zerodha');
check('no more questions after all slots filled', s.question === null && s.missing.length === 0);
const created = await p.intake.confirm(s.sessionId);
check('asset created with resolved name', created.id && created.name.length > 0);
const after = await p.portfolio.listAssets();
check('portfolio grew by 1', after.length === baseCount + 1, `${baseCount} -> ${after.length}`);

console.log('\n[3] Intake: edits at confirm are honored');
let s2 = await p.intake.start('30 Infosys shares at ₹1450');
while (s2.question) s2 = await p.intake.answer(s2.sessionId, s2.question.field, s2.question.options?.[0] ?? '2025-01-01');
const edited = await p.intake.confirm(s2.sessionId, { quantity: 35 });
check('edited quantity applied', edited.quantity === 35, `got ${edited.quantity}`);

console.log('\n[3b] Intake: type inference across asset classes');
let mf = await p.intake.start('350 units of Parag Parikh Flexi Cap at NAV ₹86.4');
check('MF inferred', mf.assetType === 'MF', `got ${mf.assetType}`);
check('MF units extracted', mf.slots.quantity?.value === 350);
check('MF NAV extracted', mf.slots.purchase_price?.value === 86.4);
check('MF does not ask for broker', !(mf.missing.includes('broker')));

let gold = await p.intake.start('10 grams of gold at ₹8,200 bought in March 2025');
check('GOLD inferred', gold.assetType === 'GOLD', `got ${gold.assetType}`);
check('grams extracted', gold.slots.quantity?.value === 10);
check('date inferred from "March 2025"', String(gold.slots.purchase_date?.value ?? '').startsWith('2025-03'));

let fd = await p.intake.start('FD of ₹2 lakh in SBI at 7.1%');
check('FD inferred', fd.assetType === 'FD', `got ${fd.assetType}`);
check('lakh amount parsed (200000)', fd.slots.purchase_price?.value === 200000, `got ${fd.slots.purchase_price?.value}`);
check('rate parsed, not mistaken for price', fd.slots.interest_rate?.value === 7.1);
check('FD asks for institution name', fd.missing.includes('name'));

let inline = await p.intake.start('30 Infosys shares at ₹1450 bought in March 2025 in Zerodha');
check('inline broker detected', String(inline.slots.broker?.value ?? '').toLowerCase() === 'zerodha');
check('fully-specified input asks nothing', inline.question === null, `asked ${inline.question?.field}`);

let unk = await p.intake.start('I invested in my friend\'s startup');
check('unknown asset asks for type first', unk.question?.field === 'asset_type');
unk = await p.intake.answer(unk.sessionId, 'asset_type', 'Other');
check('after type, asks for name', unk.question?.field === 'name', `got ${unk.question?.field}`);

console.log('\n[4] Copilot streaming');
const events = [];
await p.copilot.chat(null, 'How diversified am I?', (e) => events.push(e));
check('stream emits deltas', events.some((e) => e.event === 'delta'));
check('stream emits a chart block', events.some((e) => e.event === 'block' && e.block.type === 'chart'));
check('stream emits suggestions', events.some((e) => e.event === 'block' && e.block.type === 'suggestions'));
check('stream terminates with done', events.at(-1)?.event === 'done');

const ev2 = [];
await p.copilot.chat(null, 'If I invest ₹10,000 monthly for 10 years?', (e) => ev2.push(e));
const sipChart = ev2.find((e) => e.event === 'block' && e.block.type === 'chart');
check('SIP simulation returns projection chart', !!sipChart);
const lastPoint = sipChart?.block.spec.series[0].data.at(-1);
check('SIP math ≈ ₹23.2L at year 10', lastPoint && Math.abs(lastPoint.y - 2323391) / 2323391 < 0.01, `got ${lastPoint?.y}`);

const ev3 = [];
await p.copilot.chat(null, 'What are my worst performing assets?', (e) => ev3.push(e));
check('worst performers returns table', ev3.some((e) => e.event === 'block' && e.block.type === 'table'));

console.log('\n[5] Market resolver');
const found = await p.market.search('hdfc');
check('resolver finds HDFCBANK', found.some((i) => i.symbol === 'HDFCBANK'));
const quotes = await p.market.getQuotes(['HDFCBANK', 'INFY']);
check('batch quotes returned', Object.keys(quotes).length === 2);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
