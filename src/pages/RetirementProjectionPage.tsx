import React, { useState, useEffect } from 'react';
import { PlanningAssumptions, DashboardMetrics, TaxLot, CashFlowItem } from '../types/financial';
import { calculateRetirementProjection, formatCurrency, formatPercent } from '../utils/financialCalculations';
import { runLifetimeTaxSimulation } from '../utils/taxSimulator';
import { LineChart as ReLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { LineChart, Calendar, TrendingUp, Layers, ChevronDown, ChevronUp, ShieldCheck, Sparkles, Calculator, CheckCircle2 } from 'lucide-react';

interface RetirementProjectionPageProps {
  assumptions: PlanningAssumptions;
  metrics: DashboardMetrics;
  taxLots: TaxLot[];
  cashFlows: CashFlowItem[];
}

export const RetirementProjectionPage: React.FC<RetirementProjectionPageProps> = ({ assumptions, metrics, taxLots = [], cashFlows = [] }) => {
  const currentAge = 36;
  const startYear = 2026;

  // Linda's default target: April 2027
  const [retireYear, setRetireYear] = useState<number>(2027);
  const [retireMonth, setRetireMonth] = useState<number>(4); // 4 = April

  // Calculate exact total value from all 123 stock tax lots directly
  const totalTaxLotsValue = taxLots.reduce((sum, lot) => sum + (lot.shares * lot.currentPrice), 0);
  const totalTaxLotsBasis = taxLots.reduce((sum, lot) => sum + lot.totalCostBasis, 0);
  const totalUnrealizedGain = totalTaxLotsValue - totalTaxLotsBasis;

  // Combine tax lots value + bank cash reserves
  const initialLiquidPortfolio = Math.round(totalTaxLotsValue + 98423);

  const [liquidPortfolio, setLiquidPortfolio] = useState<number>(initialLiquidPortfolio);
  const [realEstateVal, setRealEstateVal] = useState<number>(1040500);
  const [mortgageBalance, setMortgageBalance] = useState<number>(metrics.totalLiabilities || 397892);

  // Derive annual savings and expenses from actual cash flows
  const activeCashFlows = cashFlows.filter(c => c.status === 'Active');
  const derivedAnnualSavings = activeCashFlows
    .filter(c => c.type === 'Income')
    .reduce((sum, c) => sum + (c.monthlyAmount * 12), 0);
  const derivedAnnualExpenses = activeCashFlows
    .filter(c => c.type === 'Expense')
    .reduce((sum, c) => sum + (c.monthlyAmount * 12), 0);

  const [annualSavings, setAnnualSavings] = useState<number>(derivedAnnualSavings || 30000);
  const [annualExpenses, setAnnualExpenses] = useState<number>(derivedAnnualExpenses || 120000);
  const [preReturn, setPreReturn] = useState<number>(assumptions.preRetirementReturn || 0.06);
  const [postReturn, setPostReturn] = useState<number>(assumptions.retirementReturn || 0.05);
  const [inflation, setInflation] = useState<number>(assumptions.inflationRate || 0.02);
  const [ssStartAge, setSsStartAge] = useState<number>(67);
  const [ssMonthlyBenefit, setSsMonthlyBenefit] = useState<number>(3000);

  const [showLotsDrawer, setShowLotsDrawer] = useState<boolean>(false);

  useEffect(() => {
    setLiquidPortfolio(initialLiquidPortfolio);
  }, [initialLiquidPortfolio]);

  // Sync local state when cash flows change
  useEffect(() => {
    if (derivedAnnualSavings > 0) {
      setAnnualSavings(derivedAnnualSavings);
    }
    if (derivedAnnualExpenses > 0) {
      setAnnualExpenses(derivedAnnualExpenses);
    }
  }, [derivedAnnualSavings, derivedAnnualExpenses]);

  const monthsMap = [
    { num: 1, name: 'January' },
    { num: 2, name: 'February' },
    { num: 3, name: 'March' },
    { num: 4, name: 'April' },
    { num: 5, name: 'May' },
    { num: 6, name: 'June' },
    { num: 7, name: 'July' },
    { num: 8, name: 'August' },
    { num: 9, name: 'September' },
    { num: 10, name: 'October' },
    { num: 11, name: 'November' },
    { num: 12, name: 'December' }
  ];

  const projectionData = calculateRetirementProjection(
    currentAge,
    retireYear,
    retireMonth,
    liquidPortfolio,
    realEstateVal,
    mortgageBalance,
    annualSavings,
    annualExpenses,
    preReturn,
    postReturn,
    inflation,
    ssMonthlyBenefit * 12,
    ssStartAge
  );

  const retirementPoint = projectionData.find(p => p.year === retireYear) || projectionData[0];
  const age60Point = projectionData.find(p => p.age === 60) || projectionData[0];
  const age75Point = projectionData.find(p => p.age === 75) || projectionData[0];
  const age90Point = projectionData[projectionData.length - 1];

  const isApril2027 = retireYear === 2027 && retireMonth === 4;

  // Group active tax lots by ticker for summary badges (filters out 0 lot tickers)
  const tickersSummary = Array.from(new Set(taxLots.map(l => l.ticker)))
    .map(ticker => {
      const lots = taxLots.filter(l => l.ticker === ticker);
      const value = lots.reduce((sum, l) => sum + (l.shares * l.currentPrice), 0);
      const shares = lots.reduce((sum, l) => sum + l.shares, 0);
      return { ticker, value, count: lots.length, shares };
    })
    .filter(t => t.count > 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Preset Quick Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lifetime Net Worth & Retirement Projection</h1>
          <p className="text-sm text-slate-400 mt-1">
            Incorporates all <strong className="text-emerald-400">{taxLots.length} authentic stock tax lots</strong> ({formatCurrency(totalTaxLotsValue)}) directly into Linda's net worth trajectory.
          </p>
          <p className="text-xs text-sky-400 font-semibold mt-1 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 inline" />
            <span>Living expenses compound annually with inflation ({formatPercent(inflation)}/yr), starting at {formatCurrency(annualExpenses)} in 2026.</span>
          </p>
        </div>

        {/* Quick Date Presets */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl shrink-0">
          <button
            onClick={() => { setRetireYear(2027); setRetireMonth(4); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              isApril2027
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎯 April 2027 (Linda's Target)
          </button>
          <button
            onClick={() => { setRetireYear(2030); setRetireMonth(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              retireYear === 2030
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Jan 2030 (Age 40)
          </button>
          <button
            onClick={() => { setRetireYear(2045); setRetireMonth(5); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              retireYear === 2045
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            May 2045 (Age 55)
          </button>
        </div>
      </div>

      {/* 123 Stock Tax Lots Integration Banner */}
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">All {taxLots.length} Stock Tax Lots Active in Engine</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {formatCurrency(totalTaxLotsValue)} Total Equity
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cost Basis: {formatCurrency(totalTaxLotsBasis)} • Unrealized Capital Gain: <span className="text-emerald-400 font-semibold">+{formatCurrency(totalUnrealizedGain)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              {tickersSummary.map(t => (
                <div key={t.ticker} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                  <span className="font-bold text-sky-400">{t.ticker}: </span>
                  <span className="text-slate-200">{formatCurrency(t.value)}</span>
                  <span className="text-slate-500 text-[10px]"> ({t.count} lots)</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowLotsDrawer(!showLotsDrawer)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1 transition"
            >
              <span>{showLotsDrawer ? 'Hide Lots' : 'View All 123 Lots'}</span>
              {showLotsDrawer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Drawer showing all 123 Lots */}
        {showLotsDrawer && (
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">Detailed 123 Tax Lot Register Contributing to Net Worth</span>
              <span>Total 123 Lots</span>
            </div>
            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Lot ID</th>
                    <th className="py-2 px-3">Ticker</th>
                    <th className="py-2 px-3">Term</th>
                    <th className="py-2 px-3">Shares</th>
                    <th className="py-2 px-3">Cost Basis / Share</th>
                    <th className="py-2 px-3">Current Price</th>
                    <th className="py-2 px-3">Total Value</th>
                    <th className="py-2 px-3">Unrealized Gain/Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {taxLots.map(lot => {
                    const lotVal = lot.shares * lot.currentPrice;
                    const gain = lotVal - lot.totalCostBasis;
                    return (
                      <tr key={lot.id} className="hover:bg-slate-900/60">
                        <td className="py-1.5 px-3 font-mono text-slate-400">{lot.id}</td>
                        <td className="py-1.5 px-3 font-bold text-sky-400">{lot.ticker}</td>
                        <td className="py-1.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            lot.term === 'Long Term' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {lot.term}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-white font-medium">{lot.shares.toLocaleString()}</td>
                        <td className="py-1.5 px-3">${lot.costBasisPerShare.toFixed(2)}</td>
                        <td className="py-1.5 px-3">${lot.currentPrice.toFixed(2)}</td>
                        <td className="py-1.5 px-3 font-bold text-white">{formatCurrency(lotVal)}</td>
                        <td className={`py-1.5 px-3 font-bold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {gain >= 0 ? '+' : ''}{formatCurrency(gain)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Target Retirement Date Control Panel */}
      <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 space-y-6 shadow-xl bg-gradient-to-b from-slate-900 via-slate-900 to-sky-950/20">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Adjust Retirement Date & Trajectory Parameters</h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Selected Date: {monthsMap.find(m => m.num === retireMonth)?.name} {retireYear} (Age {(retireYear - startYear + currentAge)})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
          {/* Retirement Month */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Retirement Target Month</label>
            <select
              value={retireMonth}
              onChange={e => setRetireMonth(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold text-sm focus:outline-none focus:border-sky-500"
            >
              {monthsMap.map(m => (
                <option key={m.num} value={m.num}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Retirement Year */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Retirement Target Year</label>
            <select
              value={retireYear}
              onChange={e => setRetireYear(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-bold text-sm focus:outline-none focus:border-sky-500"
            >
              {Array.from({ length: 30 }, (_, i) => 2026 + i).map(year => (
                <option key={year} value={year}>{year} (Age {year - startYear + currentAge})</option>
              ))}
            </select>
          </div>

          {/* Desired Living Expenses */}
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-400">Desired Annual Expenses</span>
              <span className="text-amber-400 font-bold">{formatCurrency(annualExpenses)}/yr</span>
            </div>
            <input
              type="range"
              min="40000"
              max="250000"
              step="5000"
              value={annualExpenses}
              onChange={e => setAnnualExpenses(Number(e.target.value))}
              className="w-full accent-amber-500 bg-slate-950 rounded-lg h-2"
            />
          </div>

          {/* Annual Savings Until Retirement */}
          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-400">Annual Pre-Retirement Savings</span>
              <span className="text-emerald-400 font-bold">{formatCurrency(annualSavings)}/yr</span>
            </div>
            <input
              type="range"
              min="0"
              max="100000"
              step="5000"
              value={annualSavings}
              onChange={e => setAnnualSavings(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-950 rounded-lg h-2"
            />
          </div>
        </div>
      </div>

      {/* Key Milestone Lifetime Net Worth Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Net Worth at Retirement ({monthsMap.find(m => m.num === retireMonth)?.name} {retireYear})
          </p>
          <p className="text-2xl font-extrabold text-emerald-400">{formatCurrency(retirementPoint.netWorth)}</p>
          <p className="text-[11px] text-slate-400">Liquid Portfolio: {formatCurrency(retirementPoint.portfolioBalance)}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Net Worth at Age 60 (Year 2050)</p>
          <p className="text-2xl font-extrabold text-sky-400">{formatCurrency(age60Point.netWorth)}</p>
          <p className="text-[11px] text-slate-400">Liquid Portfolio: {formatCurrency(age60Point.portfolioBalance)}</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Net Worth at Age 75 (Year 2065)</p>
          <p className="text-2xl font-extrabold text-indigo-300">{formatCurrency(age75Point.netWorth)}</p>
          <p className="text-[11px] text-slate-400">Includes Social Security @ Age 67</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1 bg-gradient-to-br from-slate-900 to-sky-950/40">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Legacy Net Worth at Age 90 (Year 2080)</p>
          <p className={`text-2xl font-extrabold ${age90Point.netWorth > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(age90Point.netWorth)}
          </p>
          <p className="text-[11px] text-emerald-300 font-medium">
            {age90Point.netWorth > 0 ? 'Fully solvent over entire lifetime' : 'Portfolio depleted before age 90'}
          </p>
        </div>
      </div>

      {/* Main Lifetime Net Worth Trajectory Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <LineChart className="w-5 h-5 text-sky-400" />
            <span>Linda's Lifetime Net Worth Trajectory Chart (2026 to 2080)</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Retirement Target: {monthsMap.find(m => m.num === retireMonth)?.name} {retireYear}
          </span>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={projectionData} margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="age" label={{ value: 'Age', position: 'insideBottom', offset: -5 }} stroke="#64748b" />
              <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} stroke="#64748b" />
              <Tooltip
                formatter={(val: number, name: string) => [formatCurrency(val), name]}
                labelFormatter={(age) => `Age ${age} (${2026 + (Number(age) - 36)})`}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
              />
              <Legend />
              <Line name="Total Net Worth" type="monotone" dataKey="netWorth" stroke="#10b981" strokeWidth={3.5} dot={false} />
              <Line name="Liquid Investment Portfolio" type="monotone" dataKey="portfolioBalance" stroke="#38bdf8" strokeWidth={2} dot={false} />
              <Line name="Real Estate Equity" type="monotone" dataKey="realEstateEquity" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </ReLineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Lifetime Net Worth Schedule Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-sky-400" />
            <span>Lifetime Net Worth & Portfolio Schedule (Age 36 to 90)</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">55 Total Projection Years</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Year & Month</th>
                <th className="py-3 px-4">Age</th>
                <th className="py-3 px-4">Phase</th>
                <th className="py-3 px-4 text-right">Beginning Liquid Assets</th>
                <th className="py-3 px-4 text-right">Annual Cash Flow</th>
                <th className="py-3 px-4 text-right">Expected Investment Gain</th>
                <th className="py-3 px-4 text-right">Ending Liquid Assets</th>
                <th className="py-3 px-4 text-right">Real Estate Equity</th>
                <th className="py-3 px-4 text-right">Total Net Worth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {projectionData.map((pt, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-slate-800/40 transition ${
                    pt.year === retireYear ? 'bg-sky-950/40 border-l-4 border-sky-400 font-bold' : ''
                  }`}
                >
                  <td className="py-2.5 px-4 font-semibold text-slate-300">
                    {pt.year} {pt.month ? `(${pt.month})` : ''}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-white">Age {pt.age}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        pt.phase === 'Accumulation'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {pt.phase}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-slate-300">{formatCurrency(pt.beginningLiquidBalance)}</td>
                  <td className="py-2.5 px-4 text-right">
                    {pt.annualContribution > 0 ? (
                      <span className="text-emerald-400 font-medium">+{formatCurrency(pt.annualContribution)}</span>
                    ) : pt.annualWithdrawal > 0 ? (
                      <span className="text-rose-400 font-medium">-{formatCurrency(pt.annualWithdrawal)}</span>
                    ) : (
                      <span className="text-slate-400">$0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-400">+{formatCurrency(pt.investmentGrowth)}</td>
                  <td className="py-2.5 px-4 text-right font-extrabold text-sky-400">{formatCurrency(pt.endingLiquidBalance)}</td>
                  <td className="py-2.5 px-4 text-right text-indigo-300">{formatCurrency(pt.realEstateEquity)}</td>
                  <td className="py-2.5 px-4 text-right font-black text-emerald-400">{formatCurrency(pt.netWorth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated Annual Tax Lot Liquidations Matching Expenses Exactly */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <span>Simulated Tax Lot Sales to Match Expenses Exactly (Federal & CA Tax Drag)</span>
          </h3>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            HIFO / Tax-Efficient Liquidations
          </span>
        </div>

        <p className="text-xs text-slate-400">
          In each year of retirement starting <strong className="text-sky-400">April 2027</strong>, specific stock tax lots are selected and sold to produce the exact net cash required for Linda's living expenses ({formatCurrency(annualExpenses)}/yr).
        </p>

        <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4">Age</th>
                <th className="py-3 px-4">Net Cash Needed (Expenses)</th>
                <th className="py-3 px-4">Gross Harvested</th>
                <th className="py-3 px-4">Realized LT Gain</th>
                <th className="py-3 px-4">Federal Tax</th>
                <th className="py-3 px-4">California Tax</th>
                <th className="py-3 px-4">Total Tax Drag</th>
                <th className="py-3 px-4">Remaining Lots</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {runLifetimeTaxSimulation(taxLots, currentAge, retireYear, retireMonth, annualExpenses, inflation, ssMonthlyBenefit * 12, ssStartAge)
                .filter(p => p.phase === 'Retirement')
                .map((tPt, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-4 font-semibold text-slate-300">{tPt.year}</td>
                    <td className="py-2.5 px-4 font-bold text-white">Age {tPt.age}</td>
                    <td className="py-2.5 px-4 font-extrabold text-emerald-400">{formatCurrency(tPt.netCashForExpenses)}</td>
                    <td className="py-2.5 px-4 font-bold text-sky-400">{formatCurrency(tPt.grossProceedsHarvested)}</td>
                    <td className="py-2.5 px-4 text-emerald-300">{formatCurrency(tPt.realizedLTGain)}</td>
                    <td className="py-2.5 px-4 text-sky-400">{formatCurrency(tPt.federalTax)}</td>
                    <td className="py-2.5 px-4 text-indigo-300">{formatCurrency(tPt.californiaTax)}</td>
                    <td className="py-2.5 px-4 font-bold text-amber-400">{formatCurrency(tPt.totalTax)}</td>
                    <td className="py-2.5 px-4 text-slate-400">{tPt.remainingLotsCount} lots</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
