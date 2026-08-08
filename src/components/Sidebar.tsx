import React from 'react';
import {
  LayoutDashboard,
  User,
  Sliders,
  Wallet,
  Building2,
  TrendingUp,
  CreditCard,
  LineChart,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  CheckSquare,
  Calculator,
  FileText
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Overview' },
    { id: 'profile', label: 'Client Profile', icon: User, category: 'Overview' },
    { id: 'assumptions', label: 'Assumptions', icon: Sliders, category: 'Overview' },

    { id: 'cashflow', label: 'Cash Flow', icon: Wallet, category: 'Financial Plan' },
    { id: 'assets', label: 'Assets & Accounts', icon: Building2, category: 'Financial Plan' },
    { id: 'taxlots', label: 'Tax Lots & Equity', icon: TrendingUp, category: 'Financial Plan' },
    { id: 'liabilities', label: 'Liabilities & Debt', icon: CreditCard, category: 'Financial Plan' },

    { id: 'projection', label: 'Retirement Engine', icon: LineChart, category: 'Analysis & Strategy' },
    { id: 'taxes', label: 'Taxes', icon: Calculator, category: 'Analysis & Strategy' },
    { id: 'socialsecurity', label: 'Social Security', icon: ShieldCheck, category: 'Analysis & Strategy' },
    { id: 'hedge', label: 'Hedge', icon: ShieldAlert, category: 'Analysis & Strategy' },

    { id: 'estate', label: 'Estate & Beneficiaries', icon: FileCheck, category: 'Governance' },
    { id: 'documents', label: 'Vault & Action Plan', icon: CheckSquare, category: 'Governance' },
    { id: 'meetingnotes', label: 'Meeting Notes & Strategy', icon: FileText, category: 'Governance' },
  ];

  const categories = Array.from(new Set(navItems.map(item => item.category)));

  return (
    <aside className="w-16 sm:w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      {/* Left-Justified Luxury 3D Gold & Emerald Wealth Crest Logo */}
      <div className="p-2 sm:p-4 border-b border-slate-800/80 flex items-center justify-center sm:justify-start sm:px-5">
        <div className="relative group flex items-center justify-center">
          <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-500 to-sky-500 opacity-30 blur-md group-hover:opacity-70 transition duration-500"></div>
          <div className="relative w-11 h-11 rounded-2xl bg-slate-950 border border-amber-500/30 flex items-center justify-center shadow-2xl">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 7V12C3 17.5228 7.02944 22.1953 12 23C16.9706 22.1953 21 17.5228 21 12V7L12 2Z" stroke="url(#gold-grad)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 6L16 10L12 18L8 10L12 6Z" fill="url(#emerald-grad)" opacity="0.9"/>
              <path d="M12 6V18" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="gold-grad" x1="3" y1="2" x2="21" y2="23" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#f59e0b" />
                  <stop offset="0.5" stopColor="#fbbf24" />
                  <stop offset="1" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="emerald-grad" x1="8" y1="6" x2="16" y2="18" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#10b981" />
                  <stop offset="1" stopColor="#0284c7" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-2 sm:px-3 space-y-2 sm:space-y-6">
        {categories.map(category => (
          <div key={category} className="space-y-1">
            <h3 className="hidden sm:block px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {category}
            </h3>
            {navItems
              .filter(item => item.category === category)
              .map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    aria-label={item.label}
                    title={item.label}
                    className={`w-full flex items-center justify-center sm:justify-start sm:space-x-3 px-2 sm:px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </aside>
  );
};
