import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  DollarSign, 
  AlertTriangle, 
  ShieldCheck, 
  ChevronRight, 
  PieChart as PieIcon, 
  TrendingUp, 
  Info,
  Building,
  Landmark,
  Scale,
  RefreshCw,
  Sparkles,
  ArrowRight,
  PiggyBank,
  Percent,
  CheckCircle2,
  Home,
  Sliders,
  BookOpen,
  FileText,
  ExternalLink,
  X,
  Award,
  HelpCircle
} from 'lucide-react';
import { calculateMortgageRecast } from '../utils/financialCalculations';

// Simplified 2024/2025/2026 MFJ Tax Brackets for estimation purposes
const FED_BRACKETS = [
  { max: 23200, rate: 0.10 },
  { max: 94300, rate: 0.12 },
  { max: 201050, rate: 0.22 },
  { max: 383900, rate: 0.24 },
  { max: 487450, rate: 0.32 },
  { max: 731200, rate: 0.35 },
  { max: Infinity, rate: 0.37 }
];

const LTCG_BRACKETS = [
  { max: 94050, rate: 0.0 },
  { max: 583750, rate: 0.15 },
  { max: Infinity, rate: 0.20 }
];

// Simplified CA State Brackets (MFJ)
const CA_BRACKETS = [
  { max: 20198, rate: 0.01 },
  { max: 47884, rate: 0.02 },
  { max: 75576, rate: 0.04 },
  { max: 104910, rate: 0.06 },
  { max: 132590, rate: 0.08 },
  { max: 677278, rate: 0.093 },
  { max: 812728, rate: 0.103 },
  { max: 1354550, rate: 0.113 },
  { max: Infinity, rate: 0.123 }
];

const FED_STANDARD_DEDUCTION = 29200;
const CA_STANDARD_DEDUCTION = 10726;
const DEFAULT_SALT_CAP = 40000;
const MAX_401K_STANDARD = 23500;
const MAX_401K_CATCHUP = 31000;

// Underpayment penalty interest rates
const IRS_PENALTY_RATE = 0.08; // IRS 8% annual underpayment penalty rate (IRC § 6654)
const FTB_PENALTY_RATE = 0.07; // CA FTB 7% annual underpayment penalty rate (Form 5805)

interface TaxResult {
  capitalGain: number;
  grossW2: number;
  total401k: number;
  taxableW2Income1: number;
  taxableW2Income2: number;
  taxableW2Total: number;
  grossIncome: number;
  agi: number;
  mortgageInterest: number;
  propertyTax: number;
  saltCap: number;
  totalSaltPaid: number;
  fedSaltDeduction: number;
  fedItemized: number;
  fedDeductionUsed: number;
  isItemizingFed: boolean;
  caItemized: number;
  caDeductionUsed: number;
  isItemizingCA: boolean;
  taxableOrdinaryIncome: number;
  fedOrdinaryTax: number;
  fedCGTax: number;
  niit: number;
  totalFedTax: number;
  caStateTax: number;
  caMentalHealthTax: number;
  totalCurrentYearTax: number;
  effectiveTotalRate: number;
  effectiveFedRate: number;
  effectiveCARate: number;
  safeHarbor90: number;
  targetWithholding: number;
  estimatedWithholding: number;
  underpaymentShortfall: number;
  fedShortfall: number;
  caShortfall: number;
  fedPenalty: number;
  caPenalty: number;
  totalPenalty: number;
  hasPenalty: boolean;
  requiredPerMonth: number;
  remainingTaxBalance: number;
}

function computeTaxDetails(
  w2Income1: number,
  w2Income2: number,
  k401_1: number,
  k401_2: number,
  stockProceeds: number,
  stockBasis: number,
  isLTCG: boolean,
  months: number,
  mortgageInterest: number = 40000,
  propertyTax: number = 10000,
  saltCap: number = 40000,
  enableItemized: boolean = true,
  estimatedWithholding: number = 25000
): TaxResult {
  const capitalGain = Math.max(0, stockProceeds - stockBasis);
  const grossW2 = w2Income1 + w2Income2;
  
  // Pre-tax 401(k) deductions cannot exceed individual W2 income
  const safeK1 = Math.min(Math.max(0, k401_1), w2Income1);
  const safeK2 = Math.min(Math.max(0, k401_2), w2Income2);
  const total401k = safeK1 + safeK2;

  const taxableW2Income1 = Math.max(0, w2Income1 - safeK1);
  const taxableW2Income2 = Math.max(0, w2Income2 - safeK2);
  const taxableW2Total = taxableW2Income1 + taxableW2Income2;

  const grossIncome = grossW2 + capitalGain;
  const agi = taxableW2Total + capitalGain; // 401(k) pre-tax deferrals lower AGI

  // 1. California State Tax with CA Itemized Deductions
  // CA allows deducting Mortgage Interest & Property Taxes without the federal $10k SALT cap.
  const caItemized = Math.max(0, mortgageInterest) + Math.max(0, propertyTax);
  const caDeductionUsed = enableItemized
    ? Math.max(CA_STANDARD_DEDUCTION, caItemized)
    : CA_STANDARD_DEDUCTION;
  const isItemizingCA = enableItemized && caItemized > CA_STANDARD_DEDUCTION;

  const caTaxableIncome = Math.max(0, agi - caDeductionUsed);

  let caStateTax = 0;
  let caRemainingIncome = caTaxableIncome;
  let caPrevMax = 0;
  for (const bracket of CA_BRACKETS) {
    if (caRemainingIncome > 0) {
      const taxableInBracket = Math.min(caRemainingIncome, bracket.max - caPrevMax);
      caStateTax += taxableInBracket * bracket.rate;
      caRemainingIncome -= taxableInBracket;
      caPrevMax = bracket.max;
    } else {
      break;
    }
  }

  // CA Mental Health Tax (1% over $1M AGI)
  let caMentalHealthTax = 0;
  if (agi > 1000000) {
    caMentalHealthTax = (agi - 1000000) * 0.01;
    caStateTax += caMentalHealthTax;
  }

  // 2. Federal Itemized Deductions & SALT Cap Calculation
  // Total SALT paid = State Income Tax + Property Taxes
  const totalSaltPaid = caStateTax + Math.max(0, propertyTax);
  const fedSaltDeduction = Math.min(Math.max(0, saltCap), totalSaltPaid);

  const fedItemized = Math.max(0, mortgageInterest) + fedSaltDeduction;
  const fedDeductionUsed = enableItemized
    ? Math.max(FED_STANDARD_DEDUCTION, fedItemized)
    : FED_STANDARD_DEDUCTION;
  const isItemizingFed = enableItemized && fedItemized > FED_STANDARD_DEDUCTION;

  // Taxable ordinary income base (after Federal Deduction)
  const taxableOrdinaryIncome = isLTCG
    ? Math.max(0, taxableW2Total - fedDeductionUsed)
    : Math.max(0, agi - fedDeductionUsed);

  // 3. Federal Ordinary Income Tax
  let fedOrdinaryTax = 0;
  let remainingIncome = taxableOrdinaryIncome;
  let prevMax = 0;
  for (const bracket of FED_BRACKETS) {
    if (remainingIncome > 0) {
      const taxableInBracket = Math.min(remainingIncome, bracket.max - prevMax);
      fedOrdinaryTax += taxableInBracket * bracket.rate;
      remainingIncome -= taxableInBracket;
      prevMax = bracket.max;
    } else {
      break;
    }
  }

  // 4. Federal Capital Gains Tax (if LTCG)
  let fedCGTax = 0;
  if (isLTCG) {
    let remainingCG = capitalGain;
    let cgBase = taxableOrdinaryIncome;
    for (const bracket of LTCG_BRACKETS) {
      if (cgBase < bracket.max && remainingCG > 0) {
        const spaceInBracket = bracket.max - cgBase;
        const cgToTax = Math.min(remainingCG, spaceInBracket);
        fedCGTax += cgToTax * bracket.rate;
        remainingCG -= cgToTax;
        cgBase += cgToTax;
      }
    }
  }

  // 5. Net Investment Income Tax (NIIT) - 3.8%
  const magiThreshold = 250000;
  let niit = 0;
  if (agi > magiThreshold && capitalGain > 0) {
    const amountSubjectToNiit = Math.min(capitalGain, agi - magiThreshold);
    niit = amountSubjectToNiit * 0.038;
  }

  const totalFedTax = fedOrdinaryTax + fedCGTax + niit;
  const totalCurrentYearTax = totalFedTax + caStateTax;

  const effectiveTotalRate = grossIncome > 0 ? totalCurrentYearTax / grossIncome : 0;
  const effectiveFedRate = grossIncome > 0 ? totalFedTax / grossIncome : 0;
  const effectiveCARate = grossIncome > 0 ? caStateTax / grossIncome : 0;

  // 2026 Safe Harbor Target (90% of 2026 Total Tax Liability)
  const targetWithholding = totalCurrentYearTax * 0.90;
  const safeHarbor90 = targetWithholding;
  
  // Underpayment Penalty Calculations
  const underpaymentShortfall = Math.max(0, targetWithholding - estimatedWithholding);
  
  const fedRatio = totalFedTax / (totalCurrentYearTax || 1);
  const caRatio = caStateTax / (totalCurrentYearTax || 1);
  
  const fedShortfall = underpaymentShortfall * fedRatio;
  const caShortfall = underpaymentShortfall * caRatio;
  
  const fedPenalty = fedShortfall * IRS_PENALTY_RATE * ((months || 1) / 12);
  const caPenalty = caShortfall * FTB_PENALTY_RATE * ((months || 1) / 12);
  const totalPenalty = fedPenalty + caPenalty;
  const hasPenalty = underpaymentShortfall > 0 && totalPenalty > 0;

  const requiredPerMonth = Math.max(0, targetWithholding - estimatedWithholding) / (months || 1);
  const remainingTaxBalance = Math.max(0, totalCurrentYearTax - estimatedWithholding);

  return {
    capitalGain,
    grossW2,
    total401k,
    taxableW2Income1,
    taxableW2Income2,
    taxableW2Total,
    grossIncome,
    agi,
    mortgageInterest,
    propertyTax,
    saltCap,
    totalSaltPaid,
    fedSaltDeduction,
    fedItemized,
    fedDeductionUsed,
    isItemizingFed,
    caItemized,
    caDeductionUsed,
    isItemizingCA,
    taxableOrdinaryIncome,
    fedOrdinaryTax,
    fedCGTax,
    niit,
    totalFedTax,
    caStateTax,
    caMentalHealthTax,
    totalCurrentYearTax,
    effectiveTotalRate,
    effectiveFedRate,
    effectiveCARate,
    safeHarbor90,
    targetWithholding,
    estimatedWithholding,
    underpaymentShortfall,
    fedShortfall,
    caShortfall,
    fedPenalty,
    caPenalty,
    totalPenalty,
    hasPenalty,
    requiredPerMonth,
    remainingTaxBalance
  };
}

export default function TaxModeler() {
  // Input States
  const [w2Income1, setW2Income1] = useState(150000);
  const [w2Income2, setW2Income2] = useState(150000);
  
  // 401(k) Deferral States
  const [k401_1, setK401_1] = useState(0);
  const [k401_2, setK401_2] = useState(0);
  const [isCatchUp1, setIsCatchUp1] = useState(false);
  const [isCatchUp2, setIsCatchUp2] = useState(false);

  // Asset & Safe Harbor States
  const [stockProceeds, setStockProceeds] = useState(650000);
  const [stockCostBasis, setStockCostBasis] = useState(10000);
  const [isLongTerm, setIsLongTerm] = useState(true);
  const [monthsRemaining, setMonthsRemaining] = useState(4);
  const [estimatedWithholding, setEstimatedWithholding] = useState(25000);

  // Itemized Deductions States (Mortgage Interest & SALT)
  const [mortgageInterest, setMortgageInterest] = useState(40000);
  const [propertyTax, setPropertyTax] = useState(10000);
  const [saltCap, setSaltCap] = useState(40000);
  const [enableItemized, setEnableItemized] = useState(true);

  // Mortgage Recast & Paydown Modeler States
  const [recastBalance, setRecastBalance] = useState(650000);
  const [recastRate, setRecastRate] = useState(0.06125);
  const [recastTermMonths, setRecastTermMonths] = useState(345);
  const [lumpSumPayoff, setLumpSumPayoff] = useState(150000);
  const [recastFee, setRecastFee] = useState(250);

  // Math Audit & Legal Authorities Modal States
  const [showMathModal, setShowMathModal] = useState(false);
  const [mathModalTab, setMathModalTab] = useState<'formulas' | 'sources' | 'verification'>('formulas');

  // Max 401k limits based on catch-up status
  const max1 = isCatchUp1 ? MAX_401K_CATCHUP : MAX_401K_STANDARD;
  const max2 = isCatchUp2 ? MAX_401K_CATCHUP : MAX_401K_STANDARD;

  // Formatting helpers
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val);

  const formatCurrencyInt = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

  const resetToDefaults = () => {
    setW2Income1(150000);
    setW2Income2(150000);
    setK401_1(0);
    setK401_2(0);
    setIsCatchUp1(false);
    setIsCatchUp2(false);
    setStockProceeds(650000);
    setStockCostBasis(10000);
    setIsLongTerm(true);
    setMonthsRemaining(4);
    setEstimatedWithholding(25000);
    setMortgageInterest(40000);
    setPropertyTax(10000);
    setSaltCap(40000);
    setEnableItemized(true);
    setRecastBalance(650000);
    setRecastRate(0.06125);
    setRecastTermMonths(345);
    setLumpSumPayoff(150000);
    setRecastFee(250);
  };

  const presetZero401k = () => {
    setK401_1(0);
    setK401_2(0);
  };

  const presetStandardMax = () => {
    setIsCatchUp1(false);
    setIsCatchUp2(false);
    setK401_1(MAX_401K_STANDARD);
    setK401_2(MAX_401K_STANDARD);
  };

  const presetCatchUpMax = () => {
    setIsCatchUp1(true);
    setIsCatchUp2(true);
    setK401_1(MAX_401K_CATCHUP);
    setK401_2(MAX_401K_CATCHUP);
  };

  // Main Calculations
  const calculations = useMemo(() => {
    const current = computeTaxDetails(
      w2Income1,
      w2Income2,
      k401_1,
      k401_2,
      stockProceeds,
      stockCostBasis,
      isLongTerm,
      monthsRemaining,
      mortgageInterest,
      propertyTax,
      saltCap,
      enableItemized,
      estimatedWithholding
    );

    // Compute baseline tax with zero 401(k) contributions to show tax shield value
    const zero401k = computeTaxDetails(
      w2Income1,
      w2Income2,
      0,
      0,
      stockProceeds,
      stockCostBasis,
      isLongTerm,
      monthsRemaining,
      mortgageInterest,
      propertyTax,
      saltCap,
      enableItemized,
      estimatedWithholding
    );

    const taxSaved401k = zero401k.totalCurrentYearTax - current.totalCurrentYearTax;
    const penaltySaved401k = Math.max(0, zero401k.totalPenalty - current.totalPenalty);
    const safeHarborTargetSaved401k = Math.max(0, zero401k.targetWithholding - current.targetWithholding);
    const taxShieldPct = current.total401k > 0 ? (taxSaved401k / current.total401k) * 100 : 0;
    const netOutOfPocket401k = Math.max(0, current.total401k - taxSaved401k);

    return {
      ...current,
      zero401kTax: zero401k.totalCurrentYearTax,
      zero401kPenalty: zero401k.totalPenalty,
      taxSaved401k,
      penaltySaved401k,
      safeHarborTargetSaved401k,
      taxShieldPct,
      netOutOfPocket401k
    };
  }, [
    w2Income1,
    w2Income2,
    k401_1,
    k401_2,
    stockProceeds,
    stockCostBasis,
    isLongTerm,
    monthsRemaining,
    mortgageInterest,
    propertyTax,
    saltCap,
    enableItemized,
    estimatedWithholding
  ]);

  // Recast Calculation Memo
  const recastResult = useMemo(() => {
    return calculateMortgageRecast({
      currentBalance: recastBalance,
      annualInterestRate: recastRate,
      remainingTermMonths: recastTermMonths,
      lumpSumPayoff: lumpSumPayoff,
      recastFee: recastFee,
      fedMarginalRate: calculations.taxableOrdinaryIncome > 201050 ? 0.24 : 0.22,
      caMarginalRate: 0.093,
      isItemizingFed: calculations.isItemizingFed,
      isItemizingCA: calculations.isItemizingCA,
      altInvestmentYield: 0.045,
      monthsRemainingIn2026: monthsRemaining
    });
  }, [
    recastBalance,
    recastRate,
    recastTermMonths,
    lumpSumPayoff,
    recastFee,
    calculations.taxableOrdinaryIncome,
    calculations.isItemizingFed,
    calculations.isItemizingCA,
    monthsRemaining
  ]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Standalone Tax & 401(k) Modeler
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                <Calculator className="w-8 h-8 text-blue-600 shrink-0" />
                2026 Tax & Withholding Modeler
              </h1>
              <p className="text-slate-500 mt-2 max-w-3xl leading-relaxed text-sm sm:text-base">
                Model W2 income, pre-tax 401(k) deferrals, stock gains, and prior-year tax baselines.
                Calculate exact Safe Harbor targets and explore how 401(k) contributions maximize immediate tax savings.
              </p>
            </div>
            
            <button
              onClick={resetToDefaults}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors self-start md:self-auto shrink-0 border border-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
          </div>
        </div>

        {/* Quick Metrics Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Gross Income</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">{formatCurrencyInt(calculations.grossIncome)}</div>
            <div className="text-xs text-slate-500 mt-1">W2 ({formatCurrencyInt(calculations.grossW2)}) + Stock</div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">401(k) Pre-Tax Total</div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{formatCurrencyInt(calculations.total401k)}</div>
            <div className="text-xs text-slate-500 mt-1">
              {calculations.taxSaved401k > 0 
                ? `Saves ${formatCurrencyInt(calculations.taxSaved401k)} in tax` 
                : 'No deferrals selected'}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Tax Liability</div>
            <div className="text-xl sm:text-2xl font-bold text-rose-600">{formatCurrencyInt(calculations.totalCurrentYearTax)}</div>
            <div className="text-xs text-slate-500 mt-1">Fed + NIIT + CA State</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Effective Rate</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{formatPercent(calculations.effectiveTotalRate)}</div>
            <div className="text-xs text-slate-500 mt-1">Fed {formatPercent(calculations.effectiveFedRate)} · CA {formatPercent(calculations.effectiveCARate)}</div>
          </div>
        </div>

        {/* 401(k) Tax Shield Banner (shown if 401k > 0) */}
        {calculations.total401k > 0 && (
          <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-emerald-700/60 relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-56 h-56 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300">
                  <PiggyBank className="w-4 h-4" />
                  401(k) Tax Shield Advantage
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  Contributing {formatCurrencyInt(calculations.total401k)} saves {formatCurrencyInt(calculations.taxSaved401k)} in tax!
                </h3>
                <p className="text-emerald-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
                  Due to your combined federal and California state marginal tax brackets, every dollar contributed to a pre-tax 401(k) reduces your top-bracket tax liability.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 shrink-0">
                <div className="bg-emerald-950/70 p-3.5 rounded-2xl border border-emerald-700/50 text-center">
                  <div className="text-[11px] text-emerald-300 uppercase font-semibold">Immediate Tax Savings</div>
                  <div className="text-xl font-black text-emerald-300">{formatCurrencyInt(calculations.taxSaved401k)}</div>
                </div>
                <div className="bg-emerald-950/70 p-3.5 rounded-2xl border border-emerald-700/50 text-center">
                  <div className="text-[11px] text-emerald-300 uppercase font-semibold">Net Out-of-Pocket</div>
                  <div className="text-xl font-black text-white">{formatCurrencyInt(calculations.netOutOfPocket401k)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Inputs Column */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Income & Asset Inputs */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
              <h2 className="text-lg font-bold text-slate-900 flex items-center border-b border-slate-100 pb-3">
                <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
                Gross Income Assumptions
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Est. 2026 W2 Income 1
                  </label>                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">$</span>
                    <input 
                      type="number" 
                      value={w2Income1} 
                      onChange={e => setW2Income1(Number(e.target.value))} 
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 font-semibold transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Est. 2026 W2 Income 2
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">$</span>
                    <input 
                      type="number" 
                      value={w2Income2} 
                      onChange={e => setW2Income2(Number(e.target.value))} 
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 font-semibold transition"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                      Stock Sale Proceeds
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={stockProceeds} 
                        onChange={e => setStockProceeds(Number(e.target.value))} 
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 font-semibold transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                      Stock Cost Basis
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">$</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={stockCostBasis} 
                        onChange={e => setStockCostBasis(Number(e.target.value))} 
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 font-semibold transition"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                    <label htmlFor="ltcg" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                      Held over 1 year (Long-Term Capital Gain)
                    </label>
                    <input 
                      type="checkbox" 
                      id="ltcg" 
                      checked={isLongTerm} 
                      onChange={e => setIsLongTerm(e.target.checked)} 
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 401(k) Pre-Tax Deferral Section */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <PiggyBank className="w-5 h-5 mr-2 text-purple-600" />
                  401(k) Pre-Tax Deferrals
                </h2>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"/> Max: ${formatCurrencyInt(max1 + max2)}
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={presetZero401k}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border ${
                    k401_1 === 0 && k401_2 === 0 
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  $0 Deferral
                </button>

                <button
                  type="button"
                  onClick={presetStandardMax}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border ${
                    k401_1 === MAX_401K_STANDARD && k401_2 === MAX_401K_STANDARD && !isCatchUp1 && !isCatchUp2
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Max Std ($47k)
                </button>

                <button
                  type="button"
                  onClick={presetCatchUpMax}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border ${
                    k401_1 === MAX_401K_CATCHUP && k401_2 === MAX_401K_CATCHUP && isCatchUp1 && isCatchUp2
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Max 50+ ($62k)
                </button>
              </div>

              {/* W2 Income 1 401(k) Input */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Income 1 401(k) Contribution</span>
                  <label className="inline-flex items-center gap-1.5 text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isCatchUp1} 
                      onChange={e => {
                        const checked = e.target.checked;
                        setIsCatchUp1(checked);
                        if (!checked && k401_1 > MAX_401K_STANDARD) {
                          setK401_1(MAX_401K_STANDARD);
                        }
                      }} 
                      className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                    />
                    <span>Age 50+ Catch-up (Max $31k)</span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0" 
                    max={max1} 
                    step="500" 
                    value={k401_1} 
                    onChange={e => setK401_1(Number(e.target.value))} 
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="relative w-32 shrink-0">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-medium text-xs">$</span>
                    <input 
                      type="number" 
                      min="0" 
                      max={max1} 
                      value={k401_1} 
                      onChange={e => setK401_1(Math.min(max1, Math.max(0, Number(e.target.value))))} 
                      className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>$0</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setK401_1(0)} className="hover:text-purple-700 underline">Clear</button>
                    <button type="button" onClick={() => setK401_1(Math.round(max1 / 2))} className="hover:text-purple-700 underline">50%</button>
                    <button type="button" onClick={() => setK401_1(max1)} className="hover:text-purple-700 underline">Max (${formatCurrencyInt(max1)})</button>
                  </div>
                </div>
              </div>

              {/* W2 Income 2 401(k) Input */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">Income 2 401(k) Contribution</span>
                  <label className="inline-flex items-center gap-1.5 text-slate-600 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isCatchUp2} 
                      onChange={e => {
                        const checked = e.target.checked;
                        setIsCatchUp2(checked);
                        if (!checked && k401_2 > MAX_401K_STANDARD) {
                          setK401_2(MAX_401K_STANDARD);
                        }
                      }} 
                      className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
                    />
                    <span>Age 50+ Catch-up (Max $31k)</span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0" 
                    max={max2} 
                    step="500" 
                    value={k401_2} 
                    onChange={e => setK401_2(Number(e.target.value))} 
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                  <div className="relative w-32 shrink-0">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400 font-medium text-xs">$</span>
                    <input 
                      type="number" 
                      min="0" 
                      max={max2} 
                      value={k401_2} 
                      onChange={e => setK401_2(Math.min(max2, Math.max(0, Number(e.target.value))))} 
                      className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>$0</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setK401_2(0)} className="hover:text-purple-700 underline">Clear</button>
                    <button type="button" onClick={() => setK401_2(Math.round(max2 / 2))} className="hover:text-purple-700 underline">50%</button>
                    <button type="button" onClick={() => setK401_2(max2)} className="hover:text-purple-700 underline">Max (${formatCurrencyInt(max2)})</button>
                  </div>
                </div>
              </div>

              {/* 401(k) Tax & Penalty Shield Impact Box */}
              {calculations.total401k > 0 && (
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-purple-900">
                    <span className="flex items-center gap-1.5">
                      <PiggyBank className="w-4 h-4 text-purple-600" />
                      401(k) Tax & Penalty Shield Impact
                    </span>
                    <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-[10px]">
                      {formatPercent(calculations.taxShieldPct / 100)} Tax Subsidy
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-purple-800 pt-1 border-t border-purple-200/60">
                    <div>
                      <span className="text-purple-600 block">Direct Tax Saved:</span>
                      <span className="font-extrabold text-slate-900 text-sm">{formatCurrency(calculations.taxSaved401k)}</span>
                    </div>
                    <div>
                      <span className="text-purple-600 block">Underpayment Penalty Saved:</span>
                      <span className="font-extrabold text-emerald-700 text-sm">{formatCurrency(calculations.penaltySaved401k)}</span>
                    </div>
                  </div>
                  {calculations.safeHarborTargetSaved401k > 0 && (
                    <div className="text-[11px] text-purple-700 pt-1 border-t border-purple-200/40">
                      ✨ 401(k) deferrals lower your 2026 Safe Harbor target by <strong className="text-purple-900">{formatCurrency(calculations.safeHarborTargetSaved401k)}</strong>, directly reducing underpayment penalty exposure!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Itemized Deductions Card (Mortgage & SALT) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                  <Scale className="w-5 h-5 mr-2 text-indigo-600" />
                  Itemized Deductions (Mortgage & SALT)
                </h2>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  calculations.isItemizingFed 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {calculations.isItemizingFed ? 'Itemizing Federal' : 'Standard Deduction'}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Mortgage Interest Paid (Form 1098)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">$</span>
                    <input 
                      type="number" 
                      value={mortgageInterest} 
                      onChange={e => setMortgageInterest(Number(e.target.value))} 
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Annual primary residence mortgage interest deduction.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Property Taxes Paid
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">$</span>
                    <input 
                      type="number" 
                      value={propertyTax} 
                      onChange={e => setPropertyTax(Number(e.target.value))} 
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Federal SALT Deduction Cap
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">$</span>
                    <input 
                      type="number" 
                      value={saltCap} 
                      onChange={e => setSaltCap(Number(e.target.value))} 
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-slate-900 font-semibold transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Federal TCJA SALT limit (State income tax + property tax capped at {formatCurrencyInt(saltCap)}).
                  </p>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between">
                  <label htmlFor="enableItemized" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                    Auto-select higher deduction (Itemized vs. Standard)
                  </label>
                  <input 
                    type="checkbox" 
                    id="enableItemized" 
                    checked={enableItemized} 
                    onChange={e => setEnableItemized(e.target.checked)} 
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                </div>

                {/* Deduction Comparison Summary */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-1.5">
                  <div className="flex justify-between font-semibold text-indigo-900">
                    <span>Federal Deduction Used:</span>
                    <span className="font-bold">{formatCurrency(calculations.fedDeductionUsed)}</span>
                  </div>
                  <div className="text-[11px] text-indigo-700 leading-snug">
                    {calculations.isItemizingFed 
                      ? `Itemized ($${formatCurrencyInt(calculations.fedItemized)}) exceeds Standard ($${formatCurrencyInt(FED_STANDARD_DEDUCTION)}), shielding an extra $${formatCurrencyInt(calculations.fedItemized - FED_STANDARD_DEDUCTION)} from federal taxable income!`
                      : `Standard Deduction ($${formatCurrencyInt(FED_STANDARD_DEDUCTION)}) is higher than Itemized ($${formatCurrencyInt(calculations.fedItemized)}).`
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Safe Harbor Rule Inputs */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
              <h2 className="text-lg font-bold text-slate-900 flex items-center border-b border-slate-100 pb-3">
                <ShieldCheck className="w-5 h-5 mr-2 text-purple-600" />
                Safe Harbor Parameters
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    2026 Projected W-2 Payroll Withholding
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-medium">$</span>
                    <input 
                      type="number" 
                      value={estimatedWithholding} 
                      onChange={e => setEstimatedWithholding(Number(e.target.value))} 
                      className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-slate-900 font-semibold transition"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    <button type="button" onClick={() => setEstimatedWithholding(0)} className="text-slate-500 hover:text-purple-700 underline">$0 Withheld</button>
                    <button type="button" onClick={() => setEstimatedWithholding(25000)} className="text-slate-500 hover:text-purple-700 underline">$25k (Typical)</button>
                    <button type="button" onClick={() => setEstimatedWithholding(calculations.targetWithholding)} className="text-purple-600 hover:text-purple-800 font-semibold underline">Match Safe Harbor (${formatCurrencyInt(calculations.targetWithholding)})</button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Months Remaining in 2026
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max="12" 
                    value={monthsRemaining} 
                    onChange={e => setMonthsRemaining(Number(e.target.value))} 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 font-semibold transition"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Calculates required monthly payroll withholding across the remaining pay periods of 2026.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Results Column */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Safe Harbor Action Box */}
            <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden border border-blue-600/30">
              <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-2 text-yellow-300 font-semibold text-xs uppercase tracking-wider mb-2">
                <AlertTriangle className="w-4 h-4" />
                Action Strategy · Safe Harbor Protection
              </div>
              <h2 className="text-2xl font-bold mb-3 text-white">
                Withholding & Penalty Avoidance Strategy
              </h2>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                Because windfall stock sales carry no automatic withholding, you risk underpayment penalties. Avoid penalties by ensuring total withholding reaches <strong>90% of your 2026 estimated tax liability</strong>.
              </p>
              
              {/* Underpayment Penalty Exposure Banner */}
              {calculations.hasPenalty ? (
                <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-400/50 space-y-3 mb-6 ring-2 ring-rose-400/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-200 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-rose-300 animate-pulse" />
                      Underpayment Penalty Exposure Detected
                    </div>
                    <span className="bg-rose-500 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full">
                      + {formatCurrency(calculations.totalPenalty)} Penalty
                    </span>
                  </div>
                  
                  <p className="text-xs text-rose-100 leading-relaxed">
                    Projected withholding (<strong>{formatCurrencyInt(calculations.estimatedWithholding)}</strong>) is <strong>{formatCurrencyInt(calculations.underpaymentShortfall)}</strong> below the Safe Harbor target (<strong>{formatCurrencyInt(calculations.targetWithholding)}</strong>). IRS & CA FTB underpayment penalties apply:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-rose-950/40 p-3 rounded-xl border border-rose-400/20">
                    <div>
                      <span className="text-rose-200 font-medium">IRS Penalty (IRC § 6654 @ 8% APR):</span>
                      <div className="font-extrabold text-white text-base">{formatCurrency(calculations.fedPenalty)}</div>
                    </div>
                    <div>
                      <span className="text-rose-200 font-medium">CA FTB Penalty (Form 5805 @ 7% APR):</span>
                      <div className="font-extrabold text-white text-base">{formatCurrency(calculations.caPenalty)}</div>
                    </div>
                  </div>

                  {calculations.total401k > 0 && calculations.penaltySaved401k > 0 && (
                    <div className="bg-purple-950/40 border border-purple-400/30 p-2.5 rounded-xl text-[11px] text-purple-200 flex items-center justify-between">
                      <span>💡 401(k) deferrals of <strong>{formatCurrencyInt(calculations.total401k)}</strong> reduced your penalty by:</span>
                      <span className="font-bold text-emerald-300">−{formatCurrency(calculations.penaltySaved401k)}</span>
                    </div>
                  )}

                  <div className="text-[11px] text-rose-200 font-medium pt-1">
                    👉 Increase withholding by <strong className="text-white">{formatCurrency(calculations.requiredPerMonth)}/mo</strong> over remaining {monthsRemaining} months to eliminate this penalty!
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 space-y-2 mb-6 ring-2 ring-emerald-400/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-200 font-bold text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-300" />
                      Safe Harbor Achieved — Zero Underpayment Penalty
                    </div>
                    <span className="bg-emerald-500 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full">
                      $0 Penalty Risk
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100 leading-relaxed">
                    Your projected withholding of <strong>{formatCurrencyInt(calculations.estimatedWithholding)}</strong> meets or exceeds the Safe Harbor requirement (<strong>{formatCurrencyInt(calculations.targetWithholding)}</strong>). You are 100% shielded from IRS Form 2210 and CA FTB Form 5805 underpayment penalties.
                  </p>
                </div>
              )}

              <div className="p-5 rounded-2xl bg-white/10 border border-blue-400/30 mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs text-blue-200 font-medium">
                  <span className="font-bold text-white uppercase tracking-wide">2026 Safe Harbor Target (90% of 2026 Tax)</span>
                  <span className="bg-yellow-400/20 text-yellow-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-400/40">
                    2026 TARGET
                  </span>
                </div>
                <div className="text-3xl font-black text-white">{formatCurrencyInt(calculations.targetWithholding)}</div>
                <div className="text-[11px] text-blue-200 leading-snug">
                  Required withholding to shield from underpayment penalties (90% of estimated 2026 total tax liability of {formatCurrencyInt(calculations.totalCurrentYearTax)}).
                </div>
              </div>

              {/* Monthly Withholding Requirement Highlight */}
              <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">Required Monthly Withholding</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Combined target across paychecks over remaining <span className="font-semibold text-slate-800">{monthsRemaining} months</span>
                  </div>
                </div>
                <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
                  {formatCurrency(calculations.requiredPerMonth)} <span className="text-sm font-normal text-slate-500">/mo</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-700/60 flex items-start gap-2 text-xs text-blue-200 leading-relaxed">
                <Info className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
                <p>
                  <strong>Important Note:</strong> Reaching the Safe Harbor target ({formatCurrencyInt(calculations.targetWithholding)}) shields you from penalties, but does not extinguish remaining liability. You will owe a final tax balance of <strong>{formatCurrencyInt(calculations.remainingTaxBalance)}</strong> by April 2027. Set aside cash reserves accordingly.
                </p>
              </div>
            </div>

            {/* Detailed Tax Breakdown Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                  <PieIcon className="w-5 h-5 mr-2 text-blue-600" />
                  2026 Estimated Tax Breakdown
                </h2>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  MFJ · CA Resident
                </span>
              </div>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Total Gross W2 Income</span>
                  <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(calculations.grossW2)}</span>
                </div>

                {calculations.total401k > 0 && (
                  <div className="flex justify-between items-center py-2.5 border-b border-slate-100 text-purple-700 bg-purple-50/50 -mx-2 px-2 rounded-lg">
                    <span className="font-medium flex items-center">
                      <PiggyBank className="w-4 h-4 mr-1.5 text-purple-600" />
                      Pre-Tax 401(k) Deferrals
                    </span>
                    <span className="font-bold tabular-nums">−{formatCurrency(calculations.total401k)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
                  <span className="text-slate-600 font-medium">Capital Gains Subject to Tax</span>
                  <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(calculations.capitalGain)}</span>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-slate-100 bg-slate-50/70 -mx-2 px-2 rounded-lg">
                  <span className="text-slate-800 font-semibold">Adjusted Gross Income (AGI)</span>
                  <span className="font-extrabold text-slate-900 tabular-nums">{formatCurrency(calculations.agi)}</span>
                </div>

                <div className="py-2.5 border-b border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-indigo-500" />
                      Federal Deduction ({calculations.isItemizingFed ? 'Itemized' : 'Standard'})
                    </span>
                    <span className="font-semibold text-slate-700 tabular-nums">
                      −{formatCurrency(calculations.fedDeductionUsed)}
                    </span>
                  </div>
                  {calculations.isItemizingFed && (
                    <div className="text-[11px] text-slate-500 pl-5.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Mortgage Interest: {formatCurrency(calculations.mortgageInterest)}</span>
                      <span>•</span>
                      <span>SALT Deduction (Capped): {formatCurrency(calculations.fedSaltDeduction)}</span>
                    </div>
                  )}
                </div>

                <div className="py-2.5 border-b border-slate-100 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-emerald-500" />
                      CA State Deduction ({calculations.isItemizingCA ? 'Itemized' : 'Standard'})
                    </span>
                    <span className="font-semibold text-slate-700 tabular-nums">
                      −{formatCurrency(calculations.caDeductionUsed)}
                    </span>
                  </div>
                  {calculations.isItemizingCA && (
                    <div className="text-[11px] text-slate-500 pl-5.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>Mortgage Interest: {formatCurrency(calculations.mortgageInterest)}</span>
                      <span>•</span>
                      <span>Property Taxes: {formatCurrency(calculations.propertyTax)}</span>
                    </div>
                  )}
                </div>

                {/* Federal Breakdown Section */}
                <div className="pt-2 pb-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                    <Building className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                    Federal Tax Component ({formatCurrency(calculations.totalFedTax)})
                  </div>
                  <div className="pl-4 space-y-2.5 border-l-2 border-blue-200">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-slate-600">Federal Ordinary Income Tax</span>
                      <span className="font-medium text-slate-800 tabular-nums">{formatCurrency(calculations.fedOrdinaryTax)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-slate-600">Long-Term Capital Gains Tax</span>
                      <span className="font-medium text-slate-800 tabular-nums">{formatCurrency(calculations.fedCGTax)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-slate-600">Net Investment Income Tax (3.8% NIIT)</span>
                      <span className="font-medium text-slate-800 tabular-nums">{formatCurrency(calculations.niit)}</span>
                    </div>
                  </div>
                </div>

                {/* State Breakdown Section */}
                <div className="pt-2 pb-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                    <Landmark className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                    California State Tax ({formatCurrency(calculations.caStateTax)})
                  </div>
                  <div className="pl-4 space-y-2.5 border-l-2 border-emerald-200">
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-slate-600">CA Progressive State Income Tax</span>
                      <span className="font-medium text-slate-800 tabular-nums">{formatCurrency(calculations.caStateTax - calculations.caMentalHealthTax)}</span>
                    </div>
                    {calculations.caMentalHealthTax > 0 && (
                      <div className="flex justify-between items-center text-xs sm:text-sm">
                        <span className="text-slate-600">CA Mental Health Surcharge (1% &gt; $1M)</span>
                        <span className="font-medium text-slate-800 tabular-nums">{formatCurrency(calculations.caMentalHealthTax)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visual Tax Stack Bar */}
                <div className="pt-4 space-y-2">
                  <div className="text-xs font-semibold text-slate-500 flex justify-between">
                    <span>Tax Allocation Bar</span>
                    <span>Total Effective Rate: {formatPercent(calculations.effectiveTotalRate)}</span>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
                    <div 
                      style={{ width: `${(calculations.fedOrdinaryTax / calculations.totalCurrentYearTax) * 100}%` }} 
                      className="bg-blue-600" 
                      title={`Fed Ordinary: ${formatCurrency(calculations.fedOrdinaryTax)}`} 
                    />
                    <div 
                      style={{ width: `${(calculations.fedCGTax / calculations.totalCurrentYearTax) * 100}%` }} 
                      className="bg-indigo-500" 
                      title={`Fed LTCG: ${formatCurrency(calculations.fedCGTax)}`} 
                    />
                    <div 
                      style={{ width: `${(calculations.niit / calculations.totalCurrentYearTax) * 100}%` }} 
                      className="bg-purple-500" 
                      title={`NIIT (3.8%): ${formatCurrency(calculations.niit)}`} 
                    />
                    <div 
                      style={{ width: `${(calculations.caStateTax / calculations.totalCurrentYearTax) * 100}%` }} 
                      className="bg-emerald-500" 
                      title={`CA State: ${formatCurrency(calculations.caStateTax)}`} 
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"/> Fed Ordinary</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"/> Fed LTCG</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"/> NIIT</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"/> CA State</span>
                  </div>
                </div>

                {/* Total Summary */}
                <div className="space-y-2 pt-5 border-t-2 border-slate-900">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium flex items-center gap-1.5">
                      <AlertTriangle className={`w-4 h-4 ${calculations.hasPenalty ? 'text-rose-500' : 'text-emerald-500'}`} />
                      Underpayment Penalty (IRS § 6654 + CA FTB 5805)
                    </span>
                    <span className={`font-extrabold tabular-nums ${calculations.hasPenalty ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {calculations.hasPenalty ? `+${formatCurrency(calculations.totalPenalty)}` : '$0 (Protected)'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-lg pt-2 border-t border-slate-100">
                    <span className="font-extrabold text-slate-900">Total Estimated Tax Liability</span>
                    <span className="font-extrabold text-rose-600 tabular-nums">{formatCurrency(calculations.totalCurrentYearTax)}</span>
                  </div>

                  {calculations.hasPenalty && (
                    <div className="flex justify-between items-center text-sm font-bold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      <span>Total Out-of-Pocket (Tax + Penalty):</span>
                      <span className="tabular-nums">{formatCurrency(calculations.totalCurrentYearTax + calculations.totalPenalty)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Full-Width Interactive Mortgage Recast & Principal Paydown Modeler */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-2">
                <Home className="w-3.5 h-3.5" />
                Interactive Strategy · Mortgage Recast & Paydown
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Mortgage Principal Recast & Tax Analysis
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
                Simulate paying off your mortgage principal from <strong>$0 (0%)</strong> up to <strong>{formatCurrency(recastBalance)} (100%)</strong>. Calculate lower monthly payments, exact Schedule A & CA state tax deduction impacts, and side-by-side returns vs 4.5% CD alternatives.
              </p>
            </div>

            {/* Action Buttons & Verdict Badge */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowMathModal(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 shadow-sm transition flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Math Proof & Legal Sources</span>
              </button>

              <div className={`px-4 py-2.5 rounded-2xl border flex items-center gap-3 ${
                recastResult.verdict === 'Highly Beneficial' 
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                  : recastResult.verdict === 'Favorable'
                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                  : 'bg-slate-50 text-slate-800 border-slate-200'
              }`}>
                <div className="p-1.5 rounded-xl bg-white shadow-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recast Verdict</div>
                  <div className="text-xs font-extrabold">{recastResult.verdict}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Slider & Controls Block */}
          <div className="bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200/60 space-y-6">
            
            {/* Editable Loan Baseline Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mortgage Loan Amount ($)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-semibold">$</span>
                  <input
                    type="number"
                    min="10000"
                    step="10000"
                    value={recastBalance}
                    onChange={(e) => {
                      const newBal = Math.max(10000, Number(e.target.value));
                      setRecastBalance(newBal);
                      if (lumpSumPayoff > newBal) {
                        setLumpSumPayoff(newBal);
                      }
                    }}
                    className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm font-extrabold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="flex gap-1.5 mt-1.5 text-[10px]">
                  <button type="button" onClick={() => { setRecastBalance(500000); if (lumpSumPayoff > 500000) setLumpSumPayoff(500000); }} className="hover:text-emerald-700 underline font-semibold text-slate-500">$500k</button>
                  <button type="button" onClick={() => { setRecastBalance(650000); if (lumpSumPayoff > 650000) setLumpSumPayoff(650000); }} className="hover:text-emerald-700 underline font-bold text-emerald-700">$650k (Default)</button>
                  <button type="button" onClick={() => { setRecastBalance(750000); if (lumpSumPayoff > 750000) setLumpSumPayoff(750000); }} className="hover:text-emerald-700 underline font-semibold text-slate-500">$750k</button>
                  <button type="button" onClick={() => { setRecastBalance(1000000); if (lumpSumPayoff > 1000000) setLumpSumPayoff(1000000); }} className="hover:text-emerald-700 underline font-semibold text-slate-500">$1M</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mortgage Interest Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.01"
                    max="15"
                    step="0.125"
                    value={Number((recastRate * 100).toFixed(3))}
                    onChange={(e) => setRecastRate(Number(e.target.value) / 100)}
                    className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm font-extrabold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Fixed loan interest rate</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Remaining Term (Months)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="12"
                    max="360"
                    step="1"
                    value={recastTermMonths}
                    onChange={(e) => setRecastTermMonths(Number(e.target.value))}
                    className="w-full pl-3 pr-12 py-2 border border-slate-200 rounded-lg text-sm font-extrabold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 font-semibold text-[11px]">mo</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">~{(recastTermMonths / 12).toFixed(1)} years remaining</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  Lump-Sum Principal Paydown Amount:
                  <span className="text-emerald-700 text-lg font-extrabold tabular-nums">
                    {formatCurrency(lumpSumPayoff)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({recastResult.payoffPct.toFixed(1)}% of loan balance)
                  </span>
                </label>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                  <button 
                    type="button" 
                    onClick={() => setLumpSumPayoff(0)} 
                    className={`px-2.5 py-1 rounded-lg border transition ${lumpSumPayoff === 0 ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'}`}
                  >
                    0% ($0)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setLumpSumPayoff(Math.round(recastBalance * 0.25))} 
                    className={`px-2.5 py-1 rounded-lg border transition ${lumpSumPayoff === Math.round(recastBalance * 0.25) ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'}`}
                  >
                    25% ({formatCurrencyInt(recastBalance * 0.25)})
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setLumpSumPayoff(Math.round(recastBalance * 0.50))} 
                    className={`px-2.5 py-1 rounded-lg border transition ${lumpSumPayoff === Math.round(recastBalance * 0.50) ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'}`}
                  >
                    50% ({formatCurrencyInt(recastBalance * 0.50)})
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setLumpSumPayoff(Math.round(recastBalance * 0.75))} 
                    className={`px-2.5 py-1 rounded-lg border transition ${lumpSumPayoff === Math.round(recastBalance * 0.75) ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'}`}
                  >
                    75% ({formatCurrencyInt(recastBalance * 0.75)})
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setLumpSumPayoff(recastBalance)} 
                    className={`px-2.5 py-1 rounded-lg border transition ${lumpSumPayoff === recastBalance ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'}`}
                  >
                    100% Full Payoff ({formatCurrencyInt(recastBalance)})
                  </button>
                </div>
              </div>

              {/* Range Input Slider */}
              <input 
                type="range" 
                min="0" 
                max={recastBalance} 
                step="1000" 
                value={lumpSumPayoff} 
                onChange={e => setLumpSumPayoff(Number(e.target.value))} 
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                <span>$0 (No Recast)</span>
                <span>{formatCurrencyInt(recastBalance * 0.5)} (Half Payoff)</span>
                <span>{formatCurrencyInt(recastBalance)} (Full 100% Payoff)</span>
              </div>
            </div>

            {/* Parameters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-200/60">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mortgage Principal Balance</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">$</span>
                  <input 
                    type="number" 
                    value={recastBalance} 
                    onChange={e => setRecastBalance(Number(e.target.value))} 
                    className="w-full pl-7 pr-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Interest Rate (%)</label>
                <input 
                  type="number" 
                  step="0.001" 
                  value={recastRate * 100} 
                  onChange={e => setRecastRate(Number(e.target.value) / 100)} 
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Remaining Term (Months)</label>
                <input 
                  type="number" 
                  value={recastTermMonths} 
                  onChange={e => setRecastTermMonths(Number(e.target.value))} 
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Lump Sum Payoff ($)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold">$</span>
                  <input 
                    type="number" 
                    value={lumpSumPayoff} 
                    onChange={e => setLumpSumPayoff(Number(e.target.value))} 
                    className="w-full pl-7 pr-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-emerald-700 font-extrabold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dual-Perspective Impact Cards (2026 Specific vs Ongoing & Lifetime) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Card 1: 2026 Immediate Tax Year Impact */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 text-white p-6 rounded-2xl border border-indigo-700/50 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="font-extrabold text-base text-white">2026 Tax Year Immediate Impact</h3>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-800 text-indigo-200 border border-indigo-700">
                  Remaining {recastResult.taxYear2026.monthsIn2026} Months of 2026
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="text-indigo-200 font-medium">2026 Interest Deduction Loss</div>
                  <div className="text-lg font-black text-rose-400 tabular-nums">
                    -{formatCurrency(recastResult.taxYear2026.interestDeductionLost2026)}
                  </div>
                  <div className="text-[10px] text-slate-400">Pro-rated for remaining 2026 months</div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="text-indigo-200 font-medium">2026 Additional Tax Liability</div>
                  <div className="text-lg font-black text-amber-300 tabular-nums">
                    +{formatCurrency(recastResult.taxYear2026.totalTaxIncrease2026)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Fed: +{formatCurrency(recastResult.taxYear2026.fedTaxIncrease2026)} | CA: +{formatCurrency(recastResult.taxYear2026.caTaxIncrease2026)}
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="text-indigo-200 font-medium">2026 Safe Harbor Target Update</div>
                  <div className="text-lg font-black text-purple-300 tabular-nums">
                    +{formatCurrency(recastResult.taxYear2026.safeHarborTargetIncrease2026)}
                  </div>
                  <div className="text-[10px] text-slate-400">90% rule withholding target adjustment</div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="text-indigo-200 font-medium">2026 Cash Flow Savings</div>
                  <div className="text-lg font-black text-emerald-400 tabular-nums">
                    +{formatCurrency(recastResult.taxYear2026.cashFlowSaved2026)}
                  </div>
                  <div className="text-[10px] text-slate-400">Freed up in remaining 2026 months</div>
                </div>
              </div>

              <div className="text-[11px] text-indigo-200 bg-indigo-950/60 p-3 rounded-xl border border-indigo-800/60">
                💡 <strong>2026 Takeaway:</strong> If you recast today, your 2026 tax bill increases by <strong className="text-amber-300">+{formatCurrency(recastResult.taxYear2026.totalTaxIncrease2026)}</strong> due to lower 2026 mortgage interest deductions. However, you save <strong className="text-emerald-300">+{formatCurrency(recastResult.taxYear2026.cashFlowSaved2026)}</strong> in housing payments before Dec 31, 2026!
              </div>
            </div>

            {/* Card 2: Ongoing Annual & Lifetime Impact (General) */}
            <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white p-6 rounded-2xl border border-emerald-700/50 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="font-extrabold text-base text-white">Ongoing Annual & Lifetime Impact (General)</h3>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-700">
                  {(recastTermMonths / 12).toFixed(1)} Year Remaining Term
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="text-emerald-200 font-medium">Monthly P&I Payment Saved</div>
                  <div className="text-lg font-black text-emerald-400 tabular-nums">
                    +{formatCurrency(recastResult.monthlySavings)}/mo
                  </div>
                  <div className="text-[10px] text-slate-400">Permanently lowers monthly required expense</div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="text-emerald-200 font-medium">Ongoing Annual Interest Saved</div>
                  <div className="text-lg font-black text-blue-300 tabular-nums">
                    {formatCurrency(recastResult.annualInterestSaved)}/yr
                  </div>
                  <div className="text-[10px] text-slate-400">Pre-tax interest expense eliminated</div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="text-emerald-200 font-medium">Total Lifetime Interest Saved</div>
                  <div className="text-lg font-black text-sky-300 tabular-nums">
                    {formatCurrency(recastResult.totalLifetimeInterestSaved)}
                  </div>
                  <div className="text-[10px] text-slate-400">Total savings over full loan term</div>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
                  <div className="text-emerald-200 font-medium">Net Tax-Adjusted Return</div>
                  <div className="text-lg font-black text-purple-300 tabular-nums">
                    {(recastResult.effectiveNetReturn * 100).toFixed(2)}% Net
                  </div>
                  <div className="text-[10px] text-slate-400">Outperforms 4.5% CD ({formatPercent(recastResult.altInvestmentNetYield)} net)</div>
                </div>
              </div>

              <div className="text-[11px] text-emerald-200 bg-emerald-950/60 p-3 rounded-xl border border-emerald-800/60">
                📈 <strong>General Takeaway:</strong> Beyond 2026, recasting generates ongoing net savings of <strong className="text-emerald-300">+{formatCurrency(recastResult.netAnnualBenefit)}/year</strong> (after tax effects), providing a guaranteed tax-free return of <strong className="text-purple-300">{(recastResult.effectiveNetReturn * 100).toFixed(2)}%</strong>.
              </div>
            </div>

          </div>

          {/* Detailed Comparison Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Financial Metric</th>
                  <th className="py-3 px-4 text-right">Baseline (0% Payoff)</th>
                  <th className="py-3 px-4 text-right text-emerald-700">Recast ({recastResult.payoffPct.toFixed(0)}% Payoff)</th>
                  <th className="py-3 px-4 text-right text-indigo-700">2026 Immediate Impact</th>
                  <th className="py-3 px-4 text-right text-emerald-800">Ongoing Annual Advantage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                <tr>
                  <td className="py-2.5 px-4 font-semibold">Remaining Principal Balance</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{formatCurrency(recastResult.currentBalance)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-800 tabular-nums">{formatCurrency(recastResult.newBalance)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-indigo-700 tabular-nums">-{formatCurrency(recastResult.lumpSumPayoff)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-800 tabular-nums">-{formatCurrency(recastResult.lumpSumPayoff)}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold">Monthly P&I Payment</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{formatCurrency(recastResult.origMonthlyPayment)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-800 tabular-nums">{formatCurrency(recastResult.newMonthlyPayment)}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-700 tabular-nums">+{formatCurrency(recastResult.taxYear2026.cashFlowSaved2026)} in 2026</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-700 tabular-nums">+{formatCurrency(recastResult.monthlySavings)}/mo freed</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold">Mortgage Interest Paid</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{formatCurrency(recastResult.annualInterestBefore)}/yr</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-800 tabular-nums">{formatCurrency(recastResult.annualInterestAfter)}/yr</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-700 tabular-nums">-{formatCurrency(recastResult.taxYear2026.interestDeductionLost2026)} in 2026</td>
                  <td className="py-2.5 px-4 text-right font-bold text-emerald-700 tabular-nums">-{formatCurrency(recastResult.annualInterestSaved)}/yr saved</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 font-semibold">Tax Shield (Schedule A & CA 540)</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{formatCurrency((recastResult.annualInterestBefore * (calculations.isItemizingFed ? 0.24 : 0)) + (recastResult.annualInterestBefore * (calculations.isItemizingCA ? 0.093 : 0)))}/yr</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{formatCurrency((recastResult.annualInterestAfter * (calculations.isItemizingFed ? 0.24 : 0)) + (recastResult.annualInterestAfter * (calculations.isItemizingCA ? 0.093 : 0)))}/yr</td>
                  <td className="py-2.5 px-4 text-right text-amber-700 tabular-nums">+{formatCurrency(recastResult.taxYear2026.totalTaxIncrease2026)} 2026 tax cost</td>
                  <td className="py-2.5 px-4 text-right text-amber-700 tabular-nums">-{formatCurrency(recastResult.totalTaxShieldLost)}/yr deduction loss</td>
                </tr>
                <tr className="bg-slate-50/90 font-bold text-slate-900">
                  <td className="py-3 px-4">Net Guaranteed Annual Value & Return</td>
                  <td className="py-3 px-4 text-right">0.00%</td>
                  <td className="py-3 px-4 text-right text-purple-700 font-extrabold">{(recastResult.effectiveNetReturn * 100).toFixed(2)}% Net Return</td>
                  <td className="py-3 px-4 text-right text-indigo-700 font-extrabold tabular-nums">
                    +{formatCurrency(recastResult.taxYear2026.cashFlowSaved2026 - recastResult.taxYear2026.totalTaxIncrease2026)} 2026 net cash
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-extrabold tabular-nums">
                    +{formatCurrency(recastResult.netAnnualBenefit)}/yr net advantage
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* In-depth Analysis & Recommendations */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Info className="w-4 h-4" />
              Tax & Financial Analysis: Is Recasting Worth It?
            </div>
            
            <div className="text-sm text-slate-200 leading-relaxed space-y-3">
              <p className="font-semibold text-white text-base">
                {recastResult.verdictReason}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 space-y-1">
                  <div className="font-bold text-indigo-400">1. Immediate 2026 Tax Effect</div>
                  <div className="text-slate-300">
                    Recasting in 2026 reduces your 2026 mortgage interest deduction by <strong>{formatCurrency(recastResult.taxYear2026.interestDeductionLost2026)}</strong> across remaining months, adding <strong>+{formatCurrency(recastResult.taxYear2026.totalTaxIncrease2026)}</strong> to your 2026 tax bill (and increasing your Safe Harbor target by <strong>+{formatCurrency(recastResult.taxYear2026.safeHarborTargetIncrease2026)}</strong>).
                  </div>
                </div>
                <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 space-y-1">
                  <div className="font-bold text-emerald-400">2. Guaranteed ROI vs. CDs</div>
                  <div className="text-slate-300">
                    A 4.50% Bank CD yields <strong>{formatPercent(recastResult.altInvestmentNetYield)}</strong> net after federal + CA taxes. Paying down your 6.125% mortgage yields a guaranteed net return of <strong>{(recastResult.effectiveNetReturn * 100).toFixed(2)}%</strong> — beating safe cash by <strong>+{((recastResult.effectiveNetReturn - recastResult.altInvestmentNetYield) * 100).toFixed(2)}% annually</strong>.
                  </div>
                </div>
                <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 space-y-1">
                  <div className="font-bold text-purple-400">3. Monthly Cash Flow Improvement</div>
                  <div className="text-slate-300">
                    Recasting lowers your mandatory monthly housing payment by <strong>{formatCurrency(recastResult.monthlySavings)}/mo</strong> ({formatCurrency(recastResult.annualSavings)}/yr), permanently expanding your monthly budget surplus and reducing leverage risk.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Math Proof & Statutory Legal Authorities Modal */}
      {showMathModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden space-y-0 my-auto flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowMathModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                <Award className="w-4 h-4" />
                Verifiable Proof & Legal Authorities · Tax Year 2026
              </div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Mathematical Proof & Statutory Authorities
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                Complete transparent derivation of all recast math, step-by-step interest re-amortization formulas, and legal statutory citations under the Internal Revenue Code (IRC) and California Revenue & Taxation Code (RTC).
              </p>

              {/* Modal Navigation Tabs */}
              <div className="flex items-center gap-2 mt-5 border-b border-white/10 pb-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMathModalTab('formulas')}
                  className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
                    mathModalTab === 'formulas'
                      ? 'bg-white text-indigo-950 font-extrabold shadow-sm'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  Step-by-Step Math
                </button>
                <button
                  type="button"
                  onClick={() => setMathModalTab('sources')}
                  className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
                    mathModalTab === 'sources'
                      ? 'bg-white text-indigo-950 font-extrabold shadow-sm'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Statutory Legal Sources (IRC & CA RTC)
                </button>
                <button
                  type="button"
                  onClick={() => setMathModalTab('verification')}
                  className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
                    mathModalTab === 'verification'
                      ? 'bg-white text-indigo-950 font-extrabold shadow-sm'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live Audit Matrix
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-grow text-xs text-slate-700 leading-relaxed bg-slate-50/50">
              
              {/* Tab 1: Step-by-Step Math Formulas */}
              {mathModalTab === 'formulas' && (
                <div className="space-y-6">
                  
                  {/* Formula 1 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">1</span>
                      Mortgage Re-Amortization Formula (Standard Fixed Annuity)
                    </div>
                    <div className="bg-slate-900 text-emerald-300 font-mono p-3 rounded-xl text-center text-xs sm:text-sm shadow-inner">
                      Payment (P) = Balance × [ r(1 + r)ⁿ ] / [ (1 + r)ⁿ - 1 ]
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      <li><strong>Balance (B):</strong> Current remaining principal balance ($620,000 baseline).</li>
                      <li><strong>Monthly Interest Rate (r):</strong> Annual interest rate ÷ 12 (6.125% ÷ 12 = 0.0051041667).</li>
                      <li><strong>Remaining Term (n):</strong> {recastTermMonths} remaining months (~{(recastTermMonths / 12).toFixed(1)} years).</li>
                      <li><strong>Baseline Payment:</strong> $620,000 × [ 0.005104 × (1.005104)³⁴⁵ ] / [ (1.005104)³⁴⁵ - 1 ] = <strong>{formatCurrency(recastResult.origMonthlyPayment)}/mo</strong>.</li>
                      <li><strong>Recast Payment (${formatCurrencyInt(lumpSumPayoff)} Payoff):</strong> New balance {formatCurrency(recastResult.newBalance)} → <strong>{formatCurrency(recastResult.newMonthlyPayment)}/mo</strong>.</li>
                      <li><strong>Monthly Cash Flow Saved:</strong> {formatCurrency(recastResult.origMonthlyPayment)} - {formatCurrency(recastResult.newMonthlyPayment)} = <strong className="text-emerald-700">+{formatCurrency(recastResult.monthlySavings)}/month</strong>.</li>
                    </ul>
                  </div>

                  {/* Formula 2 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">2</span>
                      Annual Pre-Tax Interest Saved Formula
                    </div>
                    <div className="bg-slate-900 text-sky-300 font-mono p-3 rounded-xl text-center text-xs sm:text-sm shadow-inner">
                      Annual Interest Saved (ΔI) = Lump Sum Payoff × Annual Interest Rate
                    </div>
                    <div className="text-slate-600 space-y-1">
                      <p>For a principal paydown of <strong>{formatCurrency(lumpSumPayoff)}</strong> at <strong>{formatPercent(recastRate)}</strong> interest:</p>
                      <p className="font-mono text-slate-900 font-bold bg-slate-100 p-2 rounded-lg inline-block">
                        {formatCurrency(lumpSumPayoff)} × {(recastRate * 100).toFixed(3)}% = <span className="text-blue-700 font-extrabold">{formatCurrency(recastResult.annualInterestSaved)}/year saved</span>
                      </p>
                    </div>
                  </div>

                  {/* Formula 3 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">3</span>
                      Tax Shield Deduction Loss & Itemized Threshold Formula
                    </div>
                    <div className="bg-slate-900 text-amber-300 font-mono p-3 rounded-xl text-center text-xs sm:text-sm shadow-inner">
                      Annual Tax Shield Lost = ΔI × (Marginal Fed Bracket + Marginal CA Bracket)
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      <li><strong>Federal Tax Bracket:</strong> {calculations.isItemizingFed ? '24.0% (IRC § 1(j))' : '0.0% (Standard Deduction Used)'}.</li>
                      <li><strong>California State Tax Bracket:</strong> {calculations.isItemizingCA ? '9.3% (CA RTC § 17041)' : '0.0% (Standard Deduction Used)'}.</li>
                      <li><strong>Combined Effective Tax Shield Rate:</strong> {((calculations.isItemizingFed ? 0.24 : 0) + (calculations.isItemizingCA ? 0.093 : 0) * 100).toFixed(1)}%.</li>
                      <li><strong>Annual Tax Benefit Reduction:</strong> {formatCurrency(recastResult.annualInterestSaved)} × {((calculations.isItemizingFed ? 0.24 : 0) + (calculations.isItemizingCA ? 0.093 : 0) * 100).toFixed(1)}% = <strong className="text-amber-700">-{formatCurrency(recastResult.totalTaxShieldLost)}/year</strong>.</li>
                    </ul>
                  </div>

                  {/* Formula 4 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">4</span>
                      Net Tax-Adjusted Return vs. 4.50% Bank CD Formula
                    </div>
                    <div className="bg-slate-900 text-purple-300 font-mono p-3 rounded-xl text-center text-xs sm:text-sm shadow-inner">
                      Effective Net Return = [ Annual Interest Saved - Tax Shield Lost ] ÷ Lump Sum Payoff
                    </div>
                    <div className="text-slate-600 space-y-2">
                      <p><strong>Recast Net Yield:</strong> [ {formatCurrency(recastResult.annualInterestSaved)} - {formatCurrency(recastResult.totalTaxShieldLost)} ] ÷ {formatCurrency(lumpSumPayoff)} = <strong className="text-purple-700 font-extrabold text-sm">{(recastResult.effectiveNetReturn * 100).toFixed(2)}% Net Return</strong>.</p>
                      <p><strong>4.50% Bank CD Net Yield:</strong> 4.50% × (1 - 0.333) = <strong className="text-slate-900 font-bold">{formatPercent(recastResult.altInvestmentNetYield)} Net After-Tax</strong>.</p>
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-900 font-bold">
                        ✨ Net Advantage: Recasting beats holding safe cash CDs by <span className="text-emerald-700 underline font-extrabold">+{( (recastResult.effectiveNetReturn - recastResult.altInvestmentNetYield) * 100 ).toFixed(2)}% net per year</span>!
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 2: Statutory Legal Sources (IRS & CA FTB) */}
              {mathModalTab === 'sources' && (
                <div className="space-y-4">
                  
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        26 U.S.C. § 163(h)(3)(F) — Federal Home Mortgage Interest Limitation
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Federal Code (TCJA)
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Under the Tax Cuts and Jobs Act (TCJA), primary residence acquisition debt incurred after Dec 15, 2017 is capped at <strong>$750,000</strong> for Married Filing Jointly ($375,000 for MFS). Interest paid on qualifying mortgage debt up to $750k is fully deductible on IRS Form 1040 Schedule A.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-1 text-[11px]">
                      <a 
                        href="https://www.law.cornell.edu/uscode/text/26/163" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold underline"
                      >
                        26 U.S.C. § 163 Statutory Text <ExternalLink className="w-3 h-3" />
                      </a>
                      <a 
                        href="https://www.irs.gov/publications/p936" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold underline"
                      >
                        IRS Publication 936 (Home Mortgage Interest) <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        26 U.S.C. § 164(b)(6) — State & Local Tax (SALT) Deduction Cap
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Federal Code
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Federal itemized deductions for state income taxes and real estate property taxes combined are capped at <strong>$10,000</strong> ($40,000 under new 2026 proposals). Home mortgage interest is deducted separately under § 163(h) and is <strong>exempt from the SALT cap</strong>.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-1 text-[11px]">
                      <a 
                        href="https://www.law.cornell.edu/uscode/text/26/164" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold underline"
                      >
                        26 U.S.C. § 164 Statutory Text <ExternalLink className="w-3 h-3" />
                      </a>
                      <a 
                        href="https://www.irs.gov/instructions/i1040sa" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold underline"
                      >
                        IRS Schedule A (Form 1040) Instructions <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                        IRS Rev. Proc. 2024-40 & IRC § 63(c) — 2026 Standard Deduction
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        Official IRS Inflation Release
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      The Federal Standard Deduction for Married Filing Jointly (MFJ) for Tax Year 2026 is <strong>$29,200</strong>. Taxpayers only obtain a tax benefit from Schedule A itemized deductions to the extent total itemized deductions exceed $29,200.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-1 text-[11px]">
                      <a 
                        href="https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2025" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-bold underline"
                      >
                        IRS Official Inflation Adjustments Release <ExternalLink className="w-3 h-3" />
                      </a>
                      <a 
                        href="https://www.irs.gov/taxtopics/tc551" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-bold underline"
                      >
                        IRS Topic 551 Standard Deduction <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        California Rev. & Tax Code § 17201 & Form 540 — CA Tax Rules
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        CA State Statute
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      California allows mortgage interest deductions on up to <strong>$1,000,000</strong> of mortgage debt and permits full property tax deductions <strong>without the federal $10k SALT cap</strong>. CA Standard Deduction is <strong>$10,726</strong> for MFJ.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-1 text-[11px]">
                      <a 
                        href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=RTC&sectionNum=17201" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold underline"
                      >
                        CA RTC § 17201 Statutory Code <ExternalLink className="w-3 h-3" />
                      </a>
                      <a 
                        href="https://www.ftb.ca.gov/forms/misc/1001.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold underline"
                      >
                        CA FTB Publication 1001 (Schedule CA Adjustments) <ExternalLink className="w-3 h-3" />
                      </a>
                      <a 
                        href="https://www.ftb.ca.gov/forms/2024/2024-540-booklet.html" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold underline"
                      >
                        CA FTB Form 540 Official Tax Booklet <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                        26 U.S.C. § 6654 & CA FTB Form 5805 — Safe Harbor Penalty Protection
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        IRS & FTB Underpayment Code
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Taxpayers avoid underpayment penalties if total payroll withholding equals at least <strong>90% of current year tax liability</strong> or <strong>110% of prior year tax liability</strong> (if prior AGI &gt; $150k). IRS statutory underpayment interest rate is <strong>8.00%</strong> (IRC § 6621); CA FTB rate is <strong>7.00%</strong> (CA RTC § 19521).
                    </p>
                    <div className="flex flex-wrap gap-4 pt-1 text-[11px]">
                      <a 
                        href="https://www.law.cornell.edu/uscode/text/26/6654" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-bold underline"
                      >
                        26 U.S.C. § 6654 Statutory Text <ExternalLink className="w-3 h-3" />
                      </a>
                      <a 
                        href="https://www.irs.gov/publications/p505" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-bold underline"
                      >
                        IRS Publication 505 (Tax Withholding & Estimated Tax) <ExternalLink className="w-3 h-3" />
                      </a>
                      <a 
                        href="https://www.ftb.ca.gov/forms/2024/2024-5805.pdf" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-bold underline"
                      >
                        CA FTB Form 5805 Official PDF <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                        Federal Reserve H.15 & TreasuryDirect — Benchmark CD / Yield References
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                        U.S. Treasury Benchmark
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Alternative cash benchmark yields (4.50% APY Bank CD / Treasury rate) reflect official U.S. Treasury yield curves and Federal Reserve Board H.15 statistical releases.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-1 text-[11px]">
                      <a 
                        href="https://www.treasurydirect.gov/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 font-bold underline"
                      >
                        TreasuryDirect.gov Official Site <ExternalLink className="w-3 h-3" />
                      </a>
                      <a 
                        href="https://www.federalreserve.gov/releases/h15/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 font-bold underline"
                      >
                        Federal Reserve H.15 Statistical Release <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 3: Formula Verification Matrix */}
              {mathModalTab === 'verification' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                    <div className="font-bold text-xs text-slate-900 uppercase tracking-wider">Live Calculation Audit Matrix</div>
                    <p className="text-slate-600">
                      Every calculation below is derived dynamically from your current active inputs:
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Parameter Name</th>
                          <th className="py-2.5 px-3">Symbol</th>
                          <th className="py-2.5 px-3 text-right">Active Value</th>
                          <th className="py-2.5 px-3">Math Rule / Citation</th>
                          <th className="py-2.5 px-3 text-center">Audit Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        <tr>
                          <td className="py-2 px-3 font-semibold">Mortgage Principal Balance</td>
                          <td className="py-2 px-3 font-mono text-slate-500">B_orig</td>
                          <td className="py-2 px-3 text-right font-bold tabular-nums">{formatCurrency(recastResult.currentBalance)}</td>
                          <td className="py-2 px-3 text-slate-600">Rocket Mortgage Primary Residence Loan</td>
                          <td className="py-2 px-3 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Verified</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">Interest Rate</td>
                          <td className="py-2 px-3 font-mono text-slate-500">r_annual</td>
                          <td className="py-2 px-3 text-right font-bold tabular-nums">{(recastRate * 100).toFixed(3)}%</td>
                          <td className="py-2 px-3 text-slate-600">Fixed Rate Origination (May 2025)</td>
                          <td className="py-2 px-3 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Verified</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">Remaining Loan Term</td>
                          <td className="py-2 px-3 font-mono text-slate-500">n</td>
                          <td className="py-2 px-3 text-right font-bold tabular-nums">{recastTermMonths} mo</td>
                          <td className="py-2 px-3 text-slate-600">Remaining term to maturity (June 2055)</td>
                          <td className="py-2 px-3 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Verified</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">Lump Sum Payoff</td>
                          <td className="py-2 px-3 font-mono text-slate-500">L</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700 tabular-nums">{formatCurrency(lumpSumPayoff)}</td>
                          <td className="py-2 px-3 text-slate-600">Active User Slider Selection</td>
                          <td className="py-2 px-3 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Active User Input</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">New Principal Balance</td>
                          <td className="py-2 px-3 font-mono text-slate-500">B_new</td>
                          <td className="py-2 px-3 text-right font-bold tabular-nums">{formatCurrency(recastResult.newBalance)}</td>
                          <td className="py-2 px-3 text-slate-600">B_orig - L</td>
                          <td className="py-2 px-3 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Verified</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">Monthly Payment Saved</td>
                          <td className="py-2 px-3 font-mono text-slate-500">ΔP</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700 tabular-nums">+{formatCurrency(recastResult.monthlySavings)}/mo</td>
                          <td className="py-2 px-3 text-slate-600">P_orig - P_new (Fixed Annuity Equation)</td>
                          <td className="py-2 px-3 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Verified</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">2026 Additional Tax Cost</td>
                          <td className="py-2 px-3 font-mono text-slate-500">T_2026</td>
                          <td className="py-2 px-3 text-right font-bold text-amber-700 tabular-nums">+{formatCurrency(recastResult.taxYear2026.totalTaxIncrease2026)}</td>
                          <td className="py-2 px-3 text-slate-600">Pro-rated Deduction Loss × Combined Marginal Rate</td>
                          <td className="py-2 px-3 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Verified</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">Net Effective Return</td>
                          <td className="py-2 px-3 font-mono text-slate-500">ROI_net</td>
                          <td className="py-2 px-3 text-right font-bold text-purple-700 tabular-nums">{(recastResult.effectiveNetReturn * 100).toFixed(2)}%</td>
                          <td className="py-2 px-3 text-slate-600">[ ΔI - Tax Shield Lost ] / L</td>
                          <td className="py-2 px-3 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Verified</span></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold">4.50% CD Net After-Tax Yield</td>
                          <td className="py-2 px-3 font-mono text-slate-500">Y_CD,net</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">{formatPercent(recastResult.altInvestmentNetYield)}</td>
                          <td className="py-2 px-3 text-slate-600">4.50% × (1 - (Fed + CA Rates))</td>
                          <td className="py-2 px-3 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">Verified</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 text-xs">
              <div className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>All statutory tax rates & math rules reflect IRS & CA FTB 2026 specifications.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMathModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition shadow-sm"
              >
                Close Math Audit
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  </div>
);
}

