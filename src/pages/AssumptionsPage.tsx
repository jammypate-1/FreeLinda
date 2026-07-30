import React, { useState } from 'react';
import { PlanningAssumptions } from '../types/financial';
import { formatPercent } from '../utils/financialCalculations';
import { Sliders, Save, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AssumptionsPageProps {
  assumptions: PlanningAssumptions;
  onSaveAssumptions: (assumptions: PlanningAssumptions) => void;
}

export const AssumptionsPage: React.FC<AssumptionsPageProps> = ({ assumptions, onSaveAssumptions }) => {
  const [formData, setFormData] = useState<PlanningAssumptions>(assumptions);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onSaveAssumptions(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Planning Assumptions & Baseline Parameters</h1>
          <p className="text-sm text-slate-400 mt-1">
            Global market parameters, inflation assumptions, return rates, retirement ages, and threshold watch limits.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs transition shadow-lg shadow-sky-600/30 flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Assumptions</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Planning parameters successfully saved! Dashboard & Retirement Engine updated.</span>
        </div>
      )}

      {/* Assumptions Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Economic & Return Assumptions */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Sliders className="w-5 h-5 text-sky-400" />
            <span>Economic Rates & Portfolio Returns</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-slate-300">General Inflation Rate</span>
                <span className="text-sky-400 font-bold">{formatPercent(formData.inflationRate)}</span>
              </div>
              <input
                type="range"
                min="0.00"
                max="0.10"
                step="0.0025"
                value={formData.inflationRate}
                onChange={e => setFormData({ ...formData, inflationRate: parseFloat(e.target.value) })}
                className="w-full accent-sky-500 bg-slate-950 rounded-lg h-2"
              />
              <p className="text-[11px] text-slate-500 mt-1">Applied to future purchasing power & living expenses.</p>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-slate-300">Pre-Retirement Portfolio Return</span>
                <span className="text-emerald-400 font-bold">{formatPercent(formData.preRetirementReturn)}</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.12"
                step="0.005"
                value={formData.preRetirementReturn}
                onChange={e => setFormData({ ...formData, preRetirementReturn: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 bg-slate-950 rounded-lg h-2"
              />
              <p className="text-[11px] text-slate-500 mt-1">Growth modeling rate prior to primary retirement age.</p>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-slate-300">Retirement Distribution Return</span>
                <span className="text-amber-400 font-bold">{formatPercent(formData.retirementReturn)}</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.10"
                step="0.005"
                value={formData.retirementReturn}
                onChange={e => setFormData({ ...formData, retirementReturn: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 bg-slate-950 rounded-lg h-2"
              />
              <p className="text-[11px] text-slate-500 mt-1">Conservative rate applied during retirement distribution phase.</p>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-slate-300">Cash / HYSA Yield</span>
                <span className="text-sky-300 font-bold">{formatPercent(formData.cashReturn)}</span>
              </div>
              <input
                type="range"
                min="0.00"
                max="0.07"
                step="0.0025"
                value={formData.cashReturn}
                onChange={e => setFormData({ ...formData, cashReturn: parseFloat(e.target.value) })}
                className="w-full accent-sky-300 bg-slate-950 rounded-lg h-2"
              />
              <p className="text-[11px] text-slate-500 mt-1">Annual interest yield on emergency cash reserves.</p>
            </div>
          </div>
        </div>

        {/* Planning Targets & Watch Thresholds */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
            <RefreshCw className="w-5 h-5 text-indigo-400" />
            <span>Target Ages & Risk Threshold Flags</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Primary Retirement Age Target</label>
              <input
                type="number"
                value={formData.primaryRetirementAge}
                onChange={e => setFormData({ ...formData, primaryRetirementAge: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Emergency Reserve Target (Months)</label>
              <input
                type="number"
                step="0.5"
                value={formData.emergencyFundMonthsTarget}
                onChange={e => setFormData({ ...formData, emergencyFundMonthsTarget: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">DTI Watch Limit (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.dtiWatchLimit}
                onChange={e => setFormData({ ...formData, dtiWatchLimit: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-sky-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Debt-to-Income alert trigger (default 36%)</p>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">High-Interest Debt Threshold (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.highInterestThreshold}
                onChange={e => setFormData({ ...formData, highInterestThreshold: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-sky-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">Interest rate trigger for priority debt paydown</p>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Estate Review Cadence (Years)</label>
              <input
                type="number"
                value={formData.estateReviewCadenceYears}
                onChange={e => setFormData({ ...formData, estateReviewCadenceYears: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">As-Of Date</label>
              <input
                type="date"
                value={formData.asOfDate}
                onChange={e => setFormData({ ...formData, asOfDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
