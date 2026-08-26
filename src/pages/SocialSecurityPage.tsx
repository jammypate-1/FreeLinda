import React from 'react';
import { SocialSecurityScenario } from '../types/financial';
import { formatCurrency } from '../utils/financialCalculations';
import { ShieldCheck, Award, TrendingUp, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface SocialSecurityPageProps {
  scenarios: SocialSecurityScenario[];
}

export const SocialSecurityPage: React.FC<SocialSecurityPageProps> = ({ scenarios }) => {
  // Generate cumulative lifetime benefit data for ages 62 through 90
  const breakEvenData = [];
  for (let age = 62; age <= 90; age++) {
    const claim62 = Math.max(0, (age - 61) * 25200);
    const claim67 = age >= 67 ? (age - 66) * 36000 : 0;
    const claim70 = age >= 70 ? (age - 69) * 44640 : 0;

    let optimal = 'Claim at 62';
    if (claim70 > claim67 && claim70 > claim62) optimal = 'Claim at 70';
    else if (claim67 > claim62) optimal = 'Claim at 67';

    breakEvenData.push({
      age,
      'Claim at 62': claim62,
      'Claim at 67 (FRA)': claim67,
      'Claim at 70': claim70,
      optimal
    });
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Social Security Claiming Optimizer</h1>
        <p className="text-sm text-slate-400 mt-1">
          Compare early claiming at Age 62 vs Full Retirement Age (67) vs delayed credits at Age 70 with cumulative break-even analysis.
        </p>
      </div>

      {/* Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Early Claiming</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
              Age 62
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">30% reduction from Primary Insurance Amount (PIA)</p>
          <div>
            <p className="text-2xl font-extrabold text-white">{formatCurrency(2100)}/mo</p>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">{formatCurrency(25200)} annually</p>
          </div>
          <div className="pt-2 text-xs text-slate-400 space-y-1 border-t border-slate-800/80">
            <p>• Cumulative by Age 75: <strong className="text-slate-200">{formatCurrency(327600)}</strong></p>
            <p>• Cumulative by Age 85: <strong className="text-slate-200">{formatCurrency(579600)}</strong></p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border-sky-500/30">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Full Retirement Age (FRA)</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
              Age 67
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">100% Primary Insurance Amount (PIA Baseline)</p>
          <div>
            <p className="text-2xl font-extrabold text-sky-400">{formatCurrency(3000)}/mo</p>
            <p className="text-xs text-sky-300 font-semibold mt-0.5">{formatCurrency(36000)} annually</p>
          </div>
          <div className="pt-2 text-xs text-slate-300 space-y-1 border-t border-slate-800/80">
            <p>• Cumulative by Age 75: <strong className="text-white">{formatCurrency(288000)}</strong></p>
            <p>• Cumulative by Age 85: <strong className="text-white">{formatCurrency(648000)}</strong></p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Delayed Credits</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Age 70
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">24% delayed retirement credits (+8%/yr past FRA)</p>
          <div>
            <p className="text-2xl font-extrabold text-emerald-400">{formatCurrency(3720)}/mo</p>
            <p className="text-xs text-emerald-300 font-semibold mt-0.5">{formatCurrency(44640)} annually</p>
          </div>
          <div className="pt-2 text-xs text-slate-400 space-y-1 border-t border-slate-800/80">
            <p>• Cumulative by Age 75: <strong className="text-slate-200">{formatCurrency(223200)}</strong></p>
            <p>• Cumulative by Age 85: <strong className="text-slate-200">{formatCurrency(669600)}</strong></p>
          </div>
        </div>
      </div>

      {/* Cumulative Break-Even Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-sky-400" />
            <span>Cumulative Lifetime Benefit Comparison (Break-Even Matrix)</span>
          </h3>
          <span className="text-xs text-slate-400">Break-even crossover occurs at ~Age 80</span>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakEvenData.filter(d => d.age % 2 === 0)} margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="age" label={{ value: 'Age', position: 'insideBottom', offset: -5 }} stroke="#64748b" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} stroke="#64748b" />
              <Tooltip
                formatter={(val: number) => formatCurrency(val)}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
              />
              <Legend />
              <Bar dataKey="Claim at 62" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Claim at 67 (FRA)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Claim at 70" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
