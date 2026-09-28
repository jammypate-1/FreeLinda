import React, { useState, useMemo } from 'react';
import { PlanningAssumptions, DashboardMetrics, TaxLot, CashFlowItem } from '../types/financial';
import { formatCurrency, formatPercent } from '../utils/financialCalculations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';
import {
  HeartPulse,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  Zap,
  Star,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  Check,
  X,
  FileText,
  Building2,
  Calendar,
  Plus,
  ExternalLink,
  Calculator
} from 'lucide-react';

interface HealthcarePageProps {
  assumptions: PlanningAssumptions;
  metrics: DashboardMetrics;
  taxLots?: TaxLot[];
  cashFlows?: CashFlowItem[];
}

export interface HealthPlan {
  id: string;
  name: string;
  carrier: 'Kaiser Permanente' | 'Blue Shield of CA' | 'Anthem Blue Cross' | 'Employer COBRA';
  tier: 'Bronze 60' | 'Silver 70' | 'Gold 80' | 'Platinum 90' | 'COBRA Benchmark';
  networkType: 'HMO' | 'PPO' | 'EPO';
  hsaEligible: boolean;
  grossMonthlyPremium: number;
  deductibleMedical: number;
  deductibleDrug: number;
  maxOutOfPocket: number;
  primaryCareCopay: string;
  specialistCopay: string;
  erVisitCopay: string;
  genericDrugCopay: string;
  rating: number;
  notes: string;
  badgeColor: string;
  planUrl: string;
}

const COVERED_CA_PLANS: HealthPlan[] = [
  {
    id: 'COBRA-01',
    name: 'Employer Group PPO Continuation (COBRA)',
    carrier: 'Employer COBRA',
    tier: 'COBRA Benchmark',
    networkType: 'PPO',
    hsaEligible: false,
    grossMonthlyPremium: 780,
    deductibleMedical: 500,
    deductibleDrug: 0,
    maxOutOfPocket: 3500,
    primaryCareCopay: '$25',
    specialistCopay: '$40',
    erVisitCopay: '$250 after deductible',
    genericDrugCopay: '$10',
    rating: 4.8,
    notes: 'Same employer PPO network. No subsidies apply. Limited to 18 months max.',
    badgeColor: 'sky',
    planUrl: 'https://www.dol.gov/general/topic/health-plans/cobra'
  },
  {
    id: 'CCA-BRONZE-HSA',
    name: 'Kaiser / Blue Shield Bronze 60 HDHP (HSA-Compatible)',
    carrier: 'Blue Shield of CA',
    tier: 'Bronze 60',
    networkType: 'PPO',
    hsaEligible: true,
    grossMonthlyPremium: 410,
    deductibleMedical: 7500,
    deductibleDrug: 0,
    maxOutOfPocket: 7500,
    primaryCareCopay: '0% after deductible ($0 preventive)',
    specialistCopay: '0% after deductible',
    erVisitCopay: '0% after deductible',
    genericDrugCopay: '0% after deductible',
    rating: 4.5,
    notes: 'Eligible for HSA ($4,300/yr tax deduction). Lowest premium option.',
    badgeColor: 'amber',
    planUrl: 'https://www.coveredca.com/health/coverage-levels/bronze'
  },
  {
    id: 'CCA-SILVER-70',
    name: 'Covered CA Silver 70 (Kaiser / Blue Shield)',
    carrier: 'Kaiser Permanente',
    tier: 'Silver 70',
    networkType: 'HMO',
    hsaEligible: false,
    grossMonthlyPremium: 530,
    deductibleMedical: 5400,
    deductibleDrug: 150,
    maxOutOfPocket: 9100,
    primaryCareCopay: '$50 (No deductible)',
    specialistCopay: '$90 (No deductible)',
    erVisitCopay: '$450 after deductible',
    genericDrugCopay: '$15',
    rating: 4.7,
    notes: 'ACA Benchmark plan. First 3 office visits not subject to medical deductible.',
    badgeColor: 'emerald',
    planUrl: 'https://www.coveredca.com/health/coverage-levels/silver'
  },
  {
    id: 'CCA-GOLD-80',
    name: 'Covered CA Gold 80 (Anthem / Blue Shield)',
    carrier: 'Anthem Blue Cross',
    tier: 'Gold 80',
    networkType: 'EPO',
    hsaEligible: false,
    grossMonthlyPremium: 640,
    deductibleMedical: 0,
    deductibleDrug: 0,
    maxOutOfPocket: 8700,
    primaryCareCopay: '$35',
    specialistCopay: '$65',
    erVisitCopay: '$350',
    genericDrugCopay: '$15',
    rating: 4.6,
    notes: 'Zero medical deductible! Predictable copays for all office visits & Rx.',
    badgeColor: 'amber',
    planUrl: 'https://www.coveredca.com/health/coverage-levels/gold'
  },
  {
    id: 'CCA-PLATINUM-90',
    name: 'Covered CA Platinum 90 (Kaiser Permanente)',
    carrier: 'Kaiser Permanente',
    tier: 'Platinum 90',
    networkType: 'HMO',
    hsaEligible: false,
    grossMonthlyPremium: 750,
    deductibleMedical: 0,
    deductibleDrug: 0,
    maxOutOfPocket: 4500,
    primaryCareCopay: '$15',
    specialistCopay: '$30',
    erVisitCopay: '$200',
    genericDrugCopay: '$5',
    rating: 4.9,
    notes: 'Comprehensive top-tier coverage with lowest copays & lowest max OOP.',
    badgeColor: 'indigo',
    planUrl: 'https://www.coveredca.com/health/coverage-levels/platinum'
  },
  {
    id: 'CCA-ANTHEM-PLATINUM-90',
    name: 'Covered CA Anthem Platinum 90 PPO',
    carrier: 'Anthem Blue Cross',
    tier: 'Platinum 90',
    networkType: 'PPO',
    hsaEligible: false,
    grossMonthlyPremium: 790,
    deductibleMedical: 0,
    deductibleDrug: 0,
    maxOutOfPocket: 4500,
    primaryCareCopay: '$15',
    specialistCopay: '$30',
    erVisitCopay: '$200',
    genericDrugCopay: '$5',
    rating: 4.8,
    notes: 'Top-tier Anthem PPO network with zero medical deductible, direct specialist access, and low copays.',
    badgeColor: 'indigo',
    planUrl: 'https://www.coveredca.com/health/coverage-levels/platinum'
  }
];

export const HealthcarePage: React.FC<HealthcarePageProps> = ({ assumptions, metrics }) => {
  // Client default: San Leandro, Alameda County (Region 1), Single, Age 37 in 2027
  const FPL_BASE_2026 = 15060; // 2026/2027 Federal Poverty Level for 1-person household

  // Simulated controllable post-financial-freedom MAGI (e.g. capital gains harvested)
  const [magiInput, setMagiInput] = useState<number>(48000);

  // Utilization selection preset mode vs Custom out-of-pocket dollar expense input
  const [utilization, setUtilization] = useState<'low' | 'medium' | 'high'>('medium');
  const [customExpenseMode, setCustomExpenseMode] = useState<boolean>(false);
  const [customExpectedExpense, setCustomExpectedExpense] = useState<number>(1500);

  // Filter selections
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [hsaOnly, setHsaOnly] = useState<boolean>(false);

  // Selected plans for side-by-side comparison (IDs)
  const [comparedPlanIds, setComparedPlanIds] = useState<string[]>(['CCA-BRONZE-HSA', 'CCA-SILVER-70', 'COBRA-01']);

  // Calculate ACA Advanced Premium Tax Credit (APTC) Subsidy
  const subsidyCalculation = useMemo(() => {
    const fplPercentage = (magiInput / FPL_BASE_2026) * 100;
    const benchmarkSilverGrossAnnual = 530 * 12; // $6,360/yr gross

    let requiredContributionPct = 0.085; // Max 8.5% of MAGI under ACA Inflation Reduction Act extension

    if (fplPercentage <= 150) {
      requiredContributionPct = 0.00;
    } else if (fplPercentage <= 200) {
      requiredContributionPct = 0.00 + ((fplPercentage - 150) / 50) * 0.02;
    } else if (fplPercentage <= 250) {
      requiredContributionPct = 0.02 + ((fplPercentage - 200) / 50) * 0.02;
    } else if (fplPercentage <= 400) {
      requiredContributionPct = 0.04 + ((fplPercentage - 250) / 150) * 0.045;
    } else {
      requiredContributionPct = 0.085;
    }

    const maxRequiredAnnualContribution = magiInput * requiredContributionPct;
    const annualSubsidy = Math.max(0, benchmarkSilverGrossAnnual - maxRequiredAnnualContribution);
    const monthlySubsidy = Math.round(annualSubsidy / 12);

    return {
      fplPercentage: Math.round(fplPercentage),
      requiredContributionPct: Math.round(requiredContributionPct * 1000) / 10,
      annualSubsidy: Math.round(annualSubsidy),
      monthlySubsidy,
      isSubsidized: monthlySubsidy > 0
    };
  }, [magiInput]);

  // Calculate Net Monthly Premiums & Total Annual Costs for each plan
  const planCalculations = useMemo(() => {
    return COVERED_CA_PLANS.map(plan => {
      // COBRA does not receive Covered CA subsidies
      const monthlySubsidy = plan.carrier === 'Employer COBRA' ? 0 : subsidyCalculation.monthlySubsidy;
      const netMonthlyPremium = Math.max(0, plan.grossMonthlyPremium - monthlySubsidy);
      const annualNetPremium = netMonthlyPremium * 12;

      // Calculate Expected Medical Out-of-Pocket Expenses
      let expectedMedicalExpenses = 200;
      if (customExpenseMode) {
        // Capped by plan's maximum out-of-pocket limit
        expectedMedicalExpenses = Math.min(plan.maxOutOfPocket, customExpectedExpense);
      } else {
        if (utilization === 'low') expectedMedicalExpenses = 200;
        else if (utilization === 'medium') expectedMedicalExpenses = Math.min(plan.maxOutOfPocket, Math.max(800, plan.deductibleMedical * 0.5 + 400));
        else if (utilization === 'high') expectedMedicalExpenses = plan.maxOutOfPocket;
      }

      const totalAnnualCost = Math.round(annualNetPremium + expectedMedicalExpenses);

      // Estimated HSA Federal + CA Tax Shield if plan is HSA eligible ($4,300 max contribution)
      const hsaTaxSavings = plan.hsaEligible ? Math.round(4300 * 0.28) : 0; // ~28% combined tax rate

      return {
        ...plan,
        monthlySubsidy,
        netMonthlyPremium,
        annualNetPremium,
        expectedMedicalExpenses: Math.round(expectedMedicalExpenses),
        totalAnnualCost,
        hsaTaxSavings
      };
    });
  }, [subsidyCalculation, utilization, customExpenseMode, customExpectedExpense]);

  // Filtered plans list
  const filteredPlans = useMemo(() => {
    return planCalculations.filter(plan => {
      if (selectedCarrier !== 'all' && plan.carrier !== selectedCarrier) return false;
      if (selectedTier !== 'all' && plan.tier !== selectedTier) return false;
      if (hsaOnly && !plan.hsaEligible) return false;
      return true;
    });
  }, [planCalculations, selectedCarrier, selectedTier, hsaOnly]);

  const toggleComparePlan = (id: string) => {
    setComparedPlanIds(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : prev.length < 3
        ? [...prev, id]
        : [prev[1], prev[2], id]
    );
  };

  const comparedPlans = planCalculations.filter(p => comparedPlanIds.includes(p.id));

  // Recharts total annual cost comparison dataset
  const chartData = planCalculations.map(p => ({
    name: p.tier === 'COBRA Benchmark' ? 'COBRA PPO' : p.tier,
    carrier: p.carrier,
    AnnualPremium: p.annualNetPremium,
    OutofPocketExpenses: p.expectedMedicalExpenses,
    TotalCost: p.totalAnnualCost
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Overview Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <HeartPulse className="w-7 h-7 text-rose-500" />
            <span>Healthcare & Covered California Planner</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Evaluate, compare, and optimize health insurance coverage for Linda's early financial freedom starting <strong className="text-sky-400 font-bold">April 2027 (Age 37)</strong> in San Leandro, Alameda County (Rating Region 1).
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 p-2 rounded-xl shrink-0">
          <div className="text-xs">
            <span className="text-slate-400">Coverage Location: </span>
            <span className="font-bold text-white">San Leandro, CA 94577 (Region 1)</span>
          </div>
        </div>
      </div>

      {/* ACA Subsidy (APTC) Interactive Calculator Spotlight Banner */}
      <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 space-y-6 shadow-xl bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Interactive Covered CA Subsidy (APTC) Modeler</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate Covered California Advanced Premium Tax Credits based on Linda's controllable post-financial-freedom MAGI.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            Alameda County Benchmark: $530/mo
          </span>
        </div>

        {/* Slider & Subsidy Key Metric Badges */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">Estimated Post-Financial Freedom MAGI:</span>
              <span className="text-xl font-black text-sky-400 font-mono">{formatCurrency(magiInput)} / year</span>
            </div>
            <input
              type="range"
              min="20000"
              max="140000"
              step="2000"
              value={magiInput}
              onChange={e => setMagiInput(Number(e.target.value))}
              className="w-full accent-sky-500 bg-slate-950 rounded-lg h-2.5 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
              <span>$20,000 (Subsidized)</span>
              <span>$48,000 (Default MAGI)</span>
              <span>$60,240 (400% FPL)</span>
              <span>$140,000 (Unsubsidized)</span>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">FPL Percentage</p>
              <p className="text-xl font-extrabold text-white mt-1">{subsidyCalculation.fplPercentage}% FPL</p>
              <p className="text-[10px] text-slate-500">1-Person ($15,060 baseline)</p>
            </div>

            <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3 text-center">
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Estimated Monthly Subsidy</p>
              <p className="text-xl font-black text-emerald-400 mt-1">+${subsidyCalculation.monthlySubsidy}/mo</p>
              <p className="text-[10px] text-slate-400">({formatCurrency(subsidyCalculation.annualSubsidy)}/yr tax credit)</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Max Required Premium</p>
              <p className="text-xl font-extrabold text-sky-400 mt-1">{subsidyCalculation.requiredContributionPct}% MAGI</p>
              <p className="text-[10px] text-slate-500">({formatCurrency(Math.round(magiInput * (subsidyCalculation.requiredContributionPct / 100) / 12))}/mo cap)</p>
            </div>
          </div>
        </div>
      </div>

      {/* HIGHLIGHT: Custom Expected Healthcare Expenses Input & Utilization Controls */}
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-5 shadow-xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Expected Annual Healthcare Expenses & Utilization Modeler</h3>
              <p className="text-xs text-slate-400">Specify Linda's exact anticipated out-of-pocket medical expenses for the year to see precise total plan cost comparisons.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setCustomExpenseMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                !customExpenseMode
                  ? 'bg-sky-600 text-white border-sky-500 shadow'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Preset Utilization Tiers
            </button>
            <button
              type="button"
              onClick={() => setCustomExpenseMode(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                customExpenseMode
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              ✏️ Custom Dollar Budget
            </button>
          </div>
        </div>

        {!customExpenseMode ? (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-300 font-semibold">Select Utilization Level:</span>
            <button
              type="button"
              onClick={() => setUtilization('low')}
              className={`px-3 py-1.5 rounded-lg font-bold transition border ${
                utilization === 'low'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              🌱 Low / Preventive ($200/yr)
            </button>
            <button
              type="button"
              onClick={() => setUtilization('medium')}
              className={`px-3 py-1.5 rounded-lg font-bold transition border ${
                utilization === 'medium'
                  ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              ⚡ Medium / Moderate (~$2,500/yr)
            </button>
            <button
              type="button"
              onClick={() => setUtilization('high')}
              className={`px-3 py-1.5 rounded-lg font-bold transition border ${
                utilization === 'high'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              🚨 High / Hospital Stay (Max OOP Limit)
            </button>
          </div>
        ) : (
          <div className="space-y-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300">
                  Linda's Anticipated Annual Out-of-Pocket Medical Expenses:
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Includes doctor copays, prescriptions, lab tests, scans, and therapies before plan deductible/max OOP limits.
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs text-slate-400">$</span>
                <input
                  type="number"
                  min="0"
                  max="15000"
                  step="250"
                  value={customExpectedExpense}
                  onChange={e => setCustomExpectedExpense(Math.max(0, Number(e.target.value)))}
                  className="w-32 bg-slate-900 border border-emerald-500/50 rounded-lg px-3 py-1.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400"
                />
                <span className="text-xs text-slate-400">/ year</span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="12000"
              step="250"
              value={customExpectedExpense}
              onChange={e => setCustomExpectedExpense(Number(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-900 rounded-lg h-2.5 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
              <span>$0 (100% Healthy)</span>
              <span>$1,500 (Moderate Care)</span>
              <span>$5,000 (Major Visits & Rx)</span>
              <span>$12,000 (Max Out-of-Pocket Cap)</span>
            </div>
          </div>
        )}

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-4 text-xs border-t border-slate-800/80 pt-3">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Carrier Filter</label>
            <select
              value={selectedCarrier}
              onChange={e => setSelectedCarrier(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-semibold focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Carriers</option>
              <option value="Kaiser Permanente">Kaiser Permanente</option>
              <option value="Blue Shield of CA">Blue Shield of CA</option>
              <option value="Anthem Blue Cross">Anthem Blue Cross</option>
              <option value="Employer COBRA">Employer COBRA</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Metal Tier</label>
            <select
              value={selectedTier}
              onChange={e => setSelectedTier(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-semibold focus:outline-none focus:border-sky-500"
            >
              <option value="all">All Tiers</option>
              <option value="Bronze 60">Bronze 60</option>
              <option value="Silver 70">Silver 70</option>
              <option value="Gold 80">Gold 80</option>
              <option value="Platinum 90">Platinum 90</option>
              <option value="COBRA Benchmark">COBRA Benchmark</option>
            </select>
          </div>

          <div className="pt-5">
            <label className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white transition">
              <input
                type="checkbox"
                checked={hsaOnly}
                onChange={e => setHsaOnly(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500/20"
              />
              <span className="font-semibold text-amber-400">HSA-Eligible Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Covered California & COBRA Plan Comparison Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-sky-400" />
            <span>Alameda County Covered CA Health Plans ({filteredPlans.length} Available)</span>
          </h3>
          <span className="text-xs text-slate-400">Click "Compare" on up to 3 plans for detailed side-by-side matrix</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map(plan => {
            const isCompared = comparedPlanIds.includes(plan.id);

            return (
              <div
                key={plan.id}
                className={`bg-slate-900 border rounded-2xl p-5 space-y-4 relative flex flex-col justify-between transition-all duration-200 ${
                  isCompared
                    ? 'border-sky-400 ring-1 ring-sky-400/40 shadow-xl shadow-sky-950/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      plan.tier === 'Bronze 60' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      plan.tier === 'Silver 70' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      plan.tier === 'Gold 80' ? 'bg-amber-400/10 text-amber-300 border border-amber-400/20' :
                      plan.tier === 'Platinum 90' ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {plan.tier}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      {plan.hsaEligible && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          HSA Compatible
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800">
                        {plan.networkType}
                      </span>
                    </div>
                  </div>

                  {/* Plan Name & Carrier */}
                  <div>
                    <h4 className="text-sm font-bold text-white leading-snug">{plan.name}</h4>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-slate-400">{plan.carrier} • Rating: {plan.rating} ★</p>
                      <a
                        href={plan.planUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(plan.planUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1 hover:underline shrink-0"
                      >
                        <span>Official Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Pricing Box */}
                  <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400 font-medium">Net Monthly Premium:</span>
                      <span className="text-2xl font-black text-emerald-400 font-mono">${plan.netMonthlyPremium} <span className="text-xs font-normal text-slate-400">/ mo</span></span>
                    </div>
                    {plan.monthlySubsidy > 0 && (
                      <p className="text-[11px] text-sky-400 font-semibold text-right">
                        Gross: ${plan.grossMonthlyPremium}/mo (-${plan.monthlySubsidy} subsidy)
                      </p>
                    )}
                  </div>

                  {/* Benefit Specs */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">Medical Deductible:</span>
                      <span className="font-bold text-white">${plan.deductibleMedical.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">Max Out-of-Pocket:</span>
                      <span className="font-bold text-sky-400">${plan.maxOutOfPocket.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">Primary Care Visit:</span>
                      <span className="font-semibold text-slate-200">{plan.primaryCareCopay}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">Specialist Visit:</span>
                      <span className="font-semibold text-slate-200">{plan.specialistCopay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Generic Prescription:</span>
                      <span className="font-semibold text-slate-200">{plan.genericDrugCopay}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic pt-1">{plan.notes}</p>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Expected Annual Total: </span>
                    <span className="font-extrabold text-white text-sm">{formatCurrency(plan.totalAnnualCost)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={plan.planUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(plan.planUrl, '_blank', 'noopener,noreferrer');
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>Direct Plan Link</span>
                      <ExternalLink className="w-3 h-3 text-sky-400" />
                    </a>

                    <button
                      type="button"
                      onClick={() => toggleComparePlan(plan.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                        isCompared
                          ? 'bg-sky-600 text-white shadow-md'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isCompared ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Recharts Bar Chart: Total Annual Healthcare Cost Comparison */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span>
              Total Annual Cost Comparison (Net Premium + {customExpenseMode ? `$${customExpectedExpense.toLocaleString()} Custom Medical Expense` : `${utilization.toUpperCase()} Medical OOP`})
            </span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">Lower is better</span>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val: number, name: string) => [formatCurrency(val), name === 'AnnualPremium' ? 'Annual Net Premium' : name === 'OutofPocketExpenses' ? 'Expected Out-of-Pocket Expenses' : 'Total Annual Cost']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
              />
              <Legend />
              <Bar name="Annual Net Premium" dataKey="AnnualPremium" fill="#38bdf8" stackId="a" />
              <Bar name="Out-of-Pocket Expenses" dataKey="OutofPocketExpenses" fill="#f59e0b" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Side-by-Side Detailed Plan Comparison Matrix */}
      {comparedPlans.length > 0 && (
        <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-white">Side-by-Side Detailed Plan Comparison Matrix</h3>
            </div>
            <span className="text-xs text-slate-400">Comparing {comparedPlans.length} Selected Plans</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider w-1/4">Feature / Spec</th>
                  {comparedPlans.map(plan => (
                    <th key={plan.id} className="py-3 px-4 text-white font-bold text-sm">
                      <div className="flex items-center space-x-1.5">
                        <span>{plan.name}</span>
                        <a href={plan.planUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">
                          <ExternalLink className="w-3.5 h-3.5 inline" />
                        </a>
                      </div>
                      <div className="text-[11px] text-sky-400 font-normal">{plan.carrier} ({plan.networkType})</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">Net Monthly Premium</td>
                  {comparedPlans.map(plan => (
                    <td key={plan.id} className="py-2.5 px-4 font-black text-emerald-400 text-base">
                      ${plan.netMonthlyPremium} / mo
                      {plan.monthlySubsidy > 0 && (
                        <div className="text-[10px] text-slate-400 font-normal">(-${plan.monthlySubsidy} subsidy)</div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">Medical Deductible</td>
                  {comparedPlans.map(plan => (
                    <td key={plan.id} className="py-2.5 px-4 font-bold text-white">${plan.deductibleMedical.toLocaleString()}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">Max Out-of-Pocket</td>
                  {comparedPlans.map(plan => (
                    <td key={plan.id} className="py-2.5 px-4 font-bold text-sky-400">${plan.maxOutOfPocket.toLocaleString()}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">Primary Care Copay</td>
                  {comparedPlans.map(plan => (
                    <td key={plan.id} className="py-2.5 px-4 text-slate-200">{plan.primaryCareCopay}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">Specialist Visit Copay</td>
                  {comparedPlans.map(plan => (
                    <td key={plan.id} className="py-2.5 px-4 text-slate-200">{plan.specialistCopay}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">Emergency Room Visit</td>
                  {comparedPlans.map(plan => (
                    <td key={plan.id} className="py-2.5 px-4 text-slate-200">{plan.erVisitCopay}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">Generic Prescriptions</td>
                  {comparedPlans.map(plan => (
                    <td key={plan.id} className="py-2.5 px-4 text-slate-200">{plan.genericDrugCopay}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">HSA Eligibility</td>
                  {comparedPlans.map(plan => (
                    <td key={plan.id} className="py-2.5 px-4">
                      {plan.hsaEligible ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Yes (${plan.hsaTaxSavings} tax shield)
                        </span>
                      ) : (
                        <span className="text-slate-500">No</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">Expected Total Annual Cost</td>
                  {comparedPlans.map(plan => (
                    <td key={plan.id} className="py-2.5 px-4 font-black text-white">{formatCurrency(plan.totalAnnualCost)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold text-slate-400">Official Plan Details Link</td>
                  {comparedPlans.map(plan => (
                    <td key={plan.id} className="py-2.5 px-4">
                      <a
                        href={plan.planUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300 font-bold underline flex items-center space-x-1"
                      >
                        <span>Open Carrier Portal</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Verified Official Portals & Direct Links Register Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <ExternalLink className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-white">Official Covered California & Carrier Portal Links</h3>
          </div>
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Verified Portals
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Access official Covered California enrollment tools, carrier network lookup directories, and federal COBRA continuation documentation directly:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {[
            {
              title: 'Covered CA Shop & Compare',
              subtitle: 'Anonymous Quote Engine',
              url: 'https://apply.coveredca.com/lw-shopandcompare/',
              color: 'sky'
            },
            {
              title: 'Covered CA Bronze Plans',
              subtitle: 'HDHP & HSA Options',
              url: 'https://www.coveredca.com/health/coverage-levels/bronze',
              color: 'amber'
            },
            {
              title: 'Covered CA Silver Plans',
              subtitle: '70 / 87 / 94 Benchmark',
              url: 'https://www.coveredca.com/health/coverage-levels/silver',
              color: 'emerald'
            },
            {
              title: 'Covered CA Gold & Platinum',
              subtitle: '$0 Deductible Coverage',
              url: 'https://www.coveredca.com/health/coverage-levels/gold',
              color: 'indigo'
            },
            {
              title: 'US Dept of Labor COBRA',
              subtitle: 'Continuation Rights Guide',
              url: 'https://www.dol.gov/general/topic/health-plans/cobra',
              color: 'rose'
            }
          ].map((item, idx) => (
            <a
              key={idx}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
                window.open(item.url, '_blank', 'noopener,noreferrer');
              }}
              className="bg-slate-950 border border-slate-800 hover:border-sky-500/50 rounded-xl p-3 flex flex-col justify-between group transition shadow-sm hover:shadow-md cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-sky-400 transition">{item.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition" />
                </div>
                <p className="text-[11px] text-slate-400">{item.subtitle}</p>
              </div>
              <span className="text-[10px] text-sky-400 font-semibold mt-3 group-hover:underline flex items-center space-x-1">
                <span>Visit Official Site</span>
                <span>→</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* HSA Tax Shield & Strategic Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* HSA Triple-Tax Advantage Spotlight */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 space-y-4 bg-gradient-to-br from-slate-900 to-amber-950/20">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Bronze 60 HDHP + HSA Strategy Spotlight</h3>
              <p className="text-xs text-slate-400">Triple Tax-Advantaged Health Savings Account</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Pairing the Covered CA Bronze 60 HDHP ($410/mo gross) with a Health Savings Account allows Linda to contribute up to <strong className="text-amber-400">$4,300/yr tax-free</strong> in 2026/2027.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Max Annual HSA Contribution:</span>
              <span className="font-bold text-white">$4,300</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Estimated Combined Tax Shield (CA + Fed ~28%):</span>
              <span className="font-bold text-emerald-400">+$1,204 saved in taxes</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1.5">
              <span className="text-slate-300 font-semibold">Effective Monthly Premium after HSA Tax Shield:</span>
              <span className="font-black text-amber-400">${Math.max(0, 410 - subsidyCalculation.monthlySubsidy - 100)} / mo</span>
            </div>
          </div>
        </div>

        {/* Action Plan & Pre-Financial Freedom Guidance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Strategic Health Plan Recommendation</h3>
              <p className="text-xs text-slate-400">Enrollment Deadline & Transition Checklist</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Primary Option (Bronze HDHP + HSA):</strong> Ideal if healthy and seeking lowest monthly cash drain + $1,200+ HSA tax deduction.
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Secondary Option (Silver 70 / Gold 80):</strong> Ideal if expecting regular doctor visits or specialist consultations without paying $7,500 deductible first.
              </span>
            </div>
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">COBRA Fallback:</strong> Keep COBRA ($780/mo) in mind as a backup during the 60-day Special Enrollment Period after leaving W-2 employment in April 2027.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
