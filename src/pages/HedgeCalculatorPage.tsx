import React, { useEffect, useState } from 'react';
import { Activity, CircleStop, FastForward, Play, ShieldCheck, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { HedgeOptionLeg, HedgeStrategyKey, OptionHedgeConfig } from '../types/financial';
import { formatCurrency } from '../utils/financialCalculations';

interface HedgeCalculatorPageProps {
  config: OptionHedgeConfig;
  liveUnderlyingPrice?: number;
  onSaveConfig: (config: OptionHedgeConfig) => void;
}

const STRATEGIES: Record<HedgeStrategyKey, { name: string; legs: HedgeOptionLeg[] }> = {
  protective_put: {
    name: 'Protective Put',
    legs: [{ id: 'long-put', name: 'Long Put Protection', type: 'put', action: 'buy', strike: 125, premium: 5.8, quantity: 40 }]
  },
  collar: {
    name: 'Standard Collar',
    legs: [
      { id: 'long-put', name: 'Long Put Protection', type: 'put', action: 'buy', strike: 125, premium: 5.8, quantity: 40 },
      { id: 'short-call', name: 'Short Call Financing', type: 'call', action: 'sell', strike: 145, premium: 6.2, quantity: 40 }
    ]
  },
  bear_put_spread: {
    name: 'Bear Put Spread',
    legs: [
      { id: 'long-put', name: 'Long Put Protection', type: 'put', action: 'buy', strike: 130, premium: 8.2, quantity: 40 },
      { id: 'short-put', name: 'Short Put', type: 'put', action: 'sell', strike: 115, premium: 3.1, quantity: 40 }
    ]
  },
  ratio_put: {
    name: '1x2 Put Ratio Spread',
    legs: [
      { id: 'long-put', name: 'Long Put Protection', type: 'put', action: 'buy', strike: 130, premium: 8.2, quantity: 40 },
      { id: 'short-put', name: '2x Short Puts', type: 'put', action: 'sell', strike: 115, premium: 3.1, quantity: 80 }
    ]
  },
  put_spread_collar: {
    name: 'Put Spread Collar',
    legs: [
      { id: 'long-put', name: 'Long Put', type: 'put', action: 'buy', strike: 130, premium: 8.2, quantity: 40 },
      { id: 'short-put', name: 'Short Put', type: 'put', action: 'sell', strike: 115, premium: 3.1, quantity: 40 },
      { id: 'short-call', name: 'Short Call Financing', type: 'call', action: 'sell', strike: 155, premium: 4.9, quantity: 40 }
    ]
  }
};

const cloneLegs = (strategy: HedgeStrategyKey) => STRATEGIES[strategy].legs.map(leg => ({ ...leg }));

const calculatePayoff = (price: number, currentPrice: number, shares: number, legs: HedgeOptionLeg[]) => {
  const stockPnL = (price - currentPrice) * shares;
  const optionsPnL = legs.reduce((total, leg) => {
    const intrinsic = leg.type === 'put'
      ? Math.max(0, leg.strike - price)
      : Math.max(0, price - leg.strike);
    const multiplier = leg.action === 'buy' ? 1 : -1;
    return total + multiplier * (intrinsic - leg.premium) * 100 * leg.quantity;
  }, 0);

  return stockPnL + optionsPnL;
};

const inputClassName = 'w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500';
const labelClassName = 'mb-1.5 block text-xs font-semibold text-slate-400';

export const HedgeCalculatorPage: React.FC<HedgeCalculatorPageProps> = ({ config, liveUnderlyingPrice, onSaveConfig }) => {
  const initialPrice = liveUnderlyingPrice ?? (config.underlyingPrice || 133);
  const initialStrategy = config.strategy ?? 'put_spread_collar';
  const [shares, setShares] = useState(config.sharesHeld || 4050);
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [strategy, setStrategy] = useState<HedgeStrategyKey>(initialStrategy);
  const [legs, setLegs] = useState<HedgeOptionLeg[]>(config.legs?.length ? config.legs.map(leg => ({ ...leg })) : cloneLegs(initialStrategy));
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);

  useEffect(() => {
    const nextStrategy = config.strategy ?? 'put_spread_collar';
    setShares(config.sharesHeld || 4050);
    setCurrentPrice(liveUnderlyingPrice ?? (config.underlyingPrice || 133));
    setStrategy(nextStrategy);
    setLegs(config.legs?.length ? config.legs.map(leg => ({ ...leg })) : cloneLegs(nextStrategy));
  }, [config, liveUnderlyingPrice]);

  const stepMarket = () => {
    const change = Math.random() * 0.05 - 0.025;
    setCurrentPrice(price => Math.max(0.01, Number((price * (1 + change)).toFixed(2))));
  };

  useEffect(() => {
    if (!isAutoSimulating) return undefined;
    const interval = window.setInterval(stepMarket, 2000);
    return () => window.clearInterval(interval);
  }, [isAutoSimulating]);

  const maxStrike = Math.max(currentPrice, ...legs.map(leg => leg.strike));
  const chartMaxPrice = Math.ceil(Math.max(currentPrice * 1.8, maxStrike * 1.15));
  const chartPrices = Array.from(new Set([
    ...Array.from({ length: 121 }, (_, index) => Number((chartMaxPrice * index / 120).toFixed(2))),
    Number(currentPrice.toFixed(2)),
    ...legs.map(leg => Number(leg.strike.toFixed(2)))
  ])).sort((left, right) => left - right);
  const chartData = chartPrices.map(price => {
    return {
      price,
      strategyPnL: Math.round(calculatePayoff(price, currentPrice, shares, legs)),
      unhedgedPnL: Math.round((price - currentPrice) * shares)
    };
  });

  const netPremium = legs.reduce((total, leg) => {
    const direction = leg.action === 'buy' ? 1 : -1;
    return total + direction * leg.premium * 100 * leg.quantity;
  }, 0);
  const plottedPayoffs = chartData.map(point => point.strategyPnL);
  const maxLoss = Math.min(...plottedPayoffs);
  const finalSlope = chartData[chartData.length - 1].strategyPnL - chartData[chartData.length - 2].strategyPnL;
  const maxGain = Math.max(...plottedPayoffs);
  const longPut = legs.find(leg => leg.type === 'put' && leg.action === 'buy');
  const shortPut = legs.find(leg => leg.type === 'put' && leg.action === 'sell');
  const coveredShares = Math.max(0, ...legs.map(leg => leg.quantity * 100));

  const persistConfig = (nextShares: number, nextPrice: number, nextStrategy: HedgeStrategyKey, nextLegs: HedgeOptionLeg[]) => {
    const nextLongPut = nextLegs.find(leg => leg.type === 'put' && leg.action === 'buy');
    const financingLeg = nextLegs.find(leg => leg.action === 'sell');
    onSaveConfig({
      ...config,
      underlyingTicker: 'SPCX',
      sharesHeld: nextShares,
      underlyingPrice: nextPrice,
      contracts: nextLongPut?.quantity ?? 0,
      longPutStrike: nextLongPut?.strike ?? 0,
      longPutPremium: nextLongPut?.premium ?? 0,
      shortPutStrike: financingLeg?.strike ?? 0,
      shortPutPremium: financingLeg?.premium ?? 0,
      netPremiumPaid: nextLegs.reduce((total, leg) => total + (leg.action === 'buy' ? 1 : -1) * leg.premium * 100 * leg.quantity, 0),
      strategy: nextStrategy,
      legs: nextLegs
    });
  };

  const changeStrategy = (nextStrategy: HedgeStrategyKey) => {
    const nextLegs = cloneLegs(nextStrategy);
    setStrategy(nextStrategy);
    setLegs(nextLegs);
    persistConfig(shares, currentPrice, nextStrategy, nextLegs);
  };

  const updateLeg = (index: number, field: 'strike' | 'premium' | 'quantity', value: number) => {
    const nextLegs = legs.map((leg, legIndex) => legIndex === index ? { ...leg, [field]: Math.max(0, value) } : leg);
    setLegs(nextLegs);
    persistConfig(shares, currentPrice, strategy, nextLegs);
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col bg-slate-950 xl:flex-row">
      <aside className="w-full shrink-0 border-b border-slate-800 bg-slate-900 xl:w-80 xl:border-b-0 xl:border-r">
        <div className="border-b border-slate-800 p-5">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-sky-400" />
            <h1 className="text-lg font-bold text-white">SPCX Hedge Simulator</h1>
          </div>
          <p className="text-xs leading-5 text-slate-400">Model option strategies and compare expiration outcomes against the unhedged position.</p>
        </div>

        <div className="space-y-6 p-5">
          <section>
            <h2 className="mb-3 text-xs font-bold uppercase text-slate-300">Base Position</h2>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className={labelClassName}>Total Shares</span>
                <input
                  className={inputClassName}
                  min="0"
                  type="number"
                  value={shares}
                  onChange={event => {
                    const nextShares = Math.max(0, Number(event.target.value));
                    setShares(nextShares);
                    persistConfig(nextShares, currentPrice, strategy, legs);
                  }}
                />
              </label>
              <label>
                <span className={labelClassName}>Current Price ($)</span>
                <input
                  className={`${inputClassName} text-sky-400`}
                  min="0.01"
                  step="0.1"
                  type="number"
                  value={currentPrice}
                  readOnly={liveUnderlyingPrice !== undefined}
                  onChange={event => {
                    const nextPrice = Math.max(0.01, Number(event.target.value));
                    setCurrentPrice(nextPrice);
                    persistConfig(shares, nextPrice, strategy, legs);
                  }}
                />
              </label>
            </div>
          </section>

          <section className="border-t border-slate-800 pt-5">
            <label>
              <span className={labelClassName}>Hedge Strategy</span>
              <select className={inputClassName} value={strategy} onChange={event => changeStrategy(event.target.value as HedgeStrategyKey)}>
                {Object.entries(STRATEGIES).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
              </select>
            </label>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-5">
            <h2 className="text-xs font-bold uppercase text-slate-300">Option Legs</h2>
            {legs.map((leg, index) => (
              <div key={leg.id} className="rounded-md border border-slate-700 bg-slate-800/60 p-3">
                <div className="mb-3 flex items-start justify-between gap-2 border-b border-slate-700 pb-2">
                  <span className={`text-xs font-bold ${leg.action === 'buy' ? 'text-sky-400' : 'text-amber-400'}`}>
                    {leg.action.toUpperCase()} {leg.name}
                  </span>
                  <span className="whitespace-nowrap text-[10px] text-slate-500">{leg.quantity} contracts</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className={labelClassName}>Strike ($)</span>
                    <input className={inputClassName} min="0" step="1" type="number" value={leg.strike} onChange={event => updateLeg(index, 'strike', Number(event.target.value))} />
                  </label>
                  <label>
                    <span className={labelClassName}>Premium ($)</span>
                    <input className={inputClassName} min="0" step="0.1" type="number" value={leg.premium} onChange={event => updateLeg(index, 'premium', Number(event.target.value))} />
                  </label>
                  <label className="col-span-2">
                    <span className={labelClassName}>Quantity (Contracts)</span>
                    <input className={inputClassName} min="0" step="1" type="number" value={leg.quantity} onChange={event => updateLeg(index, 'quantity', Number(event.target.value))} />
                  </label>
                </div>
              </div>
            ))}
          </section>
        </div>

        <div className="border-t border-slate-800 bg-slate-800/40 p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400">Net Premium</span>
            <span className={`text-lg font-bold ${netPremium > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(netPremium)}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Positive is a debit; negative is a credit.</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-col gap-4 border-b border-slate-800 bg-slate-900/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-7">
          <div className="flex items-center gap-6">
            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-500">Market Status</span>
              <span className="flex items-center gap-2 text-sm font-bold text-emerald-400"><span className="h-2 w-2 rounded-full bg-emerald-400" />Open</span>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div>
              <span className="block text-[10px] font-bold uppercase text-slate-500">Simulated Price</span>
              <span className="text-xl font-bold text-white">${currentPrice.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsAutoSimulating(running => !running)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition ${isAutoSimulating ? 'border-rose-500 bg-rose-950/50 text-rose-300' : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
            >
              {isAutoSimulating ? <CircleStop className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isAutoSimulating ? 'Stop Sim' : 'Auto-Simulate'}
            </button>
            <button type="button" onClick={stepMarket} className="flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-500">
              <FastForward className="h-4 w-4" />Step 1 Hour
            </button>
          </div>
        </header>

        <main className="space-y-5 p-5 lg:p-7">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Portfolio Value Now', value: formatCurrency(shares * currentPrice), tone: 'text-white' },
              { label: 'Max Gain at Expiration', value: finalSlope > 0 ? 'Unlimited' : formatCurrency(maxGain), tone: 'text-emerald-400' },
              { label: 'Max Loss at Expiration', value: formatCurrency(maxLoss), tone: 'text-rose-400' },
              { label: 'Downside Protection', value: longPut ? (shortPut ? `$${shortPut.strike}-$${longPut.strike} spread` : `Floor at $${longPut.strike}`) : 'None', tone: 'text-sky-400' }
            ].map(stat => (
              <div key={stat.label} className="rounded-md border border-slate-800 bg-slate-900 p-4">
                <span className="mb-1 block text-[11px] font-semibold text-slate-400">{stat.label}</span>
                <span className={`block truncate text-lg font-bold ${stat.tone}`} title={stat.value}>{stat.value}</span>
              </div>
            ))}
          </div>

          {coveredShares < shares && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
              <Activity className="h-4 w-4 shrink-0" />Option legs cover {coveredShares.toLocaleString()} of {shares.toLocaleString()} shares.
            </div>
          )}

          <section className="rounded-md border border-slate-800 bg-slate-900 p-4 lg:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Expiration Payoff</h2>
                <p className="mt-1 text-xs text-slate-500">{STRATEGIES[strategy].name} compared with the unhedged SPCX position</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><ShieldCheck className="h-4 w-4" />{coveredShares.toLocaleString()} shares covered</div>
            </div>
            <div className="h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="price"
                    domain={[0, chartMaxPrice]}
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    tickFormatter={value => `$${value}`}
                  />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={value => `$${Math.round(value / 1000)}k`} width={58} />
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'strategyPnL' ? 'Strategy P&L' : 'Unhedged P&L']}
                    labelFormatter={value => `SPCX at expiration: $${Number(value).toFixed(2)}`}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc' }}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <ReferenceLine x={Number(currentPrice.toFixed(2))} stroke="#34d399" strokeDasharray="4 4" label={{ value: 'Current', fill: '#34d399', fontSize: 10 }} />
                  {legs.map(leg => (
                    <ReferenceLine
                      key={leg.id}
                      x={leg.strike}
                      stroke={leg.action === 'buy' ? '#38bdf8' : '#f59e0b'}
                      strokeDasharray="3 5"
                      label={{ value: `$${leg.strike}`, fill: leg.action === 'buy' ? '#38bdf8' : '#f59e0b', fontSize: 10 }}
                    />
                  ))}
                  <Line type="linear" dataKey="strategyPnL" stroke="#38bdf8" strokeWidth={3} dot={false} />
                  <Line type="linear" dataKey="unhedgedPnL" stroke="#64748b" strokeWidth={2} strokeDasharray="6 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};
