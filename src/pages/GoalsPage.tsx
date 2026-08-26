import React, { useState } from 'react';
import { Goal } from '../types/financial';
import { formatCurrency } from '../utils/financialCalculations';
import { Target, Plus, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

interface GoalsPageProps {
  goals: Goal[];
  onSaveGoals: (goals: Goal[]) => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({ goals, onSaveGoals }) => {
  const [goalList, setGoalList] = useState<Goal[]>(goals);
  const [isAdding, setIsAdding] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    name: '',
    owner: 'Primary Client',
    planningArea: 'Retirement',
    priority: 'High',
    targetDate: '2055-05-15',
    targetAmount: 1000000,
    currentFunding: 0,
    monthlySavings: 1000,
    expectedReturn: 0.06,
    status: 'On Track',
    notes: ''
  });

  const handleSave = (updated: Goal[]) => {
    setGoalList(updated);
    onSaveGoals(updated);
  };

  const handleAddGoal = () => {
    if (!newGoal.name) return;
    const created: Goal = {
      id: `G-${Date.now().toString().slice(-4)}`,
      name: newGoal.name || 'New Goal',
      owner: newGoal.owner || 'Primary Client',
      planningArea: newGoal.planningArea || 'Retirement',
      priority: (newGoal.priority as 'High' | 'Medium' | 'Low') || 'High',
      targetDate: newGoal.targetDate || '2050-01-01',
      targetAmount: Number(newGoal.targetAmount) || 0,
      currentFunding: Number(newGoal.currentFunding) || 0,
      monthlySavings: Number(newGoal.monthlySavings) || 0,
      expectedReturn: Number(newGoal.expectedReturn) || 0.06,
      status: (newGoal.status as Goal['status']) || 'On Track',
      notes: newGoal.notes || ''
    };
    const next = [...goalList, created];
    handleSave(next);
    setIsAdding(false);
  };

  const handleDeleteGoal = (id: string) => {
    const next = goalList.filter(g => g.id !== id);
    handleSave(next);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Financial Goals & Objectives</h1>
          <p className="text-sm text-slate-400 mt-1">
            Capture, prioritize, and track funding progress for retirement, debt payoff, education, and major capital expenditures.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs transition shadow-lg shadow-sky-600/30 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Goal</span>
        </button>
      </div>

      {/* Add Goal Modal/Form */}
      {isAdding && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Target className="w-4 h-4 text-sky-400" />
            <span>Create New Household Goal</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Goal Name</label>
              <input
                type="text"
                value={newGoal.name}
                onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                placeholder="e.g. Vacation Home / Early Retirement"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Planning Area</label>
              <select
                value={newGoal.planningArea}
                onChange={e => setNewGoal({ ...newGoal, planningArea: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Retirement">Retirement</option>
                <option value="Debt Paydown">Debt Paydown</option>
                <option value="Education">Education</option>
                <option value="Major Purchase">Major Purchase</option>
                <option value="Legacy">Legacy</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Priority</label>
              <select
                value={newGoal.priority}
                onChange={e => setNewGoal({ ...newGoal, priority: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Target Amount ($)</label>
              <input
                type="number"
                value={newGoal.targetAmount}
                onChange={e => setNewGoal({ ...newGoal, targetAmount: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Current Funding ($)</label>
              <input
                type="number"
                value={newGoal.currentFunding}
                onChange={e => setNewGoal({ ...newGoal, currentFunding: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Monthly Savings Contribution ($)</label>
              <input
                type="number"
                value={newGoal.monthlySavings}
                onChange={e => setNewGoal({ ...newGoal, monthlySavings: Number(e.target.value) })}
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
              onClick={handleAddGoal}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
            >
              Save Goal
            </button>
          </div>
        </div>
      )}

      {/* Goal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goalList.map(goal => {
          const fundingPct = Math.min(100, Math.round((goal.currentFunding / goal.targetAmount) * 100)) || 0;
          const fundingGap = Math.max(0, goal.targetAmount - goal.currentFunding);

          return (
            <div key={goal.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-sky-400" />
                  <h3 className="text-base font-bold text-white">{goal.name}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {goal.priority} Priority
                  </span>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                    title="Delete goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-semibold">Target Amount</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(goal.targetAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-semibold">Current Funding</p>
                  <p className="text-sm font-bold text-emerald-400">{formatCurrency(goal.currentFunding)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-semibold">Funding Gap</p>
                  <p className="text-sm font-bold text-amber-400">{formatCurrency(fundingGap)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Funding Progress</span>
                  <span className="text-sky-400">{fundingPct}% Funded</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${fundingPct}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Status: <strong className="text-white">{goal.status}</strong></span>
                </div>
                <div>Monthly Savings: <strong className="text-sky-400">{formatCurrency(goal.monthlySavings)}/mo</strong></div>
              </div>

              {goal.notes && (
                <p className="text-[11px] text-slate-500 italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50">
                  {goal.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
