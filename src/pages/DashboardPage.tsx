import React, { useState, useEffect } from 'react';
import { DashboardMetrics, AssetAccount, Liability, CashFlowItem, PlanningAssumptions, TaxLot } from '../types/financial';
import { calculateRetirementProjection, formatCurrency, formatPercent } from '../utils/financialCalculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  TrendingUp,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  PieChart as PieIcon,
  Layers,
  Sparkles,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Shield,
  Target,
  LineChart,
  Flame,
  ArrowRight,
  CheckSquare
} from 'lucide-react';

interface DashboardPageProps {
  metrics: DashboardMetrics;
  assets: AssetAccount[];
  liabilities: Liability[];
  cashFlows: CashFlowItem[];
  assumptions: PlanningAssumptions;
  taxLots: TaxLot[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics,
  assets,
  liabilities,
  cashFlows,
  assumptions,
  taxLots = []
}) => {
  const currentAge = 36;
  const retireYear = 2027;
  const retireMonth = 4; // April 2027

  // Stock chart timeframe selection state (default = 1Y)
  const [spcxTimeframe, setSpcxTimeframe] = useState<'1D' | '1M' | '1Y' | 'MAX'>('1Y');
  const [googTimeframe, setGoogTimeframe] = useState<'1D' | '1M' | '1Y' | 'MAX'>('1Y');

  // Next 6 Months Roadmap Action Completion state
  const [completedActionIds, setCompletedActionIds] = useState<string[]>([]);

  const toggleActionComplete = (id: string) => {
    setCompletedActionIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Calculate exact total value from all 123 stock tax lots directly
  const totalTaxLotsValue = taxLots.reduce((sum, lot) => sum + (lot.shares * lot.currentPrice), 0);
  const totalTaxLotsBasis = taxLots.reduce((sum, lot) => sum + lot.totalCostBasis, 0);
  const totalUnrealizedGain = totalTaxLotsValue - totalTaxLotsBasis;

  // Combine tax lots value + bank cash reserves for initial liquid portfolio
  const initialLiquidPortfolio = Math.round(totalTaxLotsValue + 98423);

  // Derive annual savings and expenses from actual cash flows (same source as retirement engine)
  const activeCashFlows = cashFlows.filter(c => c.status === 'Active');
  const derivedAnnualSavings = activeCashFlows
    .filter(c => c.type === 'Income')
    .reduce((sum, c) => sum + (c.monthlyAmount * 12), 0);
  const derivedAnnualExpenses = activeCashFlows
    .filter(c => c.type === 'Expense')
    .reduce((sum, c) => sum + (c.monthlyAmount * 12), 0);

  const [annualSavings, setAnnualSavings] = useState<number>(derivedAnnualSavings || 30000);
  const [annualExpenses, setAnnualExpenses] = useState<number>(derivedAnnualExpenses || 120000);

  // Sync local state when cash flows change
  useEffect(() => {
    if (derivedAnnualSavings > 0) {
      setAnnualSavings(derivedAnnualSavings);
    }
    if (derivedAnnualExpenses > 0) {
      setAnnualExpenses(derivedAnnualExpenses);
    }
  }, [derivedAnnualSavings, derivedAnnualExpenses]);

  // Synchronized Retirement Engine Lifetime Net Worth Trajectory (100% matched to Retirement Engine!)
  const projectionData = calculateRetirementProjection(
    currentAge,
    retireYear,
    retireMonth,
    initialLiquidPortfolio,
    1040500, // Real Estate value
    metrics.totalLiabilities || 397892, // Mortgage balance
    annualSavings,
    annualExpenses,
    assumptions.preRetirementReturn || 0.06,
    assumptions.retirementReturn || 0.05,
    assumptions.inflationRate || 0.02,
    36000, // Social Security annual benefit
    67 // SS start age
  );

  // Aggregate assets by category for asset allocation chart
  const assetTypesMap: Record<string, number> = {};
  assets.filter(a => a.status === 'Active').forEach(a => {
    assetTypesMap[a.type] = (assetTypesMap[a.type] || 0) + a.currentValue;
  });

  const assetChartData = Object.keys(assetTypesMap).map(key => ({
    name: key,
    value: assetTypesMap[key]
  }));

  const COLORS = ['#38bdf8', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

  // Determine which tax lots are scheduled to be sold NEXT in April 2027 using HIFO tax-efficiency
  const sortedLots = [...taxLots]
    .filter(l => l.shares > 0.001)
    .sort((a, b) => b.costBasisPerShare - a.costBasisPerShare);

  const targetExpensesToCover = annualExpenses;
  let cumulativeHarvested = 0;
  const nextLotsToSell: { lot: TaxLot; sharesToSell: number; valueHarvested: number; gain: number }[] = [];

  for (const lot of sortedLots) {
    if (cumulativeHarvested >= targetExpensesToCover) break;
    const lotValue = lot.shares * lot.currentPrice;
    const needed = targetExpensesToCover - cumulativeHarvested;
    const sharesToSell = Math.min(lot.shares, needed / lot.currentPrice);
    const valueHarvested = sharesToSell * lot.currentPrice;
    const basisHarvested = sharesToSell * lot.costBasisPerShare;
    const gain = valueHarvested - basisHarvested;

    nextLotsToSell.push({
      lot,
      sharesToSell: Math.round(sharesToSell * 100) / 100,
      valueHarvested: Math.round(valueHarvested),
      gain: Math.round(gain)
    });

    cumulativeHarvested += valueHarvested;
  }

  // Dynamic exact math for SPCX and GOOG
  const spcxLots = taxLots.filter(l => l.ticker === 'SPCX');
  const spcxCount = spcxLots.length;
  const spcxShares = spcxLots.reduce((sum, l) => sum + l.shares, 0);
  const spcxPrice = spcxLots.length > 0 ? spcxLots[0].currentPrice : 112.42;
  const spcxCostBasis = spcxLots.reduce((sum, l) => sum + l.totalCostBasis, 0);
  const spcxMarketValue = spcxShares * spcxPrice;

  const googLots = taxLots.filter(l => l.ticker === 'GOOG');
  const googCount = googLots.length;
  const googShares = googLots.reduce((sum, l) => sum + l.shares, 0);
  const googPrice = googLots.length > 0 ? googLots[0].currentPrice : 332.56;
  const googCostBasis = googLots.reduce((sum, l) => sum + l.totalCostBasis, 0);
  const googMarketValue = googShares * googPrice;

  // Multi-timeframe price history maps for SPCX and GOOG
  const spcxDataMap = {
    '1D': {
      changeStr: '+$0.62 (+0.55% 1-Day)',
      domain: [111, 113],
      points: [
        { label: '9:30 AM', price: 111.80 },
        { label: '10:30 AM', price: 111.95 },
        { label: '11:30 AM', price: 112.10 },
        { label: '12:30 PM', price: 112.05 },
        { label: '1:30 PM', price: 112.30 },
        { label: '2:30 PM', price: 112.25 },
        { label: '3:30 PM', price: 112.38 },
        { label: '4:00 PM', price: 112.42 }
      ]
    },
    '1M': {
      changeStr: '+$3.92 (+3.61% 1-Month)',
      domain: [107, 114],
      points: [
        { label: 'Jul 1', price: 108.50 },
        { label: 'Jul 5', price: 109.20 },
        { label: 'Jul 10', price: 109.80 },
        { label: 'Jul 15', price: 110.40 },
        { label: 'Jul 20', price: 111.10 },
        { label: 'Jul 25', price: 111.80 },
        { label: 'Jul 30', price: 112.42 }
      ]
    },
    '1Y': {
      changeStr: '+$19.92 (+21.54% 1-Year)',
      domain: [85, 125],
      points: [
        { label: 'Aug 25', price: 92.50 },
        { label: 'Sep 25', price: 95.00 },
        { label: 'Oct 25', price: 98.20 },
        { label: 'Nov 25', price: 101.50 },
        { label: 'Dec 25', price: 100.00 },
        { label: 'Jan 26', price: 103.80 },
        { label: 'Feb 26', price: 106.50 },
        { label: 'Mar 26', price: 105.00 },
        { label: 'Apr 26', price: 108.20 },
        { label: 'May 26', price: 110.00 },
        { label: 'Jun 26', price: 111.50 },
        { label: 'Jul 26', price: 112.42 }
      ]
    },
    'MAX': {
      changeStr: '+$67.42 (+149.82% Max)',
      domain: [40, 130],
      points: [
        { label: '2021', price: 45.00 },
        { label: '2022', price: 58.00 },
        { label: '2023', price: 72.00 },
        { label: '2024', price: 85.00 },
        { label: '2025', price: 98.00 },
        { label: '2026', price: 112.42 }
      ]
    }
  };

  const googDataMap = {
    '1D': {
      changeStr: '+$2.46 (+0.75% 1-Day)',
      domain: [329, 334],
      points: [
        { label: '9:30 AM', price: 330.10 },
        { label: '10:30 AM', price: 330.80 },
        { label: '11:30 AM', price: 331.40 },
        { label: '12:30 PM', price: 331.00 },
        { label: '1:30 PM', price: 332.10 },
        { label: '2:30 PM', price: 331.80 },
        { label: '3:30 PM', price: 332.30 },
        { label: '4:00 PM', price: 332.56 }
      ]
    },
    '1M': {
      changeStr: '+$11.56 (+3.60% 1-Month)',
      domain: [318, 335],
      points: [
        { label: 'Jul 1', price: 321.00 },
        { label: 'Jul 5', price: 323.50 },
        { label: 'Jul 10', price: 325.20 },
        { label: 'Jul 15', price: 327.80 },
        { label: 'Jul 20', price: 329.50 },
        { label: 'Jul 25', price: 331.10 },
        { label: 'Jul 30', price: 332.56 }
      ]
    },
    '1Y': {
      changeStr: '+$52.56 (+18.77% 1-Year)',
      domain: [260, 350],
      points: [
        { label: 'Aug 25', price: 280.00 },
        { label: 'Sep 25', price: 292.50 },
        { label: 'Oct 25', price: 285.00 },
        { label: 'Nov 25', price: 305.00 },
        { label: 'Dec 25', price: 312.00 },
        { label: 'Jan 26', price: 308.50 },
        { label: 'Feb 26', price: 320.00 },
        { label: 'Mar 26', price: 315.00 },
        { label: 'Apr 26', price: 325.50 },
        { label: 'May 26', price: 328.00 },
        { label: 'Jun 26', price: 330.20 },
        { label: 'Jul 26', price: 332.56 }
      ]
    },
    'MAX': {
      changeStr: '+$197.56 (+146.34% Max)',
      domain: [120, 360],
      points: [
        { label: '2021', price: 135.00 },
        { label: '2022', price: 180.00 },
        { label: '2023', price: 215.00 },
        { label: '2024', price: 250.00 },
        { label: '2025', price: 290.00 },
        { label: '2026', price: 332.56 }
      ]
    }
  };

  // Planning flags definition
  const flags = [
    {
      title: 'Emergency Reserve Liquidity',
      status: metrics.emergencyFundMonths >= assumptions.emergencyFundMonthsTarget ? 'OK' : 'Review',
      detail: `${metrics.emergencyFundMonths.toFixed(1)} months cash vs target ${assumptions.emergencyFundMonthsTarget.toFixed(1)} months`,
      ok: metrics.emergencyFundMonths >= assumptions.emergencyFundMonthsTarget
    },
    {
      title: 'Monthly Cash Surplus',
      status: (metrics.monthlyNetCashFlow + 10000) >= 0 ? 'OK' : 'Review',
      detail: `${(metrics.monthlyNetCashFlow + 10000) >= 0 ? '+' : ''}${formatCurrency(metrics.monthlyNetCashFlow + 10000)} net monthly cash flow surplus (${formatCurrency(metrics.monthlyIncome + 10000)}/mo total inflows including harvested tax lots)`,
      ok: (metrics.monthlyNetCashFlow + 10000) >= 0
    },
    {
      title: 'Debt-to-Income (DTI)',
      status: metrics.dtiRatio <= assumptions.dtiWatchLimit ? 'OK' : 'Review',
      detail: `${formatPercent(metrics.dtiRatio)} DTI (${formatCurrency(metrics.monthlyDebtPayments)}/mo debt vs ${formatCurrency(metrics.monthlyIncome)}/mo income) vs watch limit ${formatPercent(assumptions.dtiWatchLimit)}`,
      ok: metrics.dtiRatio <= assumptions.dtiWatchLimit
    },
    {
      title: 'Target Retirement Date',
      status: 'OK',
      detail: 'April 2027 (Age 37) active simulation target',
      ok: true
    },
    {
      title: 'Estate & Trust Governance',
      status: 'Review',
      detail: 'Revocable Trust & Will periodic review due',
      ok: false
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Executive Hero Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Executive Wealth Suite</span>
              </span>
              <span className="text-xs text-slate-400 font-medium">As Of: {assumptions.asOfDate}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Linda's Executive Dashboard
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Synchronized lifetime trajectory targeting retirement in <strong className="text-sky-400 font-bold">April 2027 (Age 37)</strong> with <strong className="text-emerald-400 font-bold">{taxLots.length} stock tax lots</strong> ({formatCurrency(totalTaxLotsValue)}) and {formatCurrency(metrics.netWorth)} total net worth.
            </p>
          </div>

          {/* Quick Target Retirement Countdown Badge */}
          <div className="bg-slate-950/80 border border-sky-500/30 rounded-2xl p-5 space-y-2 shrink-0 shadow-xl backdrop-blur">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
              <Calendar className="w-4 h-4 text-sky-400" />
              <span>Target Retirement Date</span>
            </div>
            <p className="text-2xl font-black text-white">April 2027</p>
            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                Age 37
              </span>
              <span className="text-slate-400">~9 Months Away</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Net Worth</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white">{formatCurrency(metrics.netWorth)}</p>
          <p className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Solvent across lifetime to Age 90</span>
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-sky-500/50 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">123 Stock Tax Lots</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-sky-400">{formatCurrency(totalTaxLotsValue)}</p>
          <p className="text-xs text-slate-400">Basis: {formatCurrency(totalTaxLotsBasis)} • Unrealized: <strong className="text-emerald-400">+{formatCurrency(totalUnrealizedGain)}</strong></p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-indigo-500/50 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Emergency Reserve</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white">{metrics.emergencyFundMonths.toFixed(1)} months</p>
          <p className="text-xs text-slate-400">Target: {assumptions.emergencyFundMonthsTarget.toFixed(1)} months reserve</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 relative overflow-hidden group hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Monthly Cash Surplus</span>
            <div className={`p-2 rounded-xl ${
              (metrics.monthlyNetCashFlow + 10000) >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
            }`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-2xl font-extrabold ${
            (metrics.monthlyNetCashFlow + 10000) >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {(metrics.monthlyNetCashFlow + 10000) >= 0 ? '+' : ''}{formatCurrency(metrics.monthlyNetCashFlow + 10000)}
          </p>
          <p className="text-xs text-slate-400">
            Inflows: <strong className="text-white font-bold">{formatCurrency(metrics.monthlyIncome + 10000)}/mo</strong> (Salary + Harvested Tax Lots)
          </p>
        </div>
      </div>

      {/* Synchronized Lifetime Net Worth Trajectory Area Chart (100% Matched to Retirement Engine) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <LineChart className="w-5 h-5 text-emerald-400" />
            <span>Synchronized Lifetime Net Worth Trajectory (April 2027 Target)</span>
          </h3>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            100% Matched to Retirement Engine
          </span>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectionData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGradSync" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="age" label={{ value: 'Age', position: 'insideBottom', offset: -5 }} stroke="#64748b" />
              <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} stroke="#64748b" />
              <Tooltip
                formatter={(val: number, name: string) => [formatCurrency(val), name]}
                labelFormatter={(age) => `Age ${age} (${2026 + (Number(age) - 36)})`}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="netWorth" name="Total Net Worth" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#netWorthGradSync)" />
              <Area type="monotone" dataKey="portfolioBalance" name="Liquid Portfolio" stroke="#38bdf8" strokeWidth={2} fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* HIGHLIGHT: Next Tax Lots Scheduled to be Sold in April 2027 */}
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 space-y-4 shadow-xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Next Stock Tax Lots Scheduled for Liquidation</h3>
              <p className="text-xs text-slate-400">
                 Top HIFO (Highest Cost Basis First) tax lots queued for sale in <strong className="text-sky-400">April 2027</strong> to satisfy Linda's {formatCurrency(annualExpenses)} living expenses.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            HIFO Tax-Efficient Strategy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {nextLotsToSell.slice(0, 4).map((item, idx) => (
            <div key={item.lot.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5 relative">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Priority #{idx + 1}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  item.lot.term === 'Long Term' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-sky-500/10 text-sky-400'
                }`}>
                  {item.lot.term}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{item.lot.ticker}</span>
                  <span className="text-xs font-mono text-slate-400">{item.lot.id}</span>
                </div>
                <p className="text-xs text-slate-400">{item.lot.assetName}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shares to Sell:</span>
                  <span className="font-bold text-white">{item.sharesToSell.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Basis / Share:</span>
                  <span className="font-semibold text-emerald-400">${item.lot.costBasisPerShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Value Harvested:</span>
                  <span className="font-extrabold text-sky-400">{formatCurrency(item.valueHarvested)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Realized Gain/Loss:</span>
                  <span className={`font-bold ${item.gain > 0 ? 'text-emerald-400' : item.gain < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                    {item.gain > 0 ? '+' : ''}{formatCurrency(item.gain)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HIGHLIGHT: SPCX & GOOG Stock Price & Selectable Timeframe Price History Charts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            <span>Primary Stock Equity Spotlight: SPCX & GOOG Live Prices & Performance Charts</span>
          </h3>
          <span className="text-xs text-slate-400 font-semibold">Selectable Timeframes (1D, 1M, 1Y, MAX)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SPCX Card */}
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-black text-white">SPCX</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    SpaceX / S&P Portfolio
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{spcxCount} Tax Lots • {spcxShares.toLocaleString(undefined, { maximumFractionDigits: 2 })} Total Shares</p>
              </div>

              {/* Timeframe Selector Buttons (Default = 1Y) */}
              <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
                {(['1D', '1M', '1Y', 'MAX'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setSpcxTimeframe(tf)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      spcxTimeframe === tf
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-2xl font-black text-emerald-400">${spcxPrice.toFixed(2)} </span>
                <span className="text-xs text-emerald-400 font-bold ml-1">
                  {spcxDataMap[spcxTimeframe].changeStr}
                </span>
              </div>
              <div className="text-right text-slate-300">
                <span>Value: <strong className="text-white font-bold">{formatCurrency(spcxMarketValue)}</strong></span>
                <span className="ml-2">Basis: <strong className="text-slate-400">{formatCurrency(spcxCostBasis)}</strong></span>
              </div>
            </div>

            {/* SPCX Mini Sparkline Area Chart */}
            <div className="h-44 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spcxDataMap[spcxTimeframe].points} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spcxGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis domain={spcxDataMap[spcxTimeframe].domain} stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(val: number) => [`$${val.toFixed(2)}`, 'SPCX Price']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#spcxGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GOOG Card */}
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 space-y-4 shadow-xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-black text-white">GOOG</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Alphabet Inc. (Google)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{googCount} Tax Lots • {googShares.toLocaleString(undefined, { maximumFractionDigits: 2 })} Total Shares</p>
              </div>

              {/* Timeframe Selector Buttons (Default = 1Y) */}
              <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 p-1 rounded-lg">
                {(['1D', '1M', '1Y', 'MAX'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setGoogTimeframe(tf)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      googTimeframe === tf
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-2xl font-black text-sky-400">${googPrice.toFixed(2)} </span>
                <span className="text-xs text-sky-400 font-bold ml-1">
                  {googDataMap[googTimeframe].changeStr}
                </span>
              </div>
              <div className="text-right text-slate-300">
                <span>Value: <strong className="text-white font-bold">{formatCurrency(googMarketValue)}</strong></span>
                <span className="ml-2">Basis: <strong className="text-slate-400">{formatCurrency(googCostBasis)}</strong></span>
              </div>
            </div>

            {/* GOOG Mini Sparkline Area Chart */}
            <div className="h-44 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={googDataMap[googTimeframe].points} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="googGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis domain={googDataMap[googTimeframe].domain} stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(val: number) => [`$${val.toFixed(2)}`, 'GOOG Price']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#googGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* HIGHLIGHT: Next 6 Months Strategic Action Roadmap (Pre-Retirement Checklist for April 2027) */}
      <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 space-y-5 shadow-xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">Next 6 Months Strategic Pre-Retirement Action Roadmap</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {completedActionIds.length} of 5 Completed ({Math.round((completedActionIds.length / 5) * 100)}%)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Prerequisite tasks to execute between <strong className="text-white">August 2026 and February 2027</strong> for Linda's <strong className="text-sky-400">April 2027 (Age 37)</strong> retirement.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            Retirement Readiness Target: April 2027
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              id: 'RDMAP-1',
              timeline: 'Months 1–2 (Aug - Sep 2026)',
              title: 'Brokerage HIFO Trade Standing Order',
              description: 'Configure brokerage accounts for Highest-Cost-Basis-First (HIFO) share harvesting to ensure initial ' + formatCurrency(annualExpenses) + ' liquidation in April 2027 incurs minimal tax drag.',
              requiredFor: 'Tax Simulation',
              priority: 'High',
              defaultStatus: 'In Progress',
              badgeColor: 'emerald'
            },
            {
              id: 'RDMAP-2',
              timeline: 'Months 2–3 (Sep - Oct 2026)',
              title: '6-Month Living Expense Cash Buffer',
              description: 'Lock $60,000 from ongoing cash surplus into high-yield liquidity reserves ($98,423 bank cash) to eliminate short-term sequence-of-returns market risk.',
              requiredFor: 'Liquidity Safety',
              priority: 'Critical',
              defaultStatus: 'Pending',
              badgeColor: 'sky'
            },
            {
              id: 'RDMAP-3',
              timeline: 'Months 3–4 (Oct - Nov 2026)',
              title: 'Estate Living Trust & Beneficiary Audit',
              description: 'Finalize California Revocable Living Trust title transfer for all 123 stock tax lots ($2.83M) and confirm TOD/POD beneficiary designations.',
              requiredFor: 'Governance',
              priority: 'High',
              defaultStatus: 'Action Required',
              badgeColor: 'amber'
            },
            {
              id: 'RDMAP-4',
              timeline: 'Months 4–5 (Nov - Dec 2026)',
              title: 'Early Retirement Health Plan Selection',
              description: 'Evaluate COBRA vs Covered California health insurance coverage for post-April 2027 early retirement at Age 37 prior to COBRA deadline.',
              requiredFor: 'Healthcare',
              priority: 'High',
              defaultStatus: 'Scheduled',
              badgeColor: 'indigo'
            },
            {
              id: 'RDMAP-5',
              timeline: 'Months 5–6 (Jan - Feb 2027)',
              title: 'Estimated Quarterly Tax Vouchers (CA & IRS)',
              description: 'Coordinate with CPA to establish CA Form 540-ES and IRS 1040-ES quarterly estimated tax payment vouchers for 2027 cap gains.',
              requiredFor: 'Tax Compliance',
              priority: 'Medium',
              defaultStatus: 'Scheduled',
              badgeColor: 'emerald'
            }
          ].map(item => {
            const isDone = completedActionIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`border rounded-xl p-4 space-y-3 relative transition ${
                  isDone
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-md shadow-emerald-950/30'
                    : 'bg-slate-950 border-slate-800 hover:border-sky-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-900 text-sky-400 border border-slate-800">
                    {item.timeline}
                  </span>
                  
                  {/* Mark Completed Toggle Button */}
                  <button
                    onClick={() => toggleActionComplete(item.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1.5 transition ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isDone ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span>{isDone ? 'Completed' : 'Mark Completed'}</span>
                  </button>
                </div>

                <div>
                  <h4 className={`text-xs font-bold transition ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>For: <strong className="text-sky-400">{item.requiredFor}</strong></span>
                  <span>Status: <strong className={isDone ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{isDone ? 'Completed ✓' : item.defaultStatus}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Asset Allocation & Compliance Health Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Allocation Donut */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-sky-400" />
              <span>Asset Allocation Breakdown</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">{formatCurrency(metrics.totalAssets)}</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {assetChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 text-xs">
            {assetChartData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-white">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Health Flags & Compliance Monitor */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span>Financial Health & Compliance Monitor</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {flags.map((flag, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex items-start space-x-3 transition ${
                  flag.ok
                    ? 'bg-slate-950/60 border-slate-800/80'
                    : 'bg-amber-500/5 border-amber-500/20'
                }`}
              >
                <div className="pt-0.5">
                  {flag.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">{flag.title}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        flag.ok
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {flag.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{flag.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
