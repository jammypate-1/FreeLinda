import React, { useState } from 'react';
import { AssetAccount } from '../types/financial';
import { formatCurrency, formatPercent } from '../utils/financialCalculations';
import { Building2, Plus, Trash2, CheckCircle2, Shield } from 'lucide-react';

interface AssetsPageProps {
  assets: AssetAccount[];
  onSaveAssets: (assets: AssetAccount[]) => void;
}

export const AssetsPage: React.FC<AssetsPageProps> = ({ assets, onSaveAssets }) => {
  const [assetList, setAssetList] = useState<AssetAccount[]>(assets);
  const [isAdding, setIsAdding] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<AssetAccount>>({
    name: '',
    type: 'Taxable Investment',
    institution: 'Fidelity',
    accountLast4: '1234',
    taxRegistration: 'Individual Taxable',
    liquidity: 'Immediate',
    allocationCategory: 'Equities',
    currentValue: 50000,
    costBasis: 40000,
    monthlyContribution: 500,
    annualReturn: 0.07,
    status: 'Active',
    notes: ''
  });

  const handleSave = (updated: AssetAccount[]) => {
    setAssetList(updated);
    onSaveAssets(updated);
  };

  const handleToggleStatus = (id: string) => {
    const updated = assetList.map(a =>
      a.id === id ? { ...a, status: (a.status === 'Active' ? 'Inactive' : 'Active') as AssetAccount['status'] } : a
    );
    handleSave(updated);
  };

  const handleAddAsset = () => {
    if (!newAsset.name) return;
    const created: AssetAccount = {
      id: `A-${Date.now().toString().slice(-4)}`,
      name: newAsset.name,
      type: newAsset.type || 'Taxable Investment',
      institution: newAsset.institution || 'Custodian',
      accountLast4: newAsset.accountLast4 || '0000',
      taxRegistration: newAsset.taxRegistration || 'Individual',
      liquidity: newAsset.liquidity || 'Immediate',
      allocationCategory: newAsset.allocationCategory || 'Equities',
      currentValue: Number(newAsset.currentValue) || 0,
      costBasis: Number(newAsset.costBasis) || 0,
      monthlyContribution: Number(newAsset.monthlyContribution) || 0,
      annualReturn: Number(newAsset.annualReturn) || 0.06,
      status: 'Active',
      notes: newAsset.notes || '',
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    handleSave([...assetList, created]);
    setIsAdding(false);
  };

  const handleDeleteAsset = (id: string) => {
    handleSave(assetList.filter(a => a.id !== id));
  };

  const activeAssets = assetList.filter(a => a.status === 'Active');
  const totalAssetValue = activeAssets.reduce((sum, a) => sum + a.currentValue, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Assets & Account Register</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track bank accounts, taxable portfolios, 401(k) / IRAs, HSAs, private equity, and real estate properties.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs transition shadow-lg shadow-sky-600/30 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account / Asset</span>
        </button>
      </div>

      {/* Total Asset Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Active Asset Valuation</p>
          <p className="text-3xl font-extrabold text-white mt-1">{formatCurrency(totalAssetValue)}</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p><strong className="text-sky-400">{activeAssets.length} Active Accounts</strong> included in dashboard</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Toggle active/inactive switch to simulate scenarios</p>
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>Add New Asset Account</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Account / Asset Name</label>
              <input
                type="text"
                value={newAsset.name}
                onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                placeholder="e.g. Fidelity Brokerage Account"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Asset Type</label>
              <select
                value={newAsset.type}
                onChange={e => setNewAsset({ ...newAsset, type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Cash / Bank">Cash / Bank</option>
                <option value="Taxable Investment">Taxable Investment</option>
                <option value="Traditional Retirement">Traditional Retirement</option>
                <option value="Roth Retirement">Roth Retirement</option>
                <option value="HSA">HSA</option>
                <option value="Real Estate">Real Estate</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Custodian / Institution</label>
              <input
                type="text"
                value={newAsset.institution}
                onChange={e => setNewAsset({ ...newAsset, institution: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Current Market Value ($)</label>
              <input
                type="number"
                value={newAsset.currentValue}
                onChange={e => setNewAsset({ ...newAsset, currentValue: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Cost Basis ($)</label>
              <input
                type="number"
                value={newAsset.costBasis}
                onChange={e => setNewAsset({ ...newAsset, costBasis: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Monthly Contribution ($)</label>
              <input
                type="number"
                value={newAsset.monthlyContribution}
                onChange={e => setNewAsset({ ...newAsset, monthlyContribution: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAsset}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
            >
              Save Asset Account
            </button>
          </div>
        </div>
      )}

      {/* Asset Accounts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Account / Asset Name</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Institution</th>
              <th className="py-3.5 px-4">Current Value</th>
              <th className="py-3.5 px-4">Cost Basis</th>
              <th className="py-3.5 px-4">Unrealized P&L</th>
              <th className="py-3.5 px-4">Monthly Contrib</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
            {assetList.map(asset => {
              const gainLoss = asset.currentValue - asset.costBasis;
              const gainLossPct = asset.costBasis > 0 ? (gainLoss / asset.costBasis) * 100 : 0;
              const isActive = asset.status === 'Active';

              return (
                <tr key={asset.id} className={`hover:bg-slate-800/40 transition ${!isActive ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{asset.name}</div>
                    <div className="text-[10px] text-slate-400">{asset.notes}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-sky-400 border border-slate-700">
                      {asset.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{asset.institution}</td>
                  <td className="py-3 px-4 font-extrabold text-white">{formatCurrency(asset.currentValue)}</td>
                  <td className="py-3 px-4 text-slate-400">{formatCurrency(asset.costBasis)}</td>
                  <td className="py-3 px-4 font-semibold">
                    {gainLoss >= 0 ? (
                      <span className="text-emerald-400">+{formatCurrency(gainLoss)} ({gainLossPct.toFixed(1)}%)</span>
                    ) : (
                      <span className="text-rose-400">{formatCurrency(gainLoss)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sky-400 font-medium">
                    {asset.monthlyContribution > 0 ? `${formatCurrency(asset.monthlyContribution)}/mo` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleStatus(asset.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {asset.status}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
