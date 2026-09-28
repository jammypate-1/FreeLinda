import {
  SpcxDcfAssumptions,
  DcfSimulationResult,
  ProjectedCashFlowYear,
  SensitivityCell,
  DcfScenarioPreset,
  SpcxRevenueStream,
  SpcxCostItem
} from '../types/financial';

export const DEFAULT_REVENUE_STREAMS: SpcxRevenueStream[] = [
  {
    id: 'rev-01',
    name: 'Starlink Global Satellite Broadband & Connectivity',
    category: 'Starlink Connectivity',
    annualRevenue: 115.0, // $115M
    projectedGrowth: 0.18,
    marginPct: 0.65,
    notes: 'Consumer, enterprise, aviation & maritime high-speed low-Earth orbit (LEO) satellite subscriptions.'
  },
  {
    id: 'rev-02',
    name: 'Commercial & Defense Space Launch Services',
    category: 'Commercial & NASA Launch',
    annualRevenue: 48.0, // $48M
    projectedGrowth: 0.08,
    marginPct: 0.45,
    notes: 'Falcon 9, Falcon Heavy & Starship launches for NASA Commercial Crew, Space Force & commercial satellites.'
  },
  {
    id: 'rev-03',
    name: 'xAI Orbital Micro-Data Centers & Starshield Defense',
    category: 'Defense & AI Compute',
    annualRevenue: 22.0, // $22M
    projectedGrowth: 0.22,
    marginPct: 0.70,
    notes: 'High-performance spaceborne AI compute, Starshield national security payloads & advanced optical links.'
  }
];

export const DEFAULT_COST_ITEMS: SpcxCostItem[] = [
  {
    id: 'cost-01',
    name: 'Rocket Manufacturing, Launch Operations & Direct COGS',
    category: 'COGS',
    annualCost: 18.0, // $18M
    inflationRate: 0.03,
    notes: 'Propellant, launch pad turnaround, fairing refurbishing, and satellite assembly direct COGS.'
  },
  {
    id: 'cost-02',
    name: 'Starship & Raptor Engine Research & Development (R&D)',
    category: 'Technology & Data',
    annualCost: 14.0, // $14M
    inflationRate: 0.04,
    notes: 'Starship prototype iterations, Raptor 3 engine manufacturing, and laser inter-link R&D.'
  },
  {
    id: 'cost-03',
    name: 'Starlink Ground Stations & Spectrum License Operations',
    category: 'Compliance & Admin',
    annualCost: 8.0, // $8M
    inflationRate: 0.025,
    notes: 'Global ground gateway stations, ITU/FCC spectrum licensing, fiber backhaul & customer terminal support.'
  },
  {
    id: 'cost-04',
    name: 'Corporate Operations, G&A, SEC/FCC & Insurance',
    category: 'Compliance & Admin',
    annualCost: 5.0, // $5M
    inflationRate: 0.03,
    notes: 'Global legal counsel, SEC/FCC filings, executive G&A, and orbital launching liability insurance.'
  },
  {
    id: 'cost-05',
    name: 'Constellation Mass Satellite & Starbase CapEx',
    category: 'CapEx',
    annualCost: 15.0, // $15M CapEx
    inflationRate: 0.035,
    isCapEx: true,
    notes: 'Next-gen Starlink V2 Mini satellite production, Starbase TX orbital launch mount & pad expansion.'
  }
];

export const DEFAULT_SPCX_DCF_ASSUMPTIONS: SpcxDcfAssumptions = {
  id: 'bear-case',
  scenarioName: 'Bear Case (Conservative / Macro Downturn)',
  
  // Baseline Financials ($ Millions & Shares in Millions)
  useGranularBreakdown: false,
  fcfBaseline: 145.0, // $145M base Free Cash Flow
  sharesOutstanding: 20.25, // 20.25M Diluted Shares (matches Linda's 20,250 shares scale)
  cashAndEquivalents: 85.0, // $85M Cash
  totalDebt: 110.0, // $110M Debt
  currentPrice: 137.95, // Default market price

  // Granular Breakdown defaults
  revenueStreams: DEFAULT_REVENUE_STREAMS,
  costItems: DEFAULT_COST_ITEMS,

  // Growth Rates (Conservative Bear Case Defaults)
  projectionHorizonYears: 10,
  cagrYears1To5: 0.045, // 4.5% annual growth for 5 years
  cagrYears6To10: 0.025, // 2.5% transition growth for years 6-10
  terminalGrowthRate: 0.015, // 1.5% perpetual terminal growth

  // Discount Rate (WACC)
  waccMode: 'capm',
  customWacc: 0.098, // 9.8% Conservative discount rate
  riskFreeRate: 0.045, // 4.5% 10-Yr Treasury
  beta: 1.35, // 1.35 Elevated Risk Beta
  equityRiskPremium: 0.055, // 5.5% ERP
  costOfDebtPreTax: 0.065, // 6.5% Cost of Debt
  taxRate: 0.21, // 21% Corporate Tax Rate
  debtWeight: 0.20, // 20% Debt Capital
  equityWeight: 0.80, // 80% Equity Capital

  // Terminal Value Method
  terminalMethod: 'gordon',
  exitMultiple: 11.5
};

export interface GranularFcfSummary {
  totalRevenue: number;
  totalOperatingCosts: number;
  ebitda: number;
  taxes: number;
  totalCapEx: number;
  calculatedFcf: number;
  ebitdaMarginPct: number;
}

export function calculateGranularFcf(assumptions: SpcxDcfAssumptions): GranularFcfSummary {
  const totalRevenue = (assumptions.revenueStreams || []).reduce((sum, r) => sum + (r.annualRevenue || 0), 0);

  const opExItems = (assumptions.costItems || []).filter(c => !c.isCapEx && c.category !== 'CapEx');
  const capExItems = (assumptions.costItems || []).filter(c => c.isCapEx || c.category === 'CapEx');

  const totalOperatingCosts = opExItems.reduce((sum, c) => sum + (c.annualCost || 0), 0);
  const totalCapEx = capExItems.reduce((sum, c) => sum + (c.annualCost || 0), 0);

  const ebitda = Math.max(0, totalRevenue - totalOperatingCosts);
  const taxes = Math.max(0, ebitda * (assumptions.taxRate || 0.21));

  const calculatedFcf = Math.max(0, ebitda - taxes - totalCapEx);
  const ebitdaMarginPct = totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalOperatingCosts,
    ebitda,
    taxes,
    totalCapEx,
    calculatedFcf,
    ebitdaMarginPct
  };
}

export const DCF_SCENARIO_PRESETS: DcfScenarioPreset[] = [
  {
    id: 'base',
    name: 'Base Case',
    description: 'Consensus wall street baseline with 9.5% initial growth and 8.5% CAPM discount rate.',
    assumptions: { ...DEFAULT_SPCX_DCF_ASSUMPTIONS }
  },
  {
    id: 'bull',
    name: 'Optimistic (Bull Case)',
    description: 'Accelerated 14.5% 5-yr growth, margin expansion, 7.8% WACC, and 3.0% perpetual growth.',
    assumptions: {
      ...DEFAULT_SPCX_DCF_ASSUMPTIONS,
      id: 'bull-case',
      scenarioName: 'Bull Case (Accelerated Expansion)',
      cagrYears1To5: 0.145,
      cagrYears6To10: 0.075,
      terminalGrowthRate: 0.030,
      beta: 0.98,
      riskFreeRate: 0.040,
      customWacc: 0.078,
      exitMultiple: 18.5
    }
  },
  {
    id: 'bear',
    name: 'Conservative (Bear Case)',
    description: 'Slow growth (4.5%), macro headwinds, elevated risk beta (1.35), 9.8% WACC.',
    assumptions: {
      ...DEFAULT_SPCX_DCF_ASSUMPTIONS,
      id: 'bear-case',
      scenarioName: 'Bear Case (Conservative / Macro Downturn)',
      cagrYears1To5: 0.045,
      cagrYears6To10: 0.025,
      terminalGrowthRate: 0.015,
      beta: 1.35,
      riskFreeRate: 0.045,
      customWacc: 0.098,
      exitMultiple: 11.5
    }
  },
  {
    id: 'high-rates',
    name: 'High Inflation & Rates',
    description: 'Elevated 10-Yr Treasury yield (5.2%), cost of capital at 10.5%, reduced terminal valuation.',
    assumptions: {
      ...DEFAULT_SPCX_DCF_ASSUMPTIONS,
      id: 'high-rates',
      scenarioName: 'High Inflation & Rates Scenario',
      riskFreeRate: 0.052,
      costOfDebtPreTax: 0.072,
      cagrYears1To5: 0.070,
      cagrYears6To10: 0.040,
      terminalGrowthRate: 0.020,
      customWacc: 0.105,
      exitMultiple: 12.0
    }
  }
];

export function calculateWaccDetails(assumptions: SpcxDcfAssumptions) {
  const costOfEquity = assumptions.riskFreeRate + assumptions.beta * assumptions.equityRiskPremium;
  const costOfDebtAfterTax = assumptions.costOfDebtPreTax * (1 - assumptions.taxRate);
  
  const totalWeight = assumptions.debtWeight + assumptions.equityWeight;
  const wD = totalWeight > 0 ? assumptions.debtWeight / totalWeight : 0;
  const wE = totalWeight > 0 ? assumptions.equityWeight / totalWeight : 1;

  const capmWacc = wE * costOfEquity + wD * costOfDebtAfterTax;
  const effectiveWacc = assumptions.waccMode === 'custom' ? assumptions.customWacc : capmWacc;

  return {
    costOfEquity,
    costOfDebtAfterTax,
    capmWacc,
    effectiveWacc
  };
}

export function runDcfValuation(
  assumptions: SpcxDcfAssumptions,
  userSpcxShares: number = 20250
): DcfSimulationResult {
  const { costOfEquity, costOfDebtAfterTax, effectiveWacc } = calculateWaccDetails(assumptions);

  // If granular mode enabled, calculate baseline FCF from bottom-up revenue streams and cost items
  let startingFcf = assumptions.fcfBaseline;
  if (assumptions.useGranularBreakdown) {
    const summary = calculateGranularFcf(assumptions);
    startingFcf = summary.calculatedFcf;
  }

  const horizon = Math.max(1, Math.min(15, assumptions.projectionHorizonYears || 10));
  const projectedCashFlows: ProjectedCashFlowYear[] = [];
  
  let currentFcf = startingFcf;
  let pvExplicitCashFlows = 0;

  for (let year = 1; year <= horizon; year++) {
    const growthRate = year <= 5 ? assumptions.cagrYears1To5 : assumptions.cagrYears6To10;
    currentFcf = currentFcf * (1 + growthRate);

    const discountFactor = 1 / Math.pow(1 + effectiveWacc, year);
    const pvFcf = currentFcf * discountFactor;

    pvExplicitCashFlows += pvFcf;

    projectedCashFlows.push({
      year,
      growthRate,
      undiscountedFcf: currentFcf,
      discountFactor,
      pvFcf
    });
  }

  const finalYearFcf = currentFcf;
  let terminalValue = 0;

  if (assumptions.terminalMethod === 'exit_multiple') {
    terminalValue = finalYearFcf * (assumptions.exitMultiple || 15);
  } else {
    // Gordon Growth Model: TV = [FCF_n * (1 + g)] / (WACC - g)
    const g = assumptions.terminalGrowthRate;
    const waccMinusG = Math.max(0.001, effectiveWacc - g);
    terminalValue = (finalYearFcf * (1 + g)) / waccMinusG;
  }

  const pvTerminalValue = terminalValue / Math.pow(1 + effectiveWacc, horizon);

  // Enterprise Value = PV of explicit cash flows + PV of Terminal Value
  const enterpriseValue = pvExplicitCashFlows + pvTerminalValue;

  // Net Debt = Total Debt - Cash
  const netDebt = assumptions.totalDebt - assumptions.cashAndEquivalents;

  // Equity Value = Enterprise Value - Net Debt
  const equityValue = enterpriseValue - netDebt;

  // Fair Value Per Share
  const shares = assumptions.sharesOutstanding > 0 ? assumptions.sharesOutstanding : 1;
  const fairValuePerShare = equityValue / shares;

  const currentPrice = assumptions.currentPrice > 0 ? assumptions.currentPrice : 137.95;
  const marginOfSafetyPct = fairValuePerShare > 0 ? ((fairValuePerShare - currentPrice) / fairValuePerShare) * 100 : 0;

  let valuationStatus: 'Strong Buy' | 'Undervalued' | 'Fairly Valued' | 'Overvalued' = 'Fairly Valued';
  if (marginOfSafetyPct >= 20) {
    valuationStatus = 'Strong Buy';
  } else if (marginOfSafetyPct > 5) {
    valuationStatus = 'Undervalued';
  } else if (marginOfSafetyPct < -10) {
    valuationStatus = 'Overvalued';
  }

  // Portfolio impact for client
  const totalPortfolioValueMarket = userSpcxShares * currentPrice;
  const totalPortfolioValueIntrinsic = userSpcxShares * fairValuePerShare;
  const portfolioValueDelta = totalPortfolioValueIntrinsic - totalPortfolioValueMarket;

  return {
    effectiveWacc,
    costOfEquity,
    costOfDebtAfterTax,
    projectedCashFlows,
    pvExplicitCashFlows,
    terminalValue,
    pvTerminalValue,
    enterpriseValue,
    netDebt,
    equityValue,
    fairValuePerShare,
    marginOfSafetyPct,
    valuationStatus,
    totalPortfolioValueMarket,
    totalPortfolioValueIntrinsic,
    portfolioValueDelta
  };
}

export function generateSensitivityMatrix(
  baseAssumptions: SpcxDcfAssumptions,
  userSpcxShares: number = 20250
): { waccRange: number[]; growthRange: number[]; grid: SensitivityCell[][] } {
  const baseWacc = calculateWaccDetails(baseAssumptions).effectiveWacc;
  const baseGrowth = baseAssumptions.terminalGrowthRate;
  const currentPrice = baseAssumptions.currentPrice || 137.95;

  const waccRange = [
    baseWacc - 0.015,
    baseWacc - 0.0075,
    baseWacc,
    baseWacc + 0.0075,
    baseWacc + 0.015
  ];

  const growthRange = [
    baseGrowth - 0.010,
    baseGrowth - 0.005,
    baseGrowth,
    baseGrowth + 0.005,
    baseGrowth + 0.010
  ];

  const grid: SensitivityCell[][] = [];

  for (let i = 0; i < waccRange.length; i++) {
    const row: SensitivityCell[] = [];
    const w = waccRange[i];

    for (let j = 0; j < growthRange.length; j++) {
      const g = growthRange[j];

      const simAssumptions: SpcxDcfAssumptions = {
        ...baseAssumptions,
        waccMode: 'custom',
        customWacc: w,
        terminalGrowthRate: g
      };

      const result = runDcfValuation(simAssumptions, userSpcxShares);

      let status: 'Undervalued' | 'Fairly Valued' | 'Overvalued' = 'Fairly Valued';
      if (result.fairValuePerShare > currentPrice * 1.05) {
        status = 'Undervalued';
      } else if (result.fairValuePerShare < currentPrice * 0.95) {
        status = 'Overvalued';
      }

      row.push({
        wacc: w,
        terminalGrowth: g,
        fairValuePerShare: result.fairValuePerShare,
        marginOfSafetyPct: result.marginOfSafetyPct,
        status
      });
    }
    grid.push(row);
  }

  return { waccRange, growthRange, grid };
}
