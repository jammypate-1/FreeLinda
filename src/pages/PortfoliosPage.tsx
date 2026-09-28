import React, { useState } from 'react';
import {
  AssetAccount,
  CashFlowItem,
  DashboardMetrics,
  PlanningAssumptions,
  PortfoliosConfig,
  PortfolioBucketKey,
  TaxLot
} from '../types/financial';
import { formatCurrency, formatPercent } from '../utils/financialCalculations';
import {
  Wallet,
  ArrowDownRight,
  ShieldCheck,
  TrendingUp,
  Gem,
  Sliders,
  ArrowRight,
  Plus,
  Check,
  RefreshCw,
  Info,
  DollarSign,
  PieChart,
  Layers,
  ArrowUpRight,
  Sparkles,
  ShieldAlert,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface PortfoliosPageProps {
  assets: AssetAccount[];
  taxLots: TaxLot[];
  cashFlows: CashFlowItem[];
  assumptions: PlanningAssumptions;
  metrics: DashboardMetrics;
  portfoliosConfig: PortfoliosConfig;
  onSavePortfoliosConfig: (config: PortfoliosConfig) => void;
  onSaveAssets?: (assets: AssetAccount[]) => void;
}

interface PortfolioBucketDefinition {
  key: PortfolioBucketKey;
  name: string;
  tagline: string;
  goalDescription: string;
  horizon: string;
  colorTheme: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    iconBg: string;
    glow: string;
    gradient: string;
  };
  icon: React.ElementType;
}

const BUCKET_DEFINITIONS: PortfolioBucketDefinition[] = [
  {
    key: 'spending',
    name: 'Spending Portfolio',
    tagline: 'Checking Operating Account',
    goalDescription: 'Operating checking account where day-to-day spending comes through. Receives equal regular distributions from the Income Portfolio.',
    horizon: 'Immediate (0 - 1 Month)',
    colorTheme: {
      bg: 'bg-emerald-950/20',
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      text: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      glow: 'shadow-emerald-500/10',
      gradient: 'from-emerald-500 to-teal-600'
    },
    icon: Wallet
  },
  {
    key: 'income',
    name: 'Income Portfolio',
    tagline: 'Equal Distribution Engine',
    goalDescription: 'Income distribution pool from which we take equal distributions on a regular basis and transfer into the Spending checking account.',
    horizon: '1 - 6 Months Liquidity',
    colorTheme: {
      bg: 'bg-indigo-950/20',
      border: 'border-indigo-500/30 hover:border-indigo-500/50',
      text: 'text-indigo-400',
      badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
      iconBg: 'bg-indigo-500/20 text-indigo-400',
      glow: 'shadow-indigo-500/10',
      gradient: 'from-indigo-500 to-blue-600'
    },
    icon: ArrowDownRight
  },
  {
    key: 'emergency',
    name: 'Emergency Portfolio',
    tagline: '18-Month Expense Shield',
    goalDescription: 'Capital preservation reserve designed specifically for 18 Months of expenses to protect against unexpected life events or severe market drops.',
    horizon: '18 Months Capital Reserve',
    colorTheme: {
      bg: 'bg-amber-950/20',
      border: 'border-amber-500/30 hover:border-amber-500/50',
      text: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      iconBg: 'bg-amber-500/20 text-amber-400',
      glow: 'shadow-amber-500/10',
      gradient: 'from-amber-500 to-yellow-600'
    },
    icon: ShieldCheck
  },
  {
    key: 'growth',
    name: 'Growth Portfolio',
    tagline: 'Beyond 18-Month Higher Returns',
    goalDescription: 'Higher compounding returns engine for capital beyond the 18-month emergency horizon. Diversified equities, 401(k)s, and index funds.',
    horizon: '> 18 Months Capital Horizon',
    colorTheme: {
      bg: 'bg-purple-950/20',
      border: 'border-purple-500/30 hover:border-purple-500/50',
      text: 'text-purple-400',
      badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      iconBg: 'bg-purple-500/20 text-purple-400',
      glow: 'shadow-purple-500/10',
      gradient: 'from-purple-500 to-violet-600'
    },
    icon: TrendingUp
  },
  {
    key: 'nest_egg',
    name: 'Nest Egg Portfolio',
    tagline: 'SPCX & GOOG Active Management',
    goalDescription: 'Core concentrated wealth holdings of SPCX and GOOG shares that we are actively managing, hedging, and systematically liquidating to diversify.',
    horizon: 'Core Wealth Concentration',
    colorTheme: {
      bg: 'bg-rose-950/20',
      border: 'border-rose-500/30 hover:border-rose-500/50',
      text: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      iconBg: 'bg-rose-500/20 text-rose-400',
      glow: 'shadow-rose-500/10',
      gradient: 'from-rose-500 to-pink-600'
    },
    icon: Gem
  }
];

export const PortfoliosPage: React.FC<PortfoliosPageProps> = ({
  assets,
  taxLots,
  cashFlows,
  assumptions,
  metrics,
  portfoliosConfig,
  onSavePortfoliosConfig
}) => {
  const [activeBucketFilter, setActiveBucketFilter] = useState<PortfolioBucketKey | 'all'>('all');
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isAccountMapperOpen, setIsAccountMapperOpen] = useState(false);
  
  // Local configuration state
  const [config, setConfig] = useState<PortfoliosConfig>(portfoliosConfig);

  const handleUpdateConfig = (newConfig: PortfoliosConfig) => {
    setConfig(newConfig);
    onSavePortfoliosConfig(newConfig);
  };

  const activeAssets = assets.filter(a => a.status === 'Active');

  // Account Mapping Helper: Returns bucket key for an asset
  const getAssetBucket = (asset: AssetAccount): PortfolioBucketKey => {
    if (config.customAccountMappings[asset.id]) {
      return config.customAccountMappings[asset.id];
    }
    // Default fallback rules based on user prompt logic:
    if (asset.id === 'A-02' || asset.id === 'A-03' || asset.name.toLowerCase().includes('spcx') || asset.name.toLowerCase().includes('google stock')) {
      return 'nest_egg';
    }
    if (asset.id === 'A-05' || asset.name.toLowerCase().includes('checking')) {
      return 'spending';
    }
    if (asset.id === 'A-06' || asset.id === 'A-07' || asset.id === 'A-08' || asset.id === 'A-09' || asset.type === 'Cash / Bank') {
      return 'emergency';
    }
    if (asset.type === 'Traditional Financial Freedom' || asset.type === 'Taxable Investment') {
      return 'growth';
    }
    return 'growth';
  };

  // Group assets into buckets
  const assetsByBucket: Record<PortfolioBucketKey, AssetAccount[]> = {
    spending: [],
    income: [],
    emergency: [],
    growth: [],
    nest_egg: []
  };

  activeAssets.forEach(asset => {
    const bucketKey = getAssetBucket(asset);
    assetsByBucket[bucketKey].push(asset);
  });

  // Calculate bucket balances
  const bucketTotals: Record<PortfolioBucketKey, number> = {
    spending: assetsByBucket.spending.reduce((sum, a) => sum + a.currentValue, 0),
    income: assetsByBucket.income.reduce((sum, a) => sum + a.currentValue, 0),
    emergency: assetsByBucket.emergency.reduce((sum, a) => sum + a.currentValue, 0),
    growth: assetsByBucket.growth.reduce((sum, a) => sum + a.currentValue, 0),
    nest_egg: assetsByBucket.nest_egg.reduce((sum, a) => sum + a.currentValue, 0)
  };

  const totalAssetsValue = Object.values(bucketTotals).reduce((sum, v) => sum + v, 0);

  // 18-Month Emergency Fund Calculations
  const monthlyExpenseBase = config.useEssentialExpensesForEmergency
    ? metrics.essentialMonthlyExpenses
    : metrics.monthlyExpenses;
  
  const emergencyTarget18M = monthlyExpenseBase * config.emergencyTargetMonths; // 18 Months expenses
  const emergencyCurrent = bucketTotals.emergency;
  const emergencyMonthsCovered = monthlyExpenseBase > 0 ? emergencyCurrent / monthlyExpenseBase : 0;
  const emergencyFundingPct = emergencyTarget18M > 0 ? Math.min(100, (emergencyCurrent / emergencyTarget18M) * 100) : 0;
  const emergencyShortfall = Math.max(0, emergencyTarget18M - emergencyCurrent);

  // Nest Egg Breakdown (SPCX & GOOG)
  const spcxLots = taxLots.filter(t => t.ticker.toUpperCase() === 'SPCX');
  const googLots = taxLots.filter(t => t.ticker.toUpperCase() === 'GOOG');

  const spcxTotalShares = spcxLots.reduce((sum, l) => sum + l.shares, 0);
  const spcxTotalValue = spcxLots.reduce((sum, l) => sum + l.totalCurrentValue, 0);
  const googTotalShares = googLots.reduce((sum, l) => sum + l.shares, 0);
  const googTotalValue = googLots.reduce((sum, l) => sum + l.totalCurrentValue, 0);
  const nestEggTotalVal = spcxTotalValue + googTotalValue;

  const nestEggNWPercent = totalAssetsValue > 0 ? (nestEggTotalVal / totalAssetsValue) * 100 : 0;
  const annualDiversificationAmount = (nestEggTotalVal * config.nestEggAnnualDiversificationPct) / 100;

  // Monthly Income Distribution calculation
  const annualIncomeDistribution = config.monthlyDistributionFromIncome * 12;

  const handleAccountBucketChange = (assetId: string, newBucket: PortfolioBucketKey) => {
    const updatedMappings = {
      ...config.customAccountMappings,
      [assetId]: newBucket
    };
    handleUpdateConfig({
      ...config,
      customAccountMappings: updatedMappings
    });
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-gradient-to-br from-sky-500/20 to-amber-500/20 border border-sky-500/30 text-sky-400">
              <Layers className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                Portfolio Architecture
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                  5-Tier Wealth Strategy
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Tiered bucket allocation separating Spending, Equal Income Distributions, 18-Month Emergency Shield, Growth (&gt;18M), and SPCX/GOOG Nest Egg diversification.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAccountMapperOpen(!isAccountMapperOpen)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            <PieChart className="w-4 h-4 text-sky-400" />
            <span>Map Asset Accounts</span>
          </button>
          <button
            onClick={() => setIsEditingConfig(!isEditingConfig)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-lg shadow-sky-600/30 transition"
          >
            <Sliders className="w-4 h-4" />
            <span>Configure Strategy</span>
          </button>
        </div>
      </div>

      {/* Strategy Customization Panel (Collapsible) */}
      {isEditingConfig && (
        <div className="rounded-2xl border border-sky-500/30 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-white">Adjust 5-Tier Strategy Rules &amp; Targets</h3>
            </div>
            <button
              onClick={() => setIsEditingConfig(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Done Editing
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 18-Month Emergency Target */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-amber-500/20 space-y-3">
              <label className="text-xs font-semibold text-amber-300 flex items-center justify-between">
                <span>Emergency Fund Target (Months)</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-bold">
                  {config.emergencyTargetMonths} Months
                </span>
              </label>
              <input
                type="range"
                min="6"
                max="36"
                step="1"
                value={config.emergencyTargetMonths}
                onChange={e => handleUpdateConfig({ ...config, emergencyTargetMonths: Number(e.target.value) })}
                className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <input
                  type="checkbox"
                  id="useEssential"
                  checked={config.useEssentialExpensesForEmergency}
                  onChange={e => handleUpdateConfig({ ...config, useEssentialExpensesForEmergency: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500/40"
                />
                <label htmlFor="useEssential">Base target on essential expenses ({formatCurrency(metrics.essentialMonthlyExpenses)}/mo)</label>
              </div>
            </div>

            {/* Income to Spending Equal Distribution */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-indigo-500/20 space-y-3">
              <label className="text-xs font-semibold text-indigo-300 flex items-center justify-between">
                <span>Equal Distribution to Spending ($/mo)</span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-xs font-bold">
                  {formatCurrency(config.monthlyDistributionFromIncome)}/mo
                </span>
              </label>
              <input
                type="number"
                value={config.monthlyDistributionFromIncome}
                onChange={e => handleUpdateConfig({ ...config, monthlyDistributionFromIncome: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400">
                Annual transfer from Income to Spending account: <span className="font-semibold text-indigo-300">{formatCurrency(annualIncomeDistribution)}/yr</span>
              </p>
            </div>

            {/* Nest Egg Diversification Rate */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-rose-500/20 space-y-3">
              <label className="text-xs font-semibold text-rose-300 flex items-center justify-between">
                <span>Annual Nest Egg Diversification %</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-xs font-bold">
                  {config.nestEggAnnualDiversificationPct}% / Year
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={config.nestEggAnnualDiversificationPct}
                onChange={e => handleUpdateConfig({ ...config, nestEggAnnualDiversificationPct: Number(e.target.value) })}
                className="w-full accent-rose-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Tranche liquidating ~<span className="font-semibold text-rose-300">{formatCurrency(annualDiversificationAmount)}/yr</span> of SPCX &amp; GOOG into Growth &amp; Income.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Account Mapper Modal / Panel */}
      {isAccountMapperOpen && (
        <div className="rounded-2xl border border-sky-500/30 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-md animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PieChart className="w-5 h-5 text-sky-400" />
                Assign Asset Accounts to 5 Portfolios
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Map each custodial account to its strategic wealth bucket.</p>
            </div>
            <button
              onClick={() => setIsAccountMapperOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
            {activeAssets.map(asset => {
              const currentBucket = getAssetBucket(asset);
              return (
                <div key={asset.id} className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[200px]" title={asset.name}>{asset.name}</span>
                      <span className="text-[11px] font-mono text-emerald-400">{formatCurrency(asset.currentValue)}</span>
                    </div>
                    <p className="text-[10px] text-slate-400">{asset.institution} • {asset.type}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Assigned Portfolio:</span>
                    <select
                      value={currentBucket}
                      onChange={e => handleAccountBucketChange(asset.id, e.target.value as PortfolioBucketKey)}
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1 font-semibold focus:outline-none focus:border-sky-500"
                    >
                      <option value="spending">Spending</option>
                      <option value="income">Income</option>
                      <option value="emergency">Emergency (18M)</option>
                      <option value="growth">Growth (&gt;18M)</option>
                      <option value="nest_egg">Nest Egg (SPCX/GOOG)</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Capital Flow Architecture Diagram */}
      <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 p-6 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Sparkles className="w-64 h-64 text-sky-400" />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-sky-400 animate-spin-slow" />
            Dynamic Capital Flow &amp; Waterfall Architecture
          </h2>
          <span className="text-xs font-mono text-slate-400">Total Portfolio Value: <span className="font-bold text-white">{formatCurrency(totalAssetsValue)}</span></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {BUCKET_DEFINITIONS.map((def, idx) => {
            const Icon = def.icon;
            const balance = bucketTotals[def.key];
            const pct = totalAssetsValue > 0 ? (balance / totalAssetsValue) * 100 : 0;
            const count = assetsByBucket[def.key].length;

            return (
              <div
                key={def.key}
                onClick={() => setActiveBucketFilter(activeBucketFilter === def.key ? 'all' : def.key)}
                className={`relative cursor-pointer rounded-xl p-4 border transition-all duration-300 ${def.colorTheme.bg} ${
                  activeBucketFilter === def.key ? 'border-sky-400 ring-2 ring-sky-400/40 shadow-xl' : def.colorTheme.border
                }`}
              >
                {/* Step Connector Line */}
                {idx < 4 && (
                  <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10">
                    <ArrowRight className="w-4 h-4 text-slate-600" />
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${def.colorTheme.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${def.colorTheme.badgeBg}`}>
                    {pct.toFixed(1)}%
                  </span>
                </div>

                <h3 className="text-xs font-bold text-white tracking-tight">{def.name}</h3>
                <p className="text-[10px] text-slate-400 truncate mb-3">{def.tagline}</p>

                <div className="text-base font-bold font-mono text-white mb-1">
                  {formatCurrency(balance)}
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{count} {count === 1 ? 'Account' : 'Accounts'}</span>
                  <span className="text-slate-400 font-mono">{def.key === 'emergency' ? `${emergencyMonthsCovered.toFixed(1)} Mo` : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Portfolio Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          <button
            onClick={() => setActiveBucketFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeBucketFilter === 'all'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            All 5 Portfolios
          </button>
          {BUCKET_DEFINITIONS.map(def => (
            <button
              key={def.key}
              onClick={() => setActiveBucketFilter(def.key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center space-x-2 ${
                activeBucketFilter === def.key
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-md'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeBucketFilter === def.key ? 'bg-sky-400' : 'bg-slate-600'}`}></span>
              <span>{def.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Portfolio Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. SPENDING PORTFOLIO CARD */}
        {(activeBucketFilter === 'all' || activeBucketFilter === 'spending') && (
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/90 p-6 space-y-6 shadow-xl relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">1. Spending Portfolio</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">Checking Outflows</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Operating checking account where day-to-day spending comes through.</p>
                </div>
              </div>
              <span className="text-xl font-bold font-mono text-emerald-400">{formatCurrency(bucketTotals.spending)}</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Regular Incoming Equal Distribution:</span>
                <span className="font-bold font-mono text-indigo-400">+{formatCurrency(config.monthlyDistributionFromIncome)}/mo</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Monthly Spending Outlays:</span>
                <span className="font-bold font-mono text-rose-400">-{formatCurrency(metrics.monthlyExpenses)}/mo</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                <span className="text-slate-300 font-semibold">Net Operating Cash Flow:</span>
                <span className={`font-bold font-mono ${config.monthlyDistributionFromIncome - metrics.monthlyExpenses >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(config.monthlyDistributionFromIncome - metrics.monthlyExpenses)}/mo
                </span>
              </div>
            </div>

            {/* Assigned Accounts */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assigned Operating Accounts</h4>
              {assetsByBucket.spending.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No accounts assigned. Map Redwood Checking here.</p>
              ) : (
                <div className="space-y-2">
                  {assetsByBucket.spending.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                      <div>
                        <div className="font-bold text-white">{acc.name}</div>
                        <div className="text-[10px] text-slate-400">{acc.institution} • {acc.type}</div>
                      </div>
                      <div className="font-mono font-bold text-emerald-400">{formatCurrency(acc.currentValue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. INCOME PORTFOLIO CARD */}
        {(activeBucketFilter === 'all' || activeBucketFilter === 'income') && (
          <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-6 space-y-6 shadow-xl relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <ArrowDownRight className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">2. Income Portfolio</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold">Equal Distribution Pool</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Account from which we take equal distributions and put into spending on a regular basis.</p>
                </div>
              </div>
              <span className="text-xl font-bold font-mono text-indigo-400">{formatCurrency(bucketTotals.income)}</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Configured Monthly Transfer to Spending:</span>
                <span className="font-bold font-mono text-indigo-300">{formatCurrency(config.monthlyDistributionFromIncome)}/mo</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Annual Distribution Schedule:</span>
                <span className="font-bold font-mono text-white">{formatCurrency(annualIncomeDistribution)}/yr</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                <span className="text-slate-300 font-semibold">Distribution Source Health:</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Stable Equal Payouts
                </span>
              </div>
            </div>

            {/* Assigned Accounts */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assigned Income Accounts</h4>
              {assetsByBucket.income.length === 0 ? (
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300">
                  <p className="font-semibold mb-1">Income Distribution Engine Operational</p>
                  <p className="text-[11px] text-slate-400">Currently taking regular distributions directly from yield reserves &amp; salary inflows into Spending. You can map dedicated yield assets here using the account mapper.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assetsByBucket.income.map(acc => (
                    <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                      <div>
                        <div className="font-bold text-white">{acc.name}</div>
                        <div className="text-[10px] text-slate-400">{acc.institution} • {acc.type}</div>
                      </div>
                      <div className="font-mono font-bold text-indigo-400">{formatCurrency(acc.currentValue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. EMERGENCY PORTFOLIO CARD (18 MONTHS EXPENSES) */}
        {(activeBucketFilter === 'all' || activeBucketFilter === 'emergency') && (
          <div className="rounded-2xl border border-amber-500/30 bg-slate-900/90 p-6 space-y-6 shadow-xl relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">3. Emergency Portfolio</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">18 Months Target</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Capital preservation account holding exactly 18 Months of expenses.</p>
                </div>
              </div>
              <span className="text-xl font-bold font-mono text-amber-400">{formatCurrency(bucketTotals.emergency)}</span>
            </div>

            {/* 18-Month Target Metric Shield */}
            <div className="bg-slate-950/80 p-4 rounded-xl border border-amber-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">18-Month Expenses Target</div>
                  <div className="text-lg font-bold font-mono text-white">{formatCurrency(emergencyTarget18M)}</div>
                  <div className="text-[10px] text-slate-500">Calculated as 18 x {formatCurrency(monthlyExpenseBase)}/mo</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Current Runway</div>
                  <div className="text-lg font-bold font-mono text-amber-300">{emergencyMonthsCovered.toFixed(1)} / 18.0 Mo</div>
                  <div className="text-[10px] text-slate-500">{emergencyFundingPct.toFixed(1)}% of Goal</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, emergencyFundingPct)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0 Months</span>
                  <span>Goal: 18.0 Months</span>
                </div>
              </div>

              {emergencyShortfall > 0 ? (
                <div className="flex items-center space-x-2 text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Shortfall to 18-Month Goal: <span className="font-bold font-mono">{formatCurrency(emergencyShortfall)}</span>. Fill via Nest Egg diversification.</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>18-Month Emergency Capital Reserve Fully Funded!</span>
                </div>
              )}
            </div>

            {/* Assigned Accounts */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assigned Emergency Accounts</h4>
              <div className="space-y-2">
                {assetsByBucket.emergency.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-white">{acc.name}</div>
                      <div className="text-[10px] text-slate-400">{acc.institution} • {acc.type}</div>
                    </div>
                    <div className="font-mono font-bold text-amber-400">{formatCurrency(acc.currentValue)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. GROWTH PORTFOLIO CARD (BEYOND 18 MONTHS) */}
        {(activeBucketFilter === 'all' || activeBucketFilter === 'growth') && (
          <div className="rounded-2xl border border-purple-500/30 bg-slate-900/90 p-6 space-y-6 shadow-xl relative overflow-hidden group">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">4. Growth Portfolio</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">Beyond 18M Returns</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Higher compounding return engine for capital allocated beyond the 18-month emergency horizon.</p>
                </div>
              </div>
              <span className="text-xl font-bold font-mono text-purple-400">{formatCurrency(bucketTotals.growth)}</span>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Target Long-Term CAGR:</span>
                <span className="font-bold font-mono text-purple-300">{formatPercent(assumptions.preFinancialFreedomReturn)} / yr</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">5-Year Compounded Projection:</span>
                <span className="font-bold font-mono text-white">{formatCurrency(bucketTotals.growth * Math.pow(1 + assumptions.preFinancialFreedomReturn, 5))}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                <span className="text-slate-300 font-semibold">Investment Focus:</span>
                <span className="text-xs text-purple-300">Broad Index Funds, 401(k) &amp; Equities</span>
              </div>
            </div>

            {/* Assigned Accounts */}
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assigned Growth Accounts</h4>
              <div className="space-y-2">
                {assetsByBucket.growth.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-white">{acc.name}</div>
                      <div className="text-[10px] text-slate-400">{acc.institution} • {acc.type}</div>
                    </div>
                    <div className="font-mono font-bold text-purple-400">{formatCurrency(acc.currentValue)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. NEST EGG PORTFOLIO CARD (SPCX & GOOG ACTIVE MANAGEMENT) */}
        {(activeBucketFilter === 'all' || activeBucketFilter === 'nest_egg') && (
          <div className="lg:col-span-2 rounded-2xl border border-rose-500/30 bg-slate-900/90 p-6 space-y-6 shadow-xl relative overflow-hidden group">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Gem className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-white">5. Nest Egg Portfolio</h3>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                      SPCX &amp; GOOG Shares Active Diversification
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Core equity concentration actively managed, hedged, and systematically liquidated into Growth &amp; Income over time.</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold font-mono text-rose-400">{formatCurrency(bucketTotals.nest_egg)}</div>
                <div className="text-xs text-slate-400">{nestEggNWPercent.toFixed(1)}% of Total Portfolio Assets</div>
              </div>
            </div>

            {/* Holdings Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SPCX Holdings */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold text-xs">SPCX</span>
                    <span className="text-xs font-bold text-white">SpaceX Equity Stock</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{formatCurrency(spcxTotalValue)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Shares Held</span>
                    <span className="font-mono text-slate-200 font-bold">{spcxTotalShares.toLocaleString()} sh</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Liquidity / Status</span>
                    <span className="text-amber-400 font-semibold text-[11px]">Illiquid Private Stock</span>
                  </div>
                </div>
              </div>

              {/* GOOG Holdings */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">GOOG</span>
                    <span className="text-xs font-bold text-white">Google Vested Equity</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">{formatCurrency(googTotalValue)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Shares Held</span>
                    <span className="font-mono text-slate-200 font-bold">{googTotalShares.toLocaleString()} sh</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Liquidity / Status</span>
                    <span className="text-emerald-400 font-semibold text-[11px]">Immediate Public Stock</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Diversification Strategy Banner */}
            <div className="bg-slate-950/90 p-4 rounded-xl border border-rose-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-white">Active Options Hedging &amp; Multi-Year Diversification Roadmap</h4>
                  <p className="text-[11px] text-slate-400">
                    Systematically trimming <span className="font-semibold text-rose-300">{config.nestEggAnnualDiversificationPct}% (~{formatCurrency(annualDiversificationAmount)}/yr)</span> of Nest Egg into Growth and Income portfolios with option collars to limit downside risk.
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex items-center space-x-2">
                <span className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-mono font-bold border border-rose-500/30">
                  {config.nestEggAnnualDiversificationPct}% / Year Tranche
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
