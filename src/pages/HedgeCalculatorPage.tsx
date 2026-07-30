import React, { useState } from 'react';
import { OptionHedgeConfig } from '../types/financial';
import { calculateHedgeMatrix, formatCurrency } from '../utils/financialCalculations';
import { ShieldAlert, Sliders, CheckCircle2, Lock, Sparkles, Layers, DollarSign, Activity, ShieldCheck, Repeat } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

interface HedgeCalculatorPageProps {
  config: OptionHedgeConfig;
  onSaveConfig: (config: OptionHedgeConfig) => void;
}

export const HedgeCalculatorPage: React.FC<HedgeCalculatorPageProps> = ({ config, onSaveConfig }) => {
  // SPCX Dedicated Option Collar Configuration
  const [spcxConfig, setSpcxConfig] = useState<OptionHedgeConfig>({
    underlyingTicker: 'SPCX',
    sharesHeld: 7243,
    underlyingPrice: 332.56,
    contracts: 72,
    longPutStrike: 300,
    shortPutStrike: 360,
    netPremiumPaid: 0
  });

  // GOOG Dedicated Option Collar Configuration
  const [googConfig, setGoogConfig] = useState<OptionHedgeConfig>({
    underlyingTicker: 'GOOG',
    sharesHeld: 3759,
    underlyingPrice: 112.42,
    contracts: 37,
    longPutStrike: 100,
    shortPutStrike: 125,
    netPremiumPaid: 0
  });

  const spcxMatrix = calculateHedgeMatrix(spcxConfig);
  const googMatrix = calculateHedgeMatrix(googConfig);

  const spcxValue = spcxConfig.underlyingPrice * spcxConfig.sharesHeld;
  const googValue = googConfig.underlyingPrice * googConfig.sharesHeld;
  const combinedTotalValue = spcxValue + googValue;

  const handleUpdateSpcx = (updated: Partial<OptionHedgeConfig>) => {
    const next = { ...spcxConfig, ...updated };
    setSpcxConfig(next);
    onSaveConfig(next);
  };

  const handleUpdateGoog = (updated: Partial<OptionHedgeConfig>) => {
    const next = { ...googConfig, ...updated };
    setGoogConfig(next);
    onSaveConfig(next);
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center space-x-1">
              <Repeat className="w-3.5 h-3.5" />
              <span>Perpetual Lifetime Hedging Policy</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">
            Equity Concentration Option Hedge Matrix
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dedicated option collars for Linda's two concentrated stock holdings: <strong className="text-emerald-400">SpaceX (SPCX)</strong> & <strong className="text-sky-400">Google (GOOG)</strong>.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs bg-slate-900 border border-slate-800 p-3 rounded-xl shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300 font-bold">Total Hedged Concentration: {formatCurrency(combinedTotalValue)}</span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 bg-gradient-to-br from-slate-900 to-emerald-950/20 border-emerald-500/30">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">SpaceX (SPCX) Hedged Value</p>
          <p className="text-2xl font-extrabold text-emerald-400">{formatCurrency(spcxValue)}</p>
          <p className="text-xs text-slate-400">119 Tax Lots • Floor: $300 | Cap: $360</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 bg-gradient-to-br from-slate-900 to-sky-950/20 border-sky-500/30">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Google (GOOG) Hedged Value</p>
          <p className="text-2xl font-extrabold text-sky-400">{formatCurrency(googValue)}</p>
          <p className="text-xs text-slate-400">4 Tax Lots • Floor: $100 | Cap: $125</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 bg-gradient-to-br from-slate-900 to-indigo-950/20 border-indigo-500/30">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Combined Out-of-Pocket Cost</p>
          <p className="text-2xl font-extrabold text-white">$0.00 Net Premium</p>
          <p className="text-xs text-emerald-400 font-semibold">100% Self-Financed Zero-Cost Collars</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BREAKOUT SECTION 1: SPACEX (SPCX) OPTION COLLAR HEDGE */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 space-y-6 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">SpaceX (SPCX) Option Collar Hedging Breakout</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Primary Equity Holding ($2.41M)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Perpetual zero-cost option collar hedging 7,243 shares across 119 private tax lots ($332.56/sh base price).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 bg-slate-950 border border-emerald-500/30 px-3 py-1.5 rounded-xl shrink-0">
            <span>Downside Cap: -$235,821 (-9.8% Max Loss)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* SPCX Controls */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>SPCX Option Collar Parameters</span>
            </h3>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Underlying Ticker</label>
              <input
                type="text"
                disabled
                value={spcxConfig.underlyingTicker}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-bold cursor-not-allowed opacity-90"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Current SPCX Market Price ($)</label>
              <input
                type="number"
                step="0.1"
                value={spcxConfig.underlyingPrice}
                onChange={e => handleUpdateSpcx({ underlyingPrice: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Total Shares & Contracts</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={spcxConfig.sharesHeld}
                  onChange={e => handleUpdateSpcx({ sharesHeld: Number(e.target.value) })}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-semibold"
                />
                <input
                  type="number"
                  value={spcxConfig.contracts}
                  onChange={e => handleUpdateSpcx({ contracts: Number(e.target.value) })}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-emerald-400 font-bold mb-1">Long Put Floor ($)</label>
                <input
                  type="number"
                  value={spcxConfig.longPutStrike}
                  onChange={e => handleUpdateSpcx({ longPutStrike: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg p-2 text-emerald-400 font-bold"
                />
              </div>
              <div>
                <label className="block text-sky-400 font-bold mb-1">Short Call Cap ($)</label>
                <input
                  type="number"
                  value={spcxConfig.shortPutStrike}
                  onChange={e => handleUpdateSpcx({ shortPutStrike: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-sky-500/50 rounded-lg p-2 text-sky-400 font-bold"
                />
              </div>
            </div>
          </div>

          {/* SPCX Payoff Chart */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 lg:col-span-2 flex flex-col justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">SPCX Expiration Payoff Profile</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={spcxMatrix} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="underlyingPrice" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                  <Bar dataKey="totalPnL" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* SPCX Scenario Table */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden text-xs">
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 font-bold text-white">
            SpaceX (SPCX) Expiration P&L Scenario Matrix
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Price Scenario</th>
                <th className="py-3 px-4">Position Value</th>
                <th className="py-3 px-4">Unhedged Stock P&L</th>
                <th className="py-3 px-4">Option Collar Net P&L</th>
                <th className="py-3 px-4 text-right">Combined Position P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {spcxMatrix.map((pt, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-bold text-white">
                    ${pt.underlyingPrice.toFixed(2)}
                    {pt.underlyingPrice < spcxConfig.longPutStrike && <span className="ml-2 text-[10px] text-emerald-400 font-bold">(Put Protection Active)</span>}
                    {pt.underlyingPrice > spcxConfig.shortPutStrike && <span className="ml-2 text-[10px] text-amber-400 font-bold">(Call Cap Active)</span>}
                  </td>
                  <td className="py-2.5 px-4 font-mono">{formatCurrency(pt.underlyingPrice * spcxConfig.sharesHeld)}</td>
                  <td className="py-2.5 px-4">
                    <span className={pt.underlyingPnL >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {pt.underlyingPnL >= 0 ? '+' : ''}{formatCurrency(pt.underlyingPnL)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">{pt.optionPnL >= 0 ? '+' : ''}{formatCurrency(pt.optionPnL)}</td>
                  <td className="py-2.5 px-4 text-right font-extrabold">
                    <span className={pt.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {pt.totalPnL >= 0 ? '+' : ''}{formatCurrency(pt.totalPnL)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BREAKOUT SECTION 2: GOOGLE (GOOG) OPTION COLLAR HEDGE */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-sky-500/40 rounded-3xl p-6 space-y-6 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Google (GOOG) Option Collar Hedging Breakout</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  Public Tech RSU Holding ($422k)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Perpetual zero-cost option collar hedging 3,759 shares across 4 tax lots ($112.42/sh base price).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-bold text-sky-400 bg-slate-950 border border-sky-500/30 px-3 py-1.5 rounded-xl shrink-0">
            <span>Downside Cap: -$46,687 (-11.0% Max Loss)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* GOOG Controls */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>GOOG Option Collar Parameters</span>
            </h3>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Underlying Ticker</label>
              <input
                type="text"
                disabled
                value={googConfig.underlyingTicker}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-bold cursor-not-allowed opacity-90"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Current GOOG Market Price ($)</label>
              <input
                type="number"
                step="0.1"
                value={googConfig.underlyingPrice}
                onChange={e => handleUpdateGoog({ underlyingPrice: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Total Shares & Contracts</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={googConfig.sharesHeld}
                  onChange={e => handleUpdateGoog({ sharesHeld: Number(e.target.value) })}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-semibold"
                />
                <input
                  type="number"
                  value={googConfig.contracts}
                  onChange={e => handleUpdateGoog({ contracts: Number(e.target.value) })}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-emerald-400 font-bold mb-1">Long Put Floor ($)</label>
                <input
                  type="number"
                  value={googConfig.longPutStrike}
                  onChange={e => handleUpdateGoog({ longPutStrike: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg p-2 text-emerald-400 font-bold"
                />
              </div>
              <div>
                <label className="block text-sky-400 font-bold mb-1">Short Call Cap ($)</label>
                <input
                  type="number"
                  value={googConfig.shortPutStrike}
                  onChange={e => handleUpdateGoog({ shortPutStrike: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-sky-500/50 rounded-lg p-2 text-sky-400 font-bold"
                />
              </div>
            </div>
          </div>

          {/* GOOG Payoff Chart */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 lg:col-span-2 flex flex-col justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">GOOG Expiration Payoff Profile</h4>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={googMatrix} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="underlyingPrice" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} />
                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
                  <Bar dataKey="totalPnL" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* GOOG Scenario Table */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden text-xs">
          <div className="p-3.5 bg-slate-900 border-b border-slate-800 font-bold text-white">
            Google (GOOG) Expiration P&L Scenario Matrix
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Price Scenario</th>
                <th className="py-3 px-4">Position Value</th>
                <th className="py-3 px-4">Unhedged Stock P&L</th>
                <th className="py-3 px-4">Option Collar Net P&L</th>
                <th className="py-3 px-4 text-right">Combined Position P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {googMatrix.map((pt, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 font-bold text-white">
                    ${pt.underlyingPrice.toFixed(2)}
                    {pt.underlyingPrice < googConfig.longPutStrike && <span className="ml-2 text-[10px] text-emerald-400 font-bold">(Put Protection Active)</span>}
                    {pt.underlyingPrice > googConfig.shortPutStrike && <span className="ml-2 text-[10px] text-amber-400 font-bold">(Call Cap Active)</span>}
                  </td>
                  <td className="py-2.5 px-4 font-mono">{formatCurrency(pt.underlyingPrice * googConfig.sharesHeld)}</td>
                  <td className="py-2.5 px-4">
                    <span className={pt.underlyingPnL >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {pt.underlyingPnL >= 0 ? '+' : ''}{formatCurrency(pt.underlyingPnL)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">{pt.optionPnL >= 0 ? '+' : ''}{formatCurrency(pt.optionPnL)}</td>
                  <td className="py-2.5 px-4 text-right font-extrabold">
                    <span className={pt.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {pt.totalPnL >= 0 ? '+' : ''}{formatCurrency(pt.totalPnL)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
