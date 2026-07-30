import React from 'react';
import { DashboardMetrics, ClientProfile } from '../types/financial';
import { formatCurrency } from '../utils/financialCalculations';
import { ShieldCheck, RotateCcw, AlertTriangle } from 'lucide-react';

interface NavbarProps {
  metrics: DashboardMetrics;
  profile: ClientProfile;
}

export const Navbar: React.FC<NavbarProps> = ({ metrics, profile }) => {
  return (
    <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-20 px-8 py-3.5 flex items-center justify-between">
      {/* Left: Client context */}
      <div className="flex items-center space-x-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white">{profile.name}'s Wealth & Retirement Suite</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {profile.occupation}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Age {profile.age} • {profile.residency}
          </p>
        </div>
      </div>

      {/* Right: Key metrics summary bar */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-6">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Net Worth</p>
            <p className="text-sm font-bold text-emerald-400">{formatCurrency(metrics.netWorth)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Liquid Reserve</p>
            <p className="text-sm font-bold text-sky-400">{formatCurrency(metrics.liquidAssets)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Emergency Reserve</p>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold text-amber-300">
                {metrics.emergencyFundMonths.toFixed(1)} mos
              </span>
              {metrics.emergencyFundMonths >= 6 ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
