import React, { useState, useMemo, useEffect } from 'react';
import { TaxLot } from '../types/financial';
import { formatCurrency } from '../utils/financialCalculations';
import { initialTaxLots } from '../data/initialData';
import { TrendingUp, Plus, Trash2, Search, Filter, Sparkles, RotateCcw, ArrowDownUp } from 'lucide-react';

interface TaxLotsPageProps {
  taxLots: TaxLot[];
  onSaveTaxLots: (lots: TaxLot[]) => void;
}

export const TaxLotsPage: React.FC<TaxLotsPageProps> = ({ taxLots, onSaveTaxLots }) => {
  const [lotList, setLotList] = useState<TaxLot[]>(taxLots);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicker, setSelectedTicker] = useState<string>('ALL');
  const [selectedTerm, setSelectedTerm] = useState<string>('ALL');

  // Sync lotList when taxLots prop updates
  useEffect(() => {
    if (taxLots && taxLots.length > 0) {
      setLotList(taxLots);
    }
  }, [taxLots]);

  // Optimizer states
  const [targetCash, setTargetCash] = useState<number>(50000);
  const [stTaxRate, setStTaxRate] = useState<number>(0.35); // 35% short-term ordinary rate
  const [ltTaxRate, setLtTaxRate] = useState<number>(0.20); // 20% long-term capital gain rate
  
  // Map of lot.id -> shares to sell
  const [selectedLotShares, setSelectedLotShares] = useState<Record<string, number>>({});

  const handleResetToSheetLots = () => {
    setLotList(initialTaxLots);
    onSaveTaxLots(initialTaxLots);
    setSelectedLotShares({});
  };

  // Filtering tax lots
  const filteredLots = useMemo(() => {
    return lotList.filter(lot => {
      const matchesSearch =
        lot.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lot.assetName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTicker = selectedTicker === 'ALL' || lot.ticker === selectedTicker;
      const matchesTerm = selectedTerm === 'ALL' || lot.term === selectedTerm;

      return matchesSearch && matchesTicker && matchesTerm;
    });
  }, [lotList, searchTerm, selectedTicker, selectedTerm]);

  // Total Portfolio Metrics
  const totalCostBasis = useMemo(() => lotList.reduce((sum, l) => sum + l.totalCostBasis, 0), [lotList]);
  const totalMarketValue = useMemo(() => lotList.reduce((sum, l) => sum + l.totalCurrentValue, 0), [lotList]);
  const totalGainLoss = totalMarketValue - totalCostBasis;

  // Tickers list for filter dropdown
  const tickers = useMemo(() => Array.from(new Set(lotList.map(l => l.ticker))), [lotList]);

  // Strategy 1: Min Tax / Loss First (Highest Cost Basis Per Share first)
  const applyMinTaxStrategy = () => {
    let cashNeeded = targetCash;
    const newSelected: Record<string, number> = {};

    // Sort lots by gain per dollar (losses first, then lowest gain %)
    const sortedLots = [...lotList].sort((a, b) => {
      const aGainPerShare = a.currentPrice - a.costBasisPerShare;
      const bGainPerShare = b.currentPrice - b.costBasisPerShare;
      return aGainPerShare - bGainPerShare; // Most negative gain (largest loss) first
    });

    for (const lot of sortedLots) {
      if (cashNeeded <= 0) break;
      const lotValue = lot.shares * lot.currentPrice;

      if (lotValue <= cashNeeded) {
        newSelected[lot.id] = lot.shares;
        cashNeeded -= lotValue;
      } else {
        const sharesToSell = cashNeeded / lot.currentPrice;
        newSelected[lot.id] = Math.round(sharesToSell * 1000) / 1000;
        cashNeeded = 0;
      }
    }

    setSelectedLotShares(newSelected);
  };

  // Strategy 2: Long-Term Gains First
  const applyLongTermFirstStrategy = () => {
    let cashNeeded = targetCash;
    const newSelected: Record<string, number> = {};

    // Sort: Long Term first, then lowest gain
    const sortedLots = [...lotList].sort((a, b) => {
      if (a.term === 'Long Term' && b.term !== 'Long Term') return -1;
      if (a.term !== 'Long Term' && b.term === 'Long Term') return 1;
      const aGain = a.currentPrice - a.costBasisPerShare;
      const bGain = b.currentPrice - b.costBasisPerShare;
      return aGain - bGain;
    });

    for (const lot of sortedLots) {
      if (cashNeeded <= 0) break;
      const lotValue = lot.shares * lot.currentPrice;

      if (lotValue <= cashNeeded) {
        newSelected[lot.id] = lot.shares;
        cashNeeded -= lotValue;
      } else {
        const sharesToSell = cashNeeded / lot.currentPrice;
        newSelected[lot.id] = Math.round(sharesToSell * 1000) / 1000;
        cashNeeded = 0;
      }
    }

    setSelectedLotShares(newSelected);
  };

  // Calculate Real-Time Harvest Metrics for Selected Lots
  const harvestSummary = useMemo(() => {
    let grossCash = 0;
    let totalCost = 0;
    let shortTermGain = 0;
    let longTermGain = 0;

    Object.entries(selectedLotShares).forEach(([lotId, sharesToSell]) => {
      if (sharesToSell <= 0) return;
      const lot = lotList.find(l => l.id === lotId);
      if (!lot) return;

      const saleValue = sharesToSell * lot.currentPrice;
      const costBasisPart = sharesToSell * lot.costBasisPerShare;
      const gain = saleValue - costBasisPart;

      grossCash += saleValue;
      totalCost += costBasisPart;

      if (lot.term === 'Short Term') {
        shortTermGain += gain;
      } else {
        longTermGain += gain;
      }
    });

    const stTax = Math.max(0, shortTermGain) * stTaxRate;
    const ltTax = Math.max(0, longTermGain) * ltTaxRate;
    const estimatedTax = stTax + ltTax;
    const netCash = grossCash - estimatedTax;

    return {
      grossCash,
      totalCost,
      shortTermGain,
      longTermGain,
      totalGain: shortTermGain + longTermGain,
      estimatedTax,
      netCash
    };
  }, [selectedLotShares, lotList, stTaxRate, ltTaxRate]);

  const handleShareChange = (lotId: string, shares: number) => {
    const next = { ...selectedLotShares, [lotId]: Math.max(0, shares) };
    if (shares <= 0) delete next[lotId];
    setSelectedLotShares(next);
  };

  const toggleLotSelection = (lot: TaxLot) => {
    if (selectedLotShares[lot.id]) {
      const next = { ...selectedLotShares };
      delete next[lot.id];
      setSelectedLotShares(next);
    } else {
      setSelectedLotShares({ ...selectedLotShares, [lot.id]: lot.shares });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Reload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Tax-Efficient Tax Lot Selector & Harvest Optimizer</h1>
          <p className="text-sm text-slate-400 mt-1">
            All {lotList.length} individual tax lots loaded from tax lot inventory. Select specific lots to sell for optimal tax minimization.
          </p>
        </div>
        <button
          onClick={handleResetToSheetLots}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold rounded-lg text-xs transition border border-slate-700 flex items-center space-x-2 shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset All 123 Tax Lots</span>
        </button>
      </div>

      {/* Portfolio Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Total Tax Lot Cost Basis</p>
          <p className="text-2xl font-extrabold text-white">{formatCurrency(totalCostBasis)}</p>
          <p className="text-xs text-slate-500">Across {lotList.length} tax lots</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Current Market Value</p>
          <p className="text-2xl font-extrabold text-sky-400">{formatCurrency(totalMarketValue)}</p>
          <p className="text-xs text-slate-500">Google, SpaceX, Keysight & Agilent</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 bg-gradient-to-br from-slate-900 to-emerald-950/40">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Total Unrealized Capital Gain</p>
          <p className="text-2xl font-extrabold text-emerald-400">+{formatCurrency(totalGainLoss)}</p>
          <p className="text-xs text-emerald-300 font-medium">
            +{(totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0).toFixed(1)}% unrealized gain
          </p>
        </div>
      </div>

      {/* TAX-EFFICIENT HARVEST OPTIMIZER CONTROL PANEL */}
      <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 space-y-6 shadow-xl bg-gradient-to-b from-slate-900 via-slate-900 to-sky-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-sky-400 animate-pulse" />
            <h2 className="text-base font-bold text-white">Tax-Efficient Income / Liquidation Harvest Optimizer</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={applyMinTaxStrategy}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow flex items-center space-x-1.5"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
              <span>Auto-Select Min Tax (HIFO / Loss First)</span>
            </button>
            <button
              onClick={applyLongTermFirstStrategy}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow flex items-center space-x-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Auto-Select Long-Term First</span>
            </button>
            <button
              onClick={() => setSelectedLotShares({})}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
            >
              Clear Selection
            </button>
          </div>
        </div>

        {/* Input Parameters for Optimizer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Target Net Cash Income Needed ($)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-500 font-bold">$</span>
              <input
                type="number"
                step="5000"
                value={targetCash}
                onChange={e => setTargetCash(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-white font-bold focus:outline-none focus:border-sky-500 text-sm"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Specific income amount to raise via tax lots</p>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Estimated Short-Term Tax Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={stTaxRate}
              onChange={e => setStTaxRate(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-sky-500 text-sm"
            />
            <p className="text-[10px] text-slate-500 mt-1">Ordinary income marginal tax rate (e.g. 35%)</p>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Estimated Long-Term Capital Gains Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={ltTaxRate}
              onChange={e => setLtTaxRate(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-sky-500 text-sm"
            />
            <p className="text-[10px] text-slate-500 mt-1">Preferential LT capital gains rate (e.g. 20%)</p>
          </div>
        </div>

        {/* Real-Time Harvest Strategy Calculation Breakdown */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
          <div>
            <p className="text-[10px] uppercase text-slate-500 font-semibold">Gross Cash Raised</p>
            <p className="text-lg font-bold text-white">{formatCurrency(harvestSummary.grossCash)}</p>
            <p className="text-[10px] text-slate-400">Target: {formatCurrency(targetCash)}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase text-slate-500 font-semibold">ST Capital Gain/Loss</p>
            <p className={`text-lg font-bold ${harvestSummary.shortTermGain >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {harvestSummary.shortTermGain >= 0 ? '+' : ''}{formatCurrency(harvestSummary.shortTermGain)}
            </p>
            <p className="text-[10px] text-slate-500">Taxed @ {(stTaxRate * 100).toFixed(0)}%</p>
          </div>

          <div>
            <p className="text-[10px] uppercase text-slate-500 font-semibold">LT Capital Gain/Loss</p>
            <p className={`text-lg font-bold ${harvestSummary.longTermGain >= 0 ? 'text-sky-400' : 'text-emerald-400'}`}>
              {harvestSummary.longTermGain >= 0 ? '+' : ''}{formatCurrency(harvestSummary.longTermGain)}
            </p>
            <p className="text-[10px] text-slate-500">Taxed @ {(ltTaxRate * 100).toFixed(0)}%</p>
          </div>

          <div>
            <p className="text-[10px] uppercase text-slate-500 font-semibold">Est. Tax Impact</p>
            <p className="text-lg font-bold text-rose-400">{formatCurrency(harvestSummary.estimatedTax)}</p>
            <p className="text-[10px] text-slate-500">Total ST + LT tax due</p>
          </div>

          <div>
            <p className="text-[10px] uppercase text-slate-500 font-semibold">Net After-Tax Proceeds</p>
            <p className="text-lg font-extrabold text-emerald-400">{formatCurrency(harvestSummary.netCash)}</p>
            <p className="text-[10px] text-emerald-300">Actual pocketed cash</p>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by Ticker (GOOG, SPCX, A, KEYS) or Asset..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3 text-xs w-full md:w-auto">
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Ticker:</span>
            <select
              value={selectedTicker}
              onChange={e => setSelectedTicker(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-semibold focus:outline-none"
            >
              <option value="ALL">All Tickers</option>
              {tickers.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Term:</span>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-semibold focus:outline-none"
            >
              <option value="ALL">All Terms</option>
              <option value="Short Term">Short Term</option>
              <option value="Long Term">Long Term</option>
            </select>
          </div>
        </div>
      </div>

      {/* ALL TAX LOTS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span>All Individual Tax Lots ({filteredLots.length} Lots Shown)</span>
          </h3>
          <span className="text-xs text-slate-400">
            {Object.keys(selectedLotShares).length} lots currently selected for harvest
          </span>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider sticky top-0 border-b border-slate-800 z-10">
              <tr>
                <th className="py-3.5 px-4">Select</th>
                <th className="py-3.5 px-4">ID & Ticker</th>
                <th className="py-3.5 px-4">Acquisition Date</th>
                <th className="py-3.5 px-4">Term</th>
                <th className="py-3.5 px-4">Available Shares</th>
                <th className="py-3.5 px-4">Cost Basis / Sh</th>
                <th className="py-3.5 px-4">Current Price</th>
                <th className="py-3.5 px-4">Total Cost Basis</th>
                <th className="py-3.5 px-4">Current Value</th>
                <th className="py-3.5 px-4">Unrealized Gain / Loss</th>
                <th className="py-3.5 px-4 text-right">Harvest Shares</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredLots.map(lot => {
                const isSelected = !!selectedLotShares[lot.id];
                const sharesToSell = selectedLotShares[lot.id] || 0;
                const isLoss = lot.unrealizedGainLoss < 0;

                return (
                  <tr
                    key={lot.id}
                    className={`hover:bg-slate-800/40 transition ${
                      isSelected ? 'bg-sky-950/40 border-l-4 border-sky-400' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLotSelection(lot)}
                        className="accent-sky-500 w-4 h-4 rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {lot.ticker}
                        </span>
                        <span className="font-bold text-white truncate max-w-[120px]">{lot.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{lot.acquisitionDate}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          lot.term === 'Long Term'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {lot.term}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{lot.shares.toLocaleString()} sh</td>
                    <td className="py-3 px-4 text-slate-300">{formatCurrency(lot.costBasisPerShare)}</td>
                    <td className="py-3 px-4 font-bold text-sky-300">{formatCurrency(lot.currentPrice)}</td>
                    <td className="py-3 px-4 text-slate-400">{formatCurrency(lot.totalCostBasis)}</td>
                    <td className="py-3 px-4 font-extrabold text-white">{formatCurrency(lot.totalCurrentValue)}</td>
                    <td className="py-3 px-4 font-bold">
                      {isLoss ? (
                        <span className="text-rose-400">
                          {formatCurrency(lot.unrealizedGainLoss)} ({lot.unrealizedGainLossPct.toFixed(1)}%) [LOSS HARVEST]
                        </span>
                      ) : (
                        <span className="text-emerald-400">
                          +{formatCurrency(lot.unrealizedGainLoss)} (+{lot.unrealizedGainLossPct.toFixed(1)}%)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        step="0.1"
                        max={lot.shares}
                        min="0"
                        value={sharesToSell || ''}
                        onChange={e => handleShareChange(lot.id, Number(e.target.value))}
                        placeholder="0"
                        className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right text-white font-bold focus:outline-none focus:border-sky-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
