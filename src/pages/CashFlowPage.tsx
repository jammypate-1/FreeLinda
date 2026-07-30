import React, { useState } from 'react';
import { CashFlowItem } from '../types/financial';
import { formatCurrency } from '../utils/financialCalculations';
import { Wallet, Plus, Trash2, CheckCircle2, DollarSign, Filter, Layers } from 'lucide-react';

interface CashFlowPageProps {
  cashFlows: CashFlowItem[];
  onSaveCashFlows: (items: CashFlowItem[]) => void;
}

export const CashFlowPage: React.FC<CashFlowPageProps> = ({ cashFlows, onSaveCashFlows }) => {
  const [items, setItems] = useState<CashFlowItem[]>(cashFlows);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'Income' | 'Expense'>('ALL');

  const [newItem, setNewItem] = useState<Partial<CashFlowItem>>({
    type: 'Income',
    category: 'Salary & Wages',
    description: '',
    incomeTaxClassification: 'Earned',
    owner: 'Linda',
    frequency: 'Monthly',
    amountPerFrequency: 22000,
    essential: true,
    taxDeductible: false,
    notes: '',
    status: 'Active'
  });

  const handleSave = (updated: CashFlowItem[]) => {
    setItems(updated);
    onSaveCashFlows(updated);
  };

  const calculateAmounts = (amount: number, freq: CashFlowItem['frequency']) => {
    let monthly = amount;
    if (freq === 'Weekly') monthly = (amount * 52) / 12;
    else if (freq === 'Biweekly') monthly = (amount * 26) / 12;
    else if (freq === 'Quarterly') monthly = amount / 3;
    else if (freq === 'Annual') monthly = amount / 12;
    else if (freq === 'One-Time') monthly = amount / 12;

    return {
      monthlyAmount: Math.round(monthly * 100) / 100,
      annualAmount: Math.round(monthly * 12 * 100) / 100
    };
  };

  const handleAddItem = () => {
    if (!newItem.category && !newItem.description) return;
    const amount = Number(newItem.amountPerFrequency) || 0;
    const freq = newItem.frequency || 'Monthly';
    const { monthlyAmount, annualAmount } = calculateAmounts(amount, freq);

    const created: CashFlowItem = {
      id: `CF-${Date.now().toString().slice(-4)}`,
      type: newItem.type || 'Income',
      category: newItem.category || 'Income',
      description: newItem.description || newItem.category || 'Income Item',
      incomeTaxClassification: newItem.type === 'Income' ? (newItem.incomeTaxClassification || 'Earned') : undefined,
      owner: newItem.owner || 'Linda',
      frequency: freq,
      amountPerFrequency: amount,
      monthlyAmount,
      annualAmount,
      essential: !!newItem.essential,
      taxDeductible: !!newItem.taxDeductible,
      notes: newItem.notes || '',
      status: newItem.status || 'Active'
    };

    const next = [...items, created];
    handleSave(next);
    setIsAdding(false);
  };

  const handleDeleteItem = (id: string) => {
    const next = items.filter(i => i.id !== id);
    handleSave(next);
  };

  const activeItems = items.filter(i => i.status === 'Active');
  const totalMonthlyIncome = activeItems.filter(i => i.type === 'Income').reduce((sum, i) => sum + i.monthlyAmount, 0);
  const totalMonthlyExpenses = activeItems.filter(i => i.type === 'Expense').reduce((sum, i) => sum + i.monthlyAmount, 0);
  const monthlySurplus = totalMonthlyIncome - totalMonthlyExpenses;

  const filteredItems = items.filter(item => {
    if (activeTabFilter === 'ALL') return true;
    return item.type === activeTabFilter;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Household Cash Flow & Budgeting</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage recurring income streams (Earned, Unearned, Short/Long-Term Capital), living expenses, and monthly surplus.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition shadow-lg shadow-emerald-600/30 flex items-center space-x-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Income or Expense</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Total Monthly Income</p>
          <p className="text-2xl font-extrabold text-emerald-400">{formatCurrency(totalMonthlyIncome)}</p>
          <p className="text-xs text-slate-500">{formatCurrency(totalMonthlyIncome * 12)} annual gross income</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Total Monthly Expenses</p>
          <p className="text-2xl font-extrabold text-rose-400">{formatCurrency(totalMonthlyExpenses)}</p>
          <p className="text-xs text-slate-500">{formatCurrency(totalMonthlyExpenses * 12)} annual living expenses</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 bg-gradient-to-br from-slate-900 to-sky-950/40">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Monthly Net Cash Surplus</p>
          <p className={`text-2xl font-extrabold ${monthlySurplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(monthlySurplus)}
          </p>
          <p className="text-xs text-slate-400">{monthlySurplus >= 0 ? 'Surplus for retirement investment compounding' : 'Monthly deficit'}</p>
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Add Cash Flow Record (Income / Expense)</span>
            </h3>
            <span className="text-xs text-slate-400">Classify Earned, Unearned, Short-Term or Long-Term Capital</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Type</label>
              <select
                value={newItem.type}
                onChange={e => setNewItem({ ...newItem, type: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              >
                <option value="Income">Income (+)</option>
                <option value="Expense">Expense (-)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Description / Source Name</label>
              <input
                type="text"
                value={newItem.description || ''}
                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                placeholder="e.g. Software Engineer Base Salary / Rental Income"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Category</label>
              <input
                type="text"
                value={newItem.category || ''}
                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                placeholder="e.g. Employment / Real Estate / Housing"
              />
            </div>

            {newItem.type === 'Income' && (
              <div>
                <label className="block text-emerald-400 font-bold mb-1">Income Tax Classification</label>
                <select
                  value={newItem.incomeTaxClassification || 'Earned'}
                  onChange={e => setNewItem({ ...newItem, incomeTaxClassification: e.target.value as any })}
                  className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-2.5 text-emerald-400 font-bold focus:outline-none"
                >
                  <option value="Earned">Earned Income (W-2 / Salary / Self-Employment)</option>
                  <option value="Unearned">Unearned Income (Interest / Dividends / Pensions)</option>
                  <option value="Short Term Capital">Short-Term Capital Gains (&lt; 1 Yr)</option>
                  <option value="Long Term Capital">Long-Term Capital Gains (&gt; 1 Yr)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Frequency</label>
              <select
                value={newItem.frequency}
                onChange={e => setNewItem({ ...newItem, frequency: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Monthly">Monthly</option>
                <option value="Biweekly">Bi-Weekly</option>
                <option value="Weekly">Weekly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Amount per Frequency ($)</label>
              <input
                type="number"
                value={newItem.amountPerFrequency}
                onChange={e => setNewItem({ ...newItem, amountPerFrequency: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6 text-xs text-slate-300 pt-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newItem.essential}
                onChange={e => setNewItem({ ...newItem, essential: e.target.checked })}
                className="accent-emerald-500 rounded w-4 h-4"
              />
              <span>Essential Baseline Cash Flow?</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddItem}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/30"
            >
              Save Cash Flow Item
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs & Cash Flow Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-3 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">Cash Flow Register</h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 p-1.5 rounded-xl text-xs">
            <button
              onClick={() => setActiveTabFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                activeTabFilter === 'ALL' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Items ({items.length})
            </button>
            <button
              onClick={() => setActiveTabFilter('Income')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                activeTabFilter === 'Income' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Income Streams ({items.filter(i => i.type === 'Income').length})
            </button>
            <button
              onClick={() => setActiveTabFilter('Expense')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                activeTabFilter === 'Expense' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Expenses ({items.filter(i => i.type === 'Expense').length})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Description / Source</th>
                <th className="py-3.5 px-4">Classification / Category</th>
                <th className="py-3.5 px-4">Frequency</th>
                <th className="py-3.5 px-4 text-right">Amount / Freq</th>
                <th className="py-3.5 px-4 text-right">Monthly Equivalent</th>
                <th className="py-3.5 px-4 text-right">Annual Equivalent</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.type === 'Income'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-white">{item.description || item.category}</p>
                    <p className="text-[10px] text-slate-400">{item.owner}</p>
                  </td>
                  <td className="py-3 px-4">
                    {item.type === 'Income' && item.incomeTaxClassification ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        item.incomeTaxClassification === 'Earned' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                        item.incomeTaxClassification === 'Unearned' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        item.incomeTaxClassification === 'Long Term Capital' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {item.incomeTaxClassification} Income
                      </span>
                    ) : (
                      <span className="text-slate-400">{item.category}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-medium">{item.frequency}</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.amountPerFrequency)}</td>
                  <td className={`py-3 px-4 text-right font-bold ${item.type === 'Income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.type === 'Income' ? '+' : '-'}{formatCurrency(item.monthlyAmount)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300 font-semibold">{formatCurrency(item.annualAmount)}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition rounded-lg hover:bg-slate-800"
                      title="Delete Cash Flow Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
