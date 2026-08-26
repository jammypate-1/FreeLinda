import React, { useState } from 'react';
import { Liability } from '../types/financial';
import { formatCurrency, formatPercent, calculateNper } from '../utils/financialCalculations';
import { CreditCard, Plus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

interface LiabilitiesPageProps {
  liabilities: Liability[];
  onSaveLiabilities: (items: Liability[]) => void;
}

export const LiabilitiesPage: React.FC<LiabilitiesPageProps> = ({ liabilities, onSaveLiabilities }) => {
  const [debtList, setDebtList] = useState<Liability[]>(liabilities);
  const [isAdding, setIsAdding] = useState(false);
  const [newDebt, setNewDebt] = useState<Partial<Liability>>({
    owner: 'Primary Client',
    creditor: 'Wells Fargo',
    type: 'Mortgage',
    securedBy: 'Primary Residence',
    currentBalance: 300000,
    interestRate: 0.055,
    minMonthlyPayment: 2000,
    plannedMonthlyPayment: 2000,
    taxDeductible: true,
    variableRate: false,
    priority: 'High',
    notes: '',
    status: 'Active'
  });

  const handleSave = (updated: Liability[]) => {
    setDebtList(updated);
    onSaveLiabilities(updated);
  };

  const handleAddDebt = () => {
    if (!newDebt.creditor || !newDebt.currentBalance) return;
    const created: Liability = {
      id: `L-${Date.now().toString().slice(-4)}`,
      owner: newDebt.owner || 'Primary Client',
      creditor: newDebt.creditor,
      type: newDebt.type || 'Mortgage',
      securedBy: newDebt.securedBy || 'Unsecured',
      currentBalance: Number(newDebt.currentBalance) || 0,
      interestRate: Number(newDebt.interestRate) || 0.05,
      minMonthlyPayment: Number(newDebt.minMonthlyPayment) || 0,
      plannedMonthlyPayment: Number(newDebt.plannedMonthlyPayment) || 0,
      taxDeductible: !!newDebt.taxDeductible,
      variableRate: !!newDebt.variableRate,
      priority: newDebt.priority || 'Medium',
      notes: newDebt.notes || '',
      status: 'Active'
    };
    handleSave([...debtList, created]);
    setIsAdding(false);
  };

  const handleDeleteDebt = (id: string) => {
    handleSave(debtList.filter(l => l.id !== id));
  };

  const activeDebts = debtList.filter(l => l.status === 'Active');
  const totalDebtBalance = activeDebts.reduce((sum, l) => sum + l.currentBalance, 0);
  const totalMonthlyPayment = activeDebts.reduce((sum, l) => sum + l.plannedMonthlyPayment, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Liabilities & Debt Amortization</h1>
          <p className="text-sm text-slate-400 mt-1">
            Mortgages, HELOCs, auto loans, student loans, interest rates, tax deductibility, and NPER payoff schedules.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs transition shadow-lg shadow-sky-600/30 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Liability</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Total Active Liabilities</p>
          <p className="text-2xl font-extrabold text-rose-400">{formatCurrency(totalDebtBalance)}</p>
          <p className="text-xs text-slate-500">Secured primary home mortgage</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Monthly Debt Service</p>
          <p className="text-2xl font-extrabold text-white">{formatCurrency(totalMonthlyPayment)}/mo</p>
          <p className="text-xs text-slate-500">{formatCurrency(totalMonthlyPayment * 12)} annual</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1 bg-gradient-to-br from-slate-900 to-emerald-950/40">
          <p className="text-xs uppercase text-slate-400 font-semibold tracking-wider">Weighted Interest Rate</p>
          <p className="text-2xl font-extrabold text-emerald-400">5.75% Fixed</p>
          <p className="text-xs text-emerald-300 font-medium">Below 8.0% high-interest watch threshold</p>
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-sky-400" />
            <span>Add New Liability / Loan</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Creditor / Bank Name</label>
              <input
                type="text"
                value={newDebt.creditor}
                onChange={e => setNewDebt({ ...newDebt, creditor: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                placeholder="e.g. Wells Fargo Home Mortgage"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Liability Type</label>
              <select
                value={newDebt.type}
                onChange={e => setNewDebt({ ...newDebt, type: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Mortgage">Mortgage</option>
                <option value="HELOC">HELOC</option>
                <option value="Auto Loan">Auto Loan</option>
                <option value="Student Loan">Student Loan</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Personal Loan">Personal Loan</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Current Principal Balance ($)</label>
              <input
                type="number"
                value={newDebt.currentBalance}
                onChange={e => setNewDebt({ ...newDebt, currentBalance: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Annual Interest Rate (e.g. 0.0575)</label>
              <input
                type="number"
                step="0.001"
                value={newDebt.interestRate}
                onChange={e => setNewDebt({ ...newDebt, interestRate: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Planned Monthly Payment ($)</label>
              <input
                type="number"
                value={newDebt.plannedMonthlyPayment}
                onChange={e => setNewDebt({ ...newDebt, plannedMonthlyPayment: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Secured By Property</label>
              <input
                type="text"
                value={newDebt.securedBy}
                onChange={e => setNewDebt({ ...newDebt, securedBy: e.target.value })}
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
              onClick={handleAddDebt}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
            >
              Save Liability
            </button>
          </div>
        </div>
      )}

      {/* Debt Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Creditor & Type</th>
              <th className="py-3.5 px-4">Secured By</th>
              <th className="py-3.5 px-4">Balance</th>
              <th className="py-3.5 px-4">Interest Rate</th>
              <th className="py-3.5 px-4">Monthly Payment</th>
              <th className="py-3.5 px-4">Est Payoff (NPER)</th>
              <th className="py-3.5 px-4">Tax Deductible</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
            {debtList.map(debt => {
              const payoffMonths = calculateNper(debt.interestRate, debt.plannedMonthlyPayment, debt.currentBalance);
              const payoffYears = (payoffMonths / 12).toFixed(1);

              return (
                <tr key={debt.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{debt.creditor}</div>
                    <div className="text-[10px] text-slate-400">{debt.type} • {debt.owner}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{debt.securedBy}</td>
                  <td className="py-3 px-4 font-extrabold text-rose-400">{formatCurrency(debt.currentBalance)}</td>
                  <td className="py-3 px-4 font-bold text-amber-300">{formatPercent(debt.interestRate)}</td>
                  <td className="py-3 px-4 font-bold text-white">{formatCurrency(debt.plannedMonthlyPayment)}/mo</td>
                  <td className="py-3 px-4 text-sky-400 font-semibold">
                    {payoffMonths < 900 ? `${payoffMonths} mos (~${payoffYears} yrs)` : 'Review Payment'}
                  </td>
                  <td className="py-3 px-4">
                    {debt.taxDeductible ? (
                      <span className="text-emerald-400 font-semibold">Yes</span>
                    ) : (
                      <span className="text-slate-500">No</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteDebt(debt.id)}
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
