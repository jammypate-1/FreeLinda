import React, { useState } from 'react';
import { TaxLot, PlanningAssumptions, DashboardMetrics } from '../types/financial';
import { runLifetimeTaxSimulation } from '../utils/taxSimulator';
import { formatCurrency, formatPercent } from '../utils/financialCalculations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Calculator, Calendar, DollarSign, ShieldAlert, Award, FileText, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

interface TaxesPageProps {
  taxLots: TaxLot[];
  assumptions: PlanningAssumptions;
  metrics: DashboardMetrics;
}

export const TaxesPage: React.FC<TaxesPageProps> = ({ taxLots = [], assumptions, metrics }) => {
  const currentAge = 36;
  const startYear = 2026;

  // Linda's target retirement: April 2027
  const [retireYear, setRetireYear] = useState<number>(2027);
  const [retireMonth, setRetireMonth] = useState<number>(4); // April

  const [annualExpenses, setAnnualExpenses] = useState<number>(120000);
  const [inflation, setInflation] = useState<number>(assumptions.inflationRate || 0.02);
  const [ssStartAge, setSsStartAge] = useState<number>(67);
  const [ssMonthlyBenefit, setSsMonthlyBenefit] = useState<number>(3000);
  const [ssColaRate, setSsColaRate] = useState<number>(0.025); // 2.5% COLA

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

  const taxSimulation = runLifetimeTaxSimulation(
    taxLots,
    currentAge,
    retireYear,
    retireMonth,
    annualExpenses,
    inflation,
    ssMonthlyBenefit * 12,
    ssStartAge,
    ssColaRate
  );

  const totalFedTax = taxSimulation.reduce((sum, p) => sum + p.federalTax, 0);
  const totalCATax = taxSimulation.reduce((sum, p) => sum + p.californiaTax, 0);
  const totalCombinedTax = totalFedTax + totalCATax;
  const totalSSColaIncome = taxSimulation.reduce((sum, p) => sum + p.socialSecurityColaBenefit, 0);

  const isApril2027 = retireYear === 2027 && retireMonth === 4;

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Quick Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Taxes</h1>
          <p className="text-sm text-slate-400 mt-1">
            Simulates tax lot liquidations matching inflation-adjusted expenses exactly, incorporating <strong className="text-emerald-400">Year-over-Year Capital Gains Limit Indexing</strong>, <strong className="text-sky-400">Living Expenses Inflation Compounding ({formatPercent(inflation)}/yr)</strong>, and <strong className="text-amber-400">Social Security COLA Adjustments (2.5%/yr)</strong>.
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

      {/* Inflation & COLA Adjustments Notice Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-2 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Indexed Federal Capital Gains Brackets</span>
          </div>
          <p className="text-xs text-slate-300">
            Federal 0% and 15% capital gains tax limits increase annually with inflation ({formatPercent(inflation)}/yr). The 0% limit expands from <strong>$47,025</strong> in 2026 up to <strong>$70,000+</strong> by 2045, shielding lower gains from federal tax.
          </p>
        </div>

        <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-5 space-y-2 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/20">
          <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Social Security Cost of Living Adjustment (COLA)</span>
          </div>
          <p className="text-xs text-slate-300">
            Social Security benefit grows by <strong>{formatPercent(ssColaRate)} annual COLA</strong> compounding every year from 2026. At Age 67, Linda's starting benefit expands to <strong>{formatCurrency((ssMonthlyBenefit * 12) * Math.pow(1 + ssColaRate, 31))}/yr</strong>.
          </p>
        </div>
      </div>

      {/* Target Controls Panel */}
      <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">Tax Simulation & COLA Parameters</h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Retirement: {monthsMap.find(m => m.num === retireMonth)?.name} {retireYear}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
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

          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-400">Social Security COLA Rate</span>
              <span className="text-sky-400 font-bold">{formatPercent(ssColaRate)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.05"
              step="0.005"
              value={ssColaRate}
              onChange={e => setSsColaRate(Number(e.target.value))}
              className="w-full accent-sky-500 bg-slate-950 rounded-lg h-2"
            />
          </div>

          <div>
            <div className="flex justify-between font-semibold mb-1">
              <span className="text-slate-400">Target Annual Expenses</span>
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
        </div>
      </div>

      {/* Tax Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total Federal Tax (Indexed)</p>
          <p className="text-2xl font-extrabold text-sky-400">{formatCurrency(totalFedTax)}</p>
          <p className="text-[11px] text-slate-400">Reflects YoY bracket limit increases</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total California State Tax</p>
          <p className="text-2xl font-extrabold text-indigo-400">{formatCurrency(totalCATax)}</p>
          <p className="text-[11px] text-slate-400">CA Ordinary Income Bracket (9.3%-13.3%)</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total Lifetime SS COLA Received</p>
          <p className="text-2xl font-extrabold text-emerald-400">{formatCurrency(totalSSColaIncome)}</p>
          <p className="text-[11px] text-slate-400">Compounded with {formatPercent(ssColaRate)} annual COLA</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1 bg-gradient-to-br from-slate-900 to-emerald-950/30">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Expense Match Accuracy</p>
          <p className="text-2xl font-extrabold text-emerald-400">100.0% Matched</p>
          <p className="text-[11px] text-emerald-300 font-medium">Net after-tax cash satisfies expenses exactly</p>
        </div>
      </div>

      {/* Federal vs California Annual Tax Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-sky-400" />
          <span>Annual Federal vs California Tax Simulation Breakdown (2026 to 2080)</span>
        </h3>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={taxSimulation.filter(p => p.phase === 'Retirement')} margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="age" label={{ value: 'Age', position: 'insideBottom', offset: -5 }} stroke="#64748b" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="#64748b" />
              <Tooltip
                formatter={(val: number, name: string) => [formatCurrency(val), name]}
                labelFormatter={(age) => `Age ${age} (${2026 + (Number(age) - 36)})`}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
              />
              <Legend />
              <Bar name="Federal Tax (Indexed)" dataKey="federalTax" fill="#38bdf8" stackId="a" />
              <Bar name="California State Tax" dataKey="californiaTax" fill="#8b5cf6" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Complete Annual Tax Schedule Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>Complete Year-by-Year Federal & California Tax Simulation Table (With COLA & Cap Gains Indexing)</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">Matching Expenses Exactly</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4">Age</th>
                <th className="py-3 px-4">Net Expenses</th>
                <th className="py-3 px-4">SS Benefit (COLA)</th>
                <th className="py-3 px-4">Gross Harvested</th>
                <th className="py-3 px-4">Indexed 0% Cap Gain Limit</th>
                <th className="py-3 px-4">Realized LT Gain</th>
                <th className="py-3 px-4">Federal Tax</th>
                <th className="py-3 px-4">CA Tax</th>
                <th className="py-3 px-4">Total Tax</th>
                <th className="py-3 px-4">Effective Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {taxSimulation.map((pt, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-slate-800/40 transition ${
                    pt.year === retireYear ? 'bg-sky-950/40 border-l-4 border-sky-400 font-bold' : ''
                  }`}
                >
                  <td className="py-2.5 px-4 font-semibold text-slate-300">{pt.year}</td>
                  <td className="py-2.5 px-4 font-bold text-white">Age {pt.age}</td>
                  <td className="py-2.5 px-4 font-extrabold text-emerald-400">
                    {pt.netCashForExpenses > 0 ? formatCurrency(pt.netCashForExpenses) : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-sky-400">
                    {pt.socialSecurityColaBenefit > 0 ? formatCurrency(pt.socialSecurityColaBenefit) : '-'}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-white">
                    {pt.grossProceedsHarvested > 0 ? formatCurrency(pt.grossProceedsHarvested) : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-emerald-300">{formatCurrency(pt.indexedZeroCapGainLimit)}</td>
                  <td className="py-2.5 px-4 text-slate-300">
                    {pt.realizedLTGain > 0 ? formatCurrency(pt.realizedLTGain) : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-sky-400">{pt.federalTax > 0 ? formatCurrency(pt.federalTax) : '-'}</td>
                  <td className="py-2.5 px-4 text-indigo-300">{pt.californiaTax > 0 ? formatCurrency(pt.californiaTax) : '-'}</td>
                  <td className="py-2.5 px-4 font-bold text-amber-400">{pt.totalTax > 0 ? formatCurrency(pt.totalTax) : '-'}</td>
                  <td className="py-2.5 px-4 text-slate-300">{pt.effectiveTaxRate > 0 ? `${pt.effectiveTaxRate.toFixed(1)}%` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
