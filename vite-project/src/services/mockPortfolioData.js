/**
 * useMockPortfolio — stub hook that returns realistic mock data
 * so the UI works without a live API.
 *
 * Assets added in this session (e.g. via "Add with AI") are merged in
 * from portfolioAssetsStore so they appear immediately.
 */
import { usePortfolioAssetsStore } from '../stores/portfolioAssetsStore';

export function useMockPortfolio() {
  const addedAssets = usePortfolioAssetsStore((s) => s.addedAssets);
  const removedIds = usePortfolioAssetsStore((s) => s.removedIds);
  const summary = {
    total_invested: 785000,
    total_current_value: 1023750,
    total_gain_loss: 238750,
    roi_percent: 30.41,
    allocation_by_asset_class: {
      Stocks:        { value: 380000, percent: '37.1%' },
      'Mutual Funds':{ value: 215000, percent: '21.0%' },
      Gold:          { value: 128000, percent: '12.5%' },
      'Real Estate': { value: 210000, percent: '20.5%' },
      Bonds:         { value: 55000,  percent: '5.4%' },
      'Fixed Deposits': { value: 35750, percent: '3.5%' },
    },
    asset_class_breakdown: [
      { asset_type:'STOCK',       label:'Stocks',         count:6,  invested:280000, current_value:380000, gain_loss:100000, roi_percent:35.71 },
      { asset_type:'MF',          label:'Mutual Funds',   count:4,  invested:180000, current_value:215000, gain_loss:35000,  roi_percent:19.44 },
      { asset_type:'GOLD',        label:'Gold',           count:3,  invested:95000,  current_value:128000, gain_loss:33000,  roi_percent:34.74 },
      { asset_type:'REAL_ESTATE', label:'Real Estate',    count:1,  invested:180000, current_value:210000, gain_loss:30000,  roi_percent:16.67 },
      { asset_type:'BOND',        label:'Bonds',          count:2,  invested:50000,  current_value:55000,  gain_loss:5000,   roi_percent:10.00 },
      { asset_type:'FD',          label:'Fixed Deposits', count:1,  invested:32750,  current_value:35750,  gain_loss:3000,   roi_percent:9.16 },
    ],
    top_gainers: [
      { name: 'HDFCBANK', roi_percent: 42.5, gain_loss: 34000 },
      { name: 'Gold 22K 10g', roi_percent: 38.2, gain_loss: 21000 },
      { name: 'UTI Nifty 50', roi_percent: 34.1, gain_loss: 18500 },
    ],
    top_losers: [
      { name: 'RELIANCE', roi_percent: -8.2, gain_loss: -12000 },
      { name: 'Parag Parikh FC', roi_percent: -3.1, gain_loss: -4200 },
    ],
    last_updated: new Date().toISOString(),
  };

  const assets = [
    { asset_id:'a1', asset_type:'STOCK',  asset_name:'HDFC Bank', quantity:50,     purchase_price:1580, purchase_value:79000, purchase_date:'2024-06-15', current_price:1740, current_value:87000, gain_loss:8000, roi_percent:10.13 },
    { asset_id:'a2', asset_type:'STOCK',  asset_name:'Infosys',   quantity:30,     purchase_price:1450, purchase_value:43500, purchase_date:'2024-03-10', current_price:1890, current_value:56700, gain_loss:13200, roi_percent:30.34 },
    { asset_id:'a3', asset_type:'STOCK',  asset_name:'Reliance',  quantity:20,     purchase_price:2900, purchase_value:58000, purchase_date:'2025-01-20', current_price:2662, current_value:53240, gain_loss:-4760, roi_percent:-8.21 },
    { asset_id:'a4', asset_type:'MF',     asset_name:'Parag Parikh Flexi Cap', quantity:350, purchase_price:86.4, purchase_value:30240, purchase_date:'2024-01-10', current_price:83.7, current_value:29295, gain_loss:-945, roi_percent:-3.12 },
    { asset_id:'a5', asset_type:'MF',     asset_name:'UTI Nifty 50 Index', quantity:420, purchase_price:115.2, purchase_value:48384, purchase_date:'2023-06-01', current_price:154.3, current_value:64806, gain_loss:16422, roi_percent:33.94 },
    { asset_id:'a6', asset_type:'GOLD',   asset_name:'Gold 22K — 10g', quantity:10, purchase_price:5500, purchase_value:55000, purchase_date:'2022-11-05', current_price:8350, current_value:83500, gain_loss:28500, roi_percent:51.82 },
    { asset_id:'a7', asset_type:'FD',     asset_name:'SBI FD — 1 Year', quantity:1, purchase_price:100000, purchase_value:100000, purchase_date:'2026-01-15', current_price:100000, current_value:100000, gain_loss:0, roi_percent:0 },
    { asset_id:'a8', asset_type:'BOND',   asset_name:'GOI 7.26% 2033', quantity:5, purchase_price:10000, purchase_value:50000, purchase_date:'2025-03-20', current_price:10450, current_value:52250, gain_loss:2250, roi_percent:4.5 },
    { asset_id:'a9', asset_type:'REAL_ESTATE', asset_name:'2BHK Flat, Hyderabad', quantity:1, purchase_price:3500000, purchase_value:3500000, purchase_date:'2022-08-15', current_price:4200000, current_value:4200000, gain_loss:700000, roi_percent:20.0 },
  ];

  const performance = {
    dates: Array.from({ length: 12 }, (_, i) => {
      const d = new Date('2025-08-01');
      d.setMonth(d.getMonth() + i);
      return d.toISOString().split('T')[0];
    }),
    values: [680000, 700000, 720000, 695000, 740000, 760000, 755000, 800000, 850000, 920000, 980000, 1023750],
    invested_amounts: Array(12).fill(785000),
  };

  // Merge session-added assets, drop session-deleted ones, adjust totals.
  const kept = assets.filter((a) => !removedIds.includes(a.asset_id));
  const allAssets = [...kept, ...addedAssets];
  if (addedAssets.length > 0 || removedIds.length > 0) {
    const removed = assets.filter((a) => removedIds.includes(a.asset_id));
    summary.total_invested += addedAssets.reduce((s, a) => s + a.purchase_value, 0)
      - removed.reduce((s, a) => s + a.purchase_value, 0);
    summary.total_current_value += addedAssets.reduce((s, a) => s + a.current_value, 0)
      - removed.reduce((s, a) => s + a.current_value, 0);
    summary.total_gain_loss = summary.total_current_value - summary.total_invested;
    summary.roi_percent = summary.total_invested > 0
      ? (summary.total_gain_loss / summary.total_invested) * 100
      : 0;
  }

  return { summary, assets: allAssets, performance, loading: false, error: null };
}
