import {
  AssetAccount,
  Liability,
  CashFlowItem,
  PlanningAssumptions,
  DashboardMetrics,
  SocialSecurityScenario,
  OptionHedgeConfig
} from '../types/financial';

export function calculateDashboardMetrics(
  assets: AssetAccount[],
  liabilities: Liability[],
  cashFlows: CashFlowItem[],
  assumptions: PlanningAssumptions
): DashboardMetrics {
  const activeAssets = assets.filter(a => a.status === 'Active');
  const activeLiabilities = liabilities.filter(l => l.status === 'Active');
  const activeCashFlows = cashFlows.filter(c => c.status === 'Active');

  const totalAssets = activeAssets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalLiabilities = activeLiabilities.reduce((sum, l) => sum + l.currentBalance, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Liquid assets: Cash/Bank and Taxable Investments (excluding real estate & financial freedom accounts)
  const liquidAssets = activeAssets
    .filter(a => a.type === 'Cash / Bank' || (a.type === 'Taxable Investment' && a.liquidity === 'Immediate'))
    .reduce((sum, a) => sum + a.currentValue, 0);

  // Liquid cash specifically for emergency fund calculation
  const cashOnlyAssets = activeAssets
    .filter(a => a.type === 'Cash / Bank')
    .reduce((sum, a) => sum + a.currentValue, 0);

  const monthlyIncome = activeCashFlows
    .filter(c => c.type === 'Income')
    .reduce((sum, c) => sum + c.monthlyAmount, 0);

  const monthlyExpenses = activeCashFlows
    .filter(c => c.type === 'Expense')
    .reduce((sum, c) => sum + c.monthlyAmount, 0);

  const monthlyNetCashFlow = monthlyIncome - monthlyExpenses;

  const essentialMonthlyExpenses = activeCashFlows
    .filter(c => c.type === 'Expense' && c.essential)
    .reduce((sum, c) => sum + c.monthlyAmount, 0) || (monthlyExpenses > 0 ? monthlyExpenses : 3834.29);

  const emergencyFundMonths = essentialMonthlyExpenses > 0 ? cashOnlyAssets / essentialMonthlyExpenses : 0;

  const monthlyDebtPayments = activeLiabilities.reduce((sum, l) => sum + l.plannedMonthlyPayment, 0);

  const dtiRatio = monthlyIncome > 0 ? (monthlyDebtPayments / monthlyIncome) : 0;

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    liquidAssets,
    monthlyIncome,
    monthlyExpenses,
    monthlyNetCashFlow,
    essentialMonthlyExpenses,
    emergencyFundMonths,
    monthlyDebtPayments,
    dtiRatio
  };
}

/**
 * Mirror Excel's NPER function: NPER(rate, pmt, pv)
 * Calculates number of periods to pay off a loan given balance, rate, and monthly payment.
 */
export function calculateNper(annualRate: number, monthlyPayment: number, balance: number): number {
  if (balance <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return balance / monthlyPayment;
  if (monthlyPayment <= balance * r) return 999;
  
  const nper = Math.log(monthlyPayment / (monthlyPayment - balance * r)) / Math.log(1 + r);
  return Math.max(0, Math.round(nper * 10) / 10);
}

export interface YearProjectionPoint {
  year: number;
  month: string;
  age: number;
  beginningLiquidBalance: number;
  endingLiquidBalance: number;
  portfolioBalance: number;
  realEstateEquity: number;
  netWorth: number;
  annualContribution: number;
  annualWithdrawal: number;
  socialSecurityIncome: number;
  investmentGrowth: number;
  phase: 'Accumulation' | 'Financial Freedom';
}

/**
 * Calculates lifetime financial freedom projection and net worth balance trajectory
 */
export function calculateFinancialFreedomProjection(
  currentAge: number,
  financialFreedomYear: number,
  financialFreedomMonth: number, // 1-12 (e.g. 4 for April)
  liquidPortfolio: number,
  realEstateVal: number,
  mortgageBalance: number,
  annualSavings: number,
  annualExpensesInFinancialFreedom: number,
  preFinancialFreedomReturn: number,
  financialFreedomReturn: number,
  inflationRate: number,
  ssAnnualBenefit: number,
  ssStartAge: number
): YearProjectionPoint[] {
  const points: YearProjectionPoint[] = [];
  const startYear = 2026;
  let portfolio = liquidPortfolio;
  let houseVal = realEstateVal;
  let debt = mortgageBalance;

  const monthsMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let age = currentAge; age <= 90; age++) {
    const projectionYear = startYear + (age - currentAge);
    
    // Check if this year is before, at, or after target financial freedom year/month
    const isFinancialFreedom = projectionYear > financialFreedomYear || (projectionYear === financialFreedomYear && financialFreedomMonth <= 4);
    const returnRate = isFinancialFreedom ? financialFreedomReturn : preFinancialFreedomReturn;
    
    const inflationFactor = Math.pow(1 + inflationRate, age - currentAge);

    const beginningLiquidBalance = Math.round(portfolio);

    // Real estate 3% annual appreciation
    houseVal = houseVal * 1.03;
    
    // Mortgage paydown ($2,334/mo = ~$28,011/yr, ~5.75% interest)
    if (debt > 0) {
      const interestPayment = debt * 0.0575;
      const principalPaid = Math.min(debt, 28011 - interestPayment);
      debt = Math.max(0, debt - principalPaid);
    }

    const realEstateEquity = Math.round(houseVal - debt);

    let annualContrib = 0;
    let annualWithdrawal = 0;
    let ssIncome = 0;
    let growth = 0;

    if (!isFinancialFreedom) {
      annualContrib = annualSavings * inflationFactor;
      growth = (portfolio + annualContrib / 2) * returnRate;
      portfolio = portfolio + annualContrib + growth;
    } else {
      if (age >= ssStartAge) {
        ssIncome = ssAnnualBenefit * Math.pow(1 + inflationRate, age - ssStartAge);
      }
      const neededExpenses = annualExpensesInFinancialFreedom * inflationFactor;
      annualWithdrawal = Math.max(0, neededExpenses - ssIncome);

      growth = (portfolio - annualWithdrawal / 2) * returnRate;
      portfolio = Math.max(0, portfolio - annualWithdrawal + growth);
    }

    const endingLiquidBalance = Math.round(portfolio);
    const totalNetWorth = Math.round(portfolio + realEstateEquity);

    points.push({
      year: projectionYear,
      month: projectionYear === financialFreedomYear ? monthsMap[financialFreedomMonth - 1] : 'Dec',
      age,
      beginningLiquidBalance,
      endingLiquidBalance,
      portfolioBalance: endingLiquidBalance,
      realEstateEquity,
      netWorth: totalNetWorth,
      annualContribution: Math.round(annualContrib),
      annualWithdrawal: Math.round(annualWithdrawal),
      socialSecurityIncome: Math.round(ssIncome),
      investmentGrowth: Math.round(growth),
      phase: isFinancialFreedom ? 'Financial Freedom' : 'Accumulation'
    });
  }

  return points;
}

export interface HedgeMatrixPoint {
  underlyingPrice: number;
  underlyingPnL: number;
  optionPnL: number;
  totalPnL: number;
}

/**
 * Calculates Bear Put Spread Payoff Scenario Matrix
 */
export function calculateHedgeMatrix(config: OptionHedgeConfig): HedgeMatrixPoint[] {
  const points: HedgeMatrixPoint[] = [];
  const startPrice = config.underlyingPrice * 0.5;
  const endPrice = config.underlyingPrice * 1.6;
  const step = (endPrice - startPrice) / 10;

  for (let p = startPrice; p <= endPrice + 0.01; p += step) {
    const price = Math.round(p * 100) / 100;
    
    const underlyingPnL = (price - config.underlyingPrice) * config.sharesHeld;

    const longPutPayoff = Math.max(0, config.longPutStrike - price);
    const shortPutPayoff = Math.max(0, config.shortPutStrike - price);
    
    const optionGrossPayoff = config.contracts * 100 * (longPutPayoff - shortPutPayoff);
    const optionPnL = optionGrossPayoff - config.netPremiumPaid;

    points.push({
      underlyingPrice: price,
      underlyingPnL: Math.round(underlyingPnL),
      optionPnL: Math.round(optionPnL),
      totalPnL: Math.round(underlyingPnL + optionPnL)
    });
  }

  return points;
}

export interface SpcxSolvencyResult {
  minSpcxPrice: number;
  minSpcxValue: number;
  currentSpcxPrice: number;
  currentSpcxValue: number;
  priceBuffer: number;
  priceBufferPct: number;
  isSolventAtCurrentPrice: boolean;
  depletionAgeAtCurrentPrice: number | null;
  age90LiquidBalanceAtCurrentPrice: number;
  age90NetWorthAtCurrentPrice: number;
}

export interface SpcxSensitivityPoint {
  spcxPrice: number;
  spcxValue: number;
  initialLiquidPortfolio: number;
  retireNetWorth: number;
  age60NetWorth: number;
  age75NetWorth: number;
  age90NetWorth: number;
  age90LiquidBalance: number;
  depletionAge: number | null;
  isSolvent: boolean;
  label?: string;
}

/**
 * Solves for the exact minimum price per share of SPCX stock needed
 * for Linda's liquid portfolio balance to remain positive through age 90.
 */
export function calculateMinSpcxPrice(
  spcxShares: number,
  nonSpcxLiquidPortfolio: number,
  currentSpcxPrice: number,
  currentAge: number,
  retireYear: number,
  retireMonth: number,
  realEstateVal: number,
  mortgageBalance: number,
  annualSavings: number,
  annualExpenses: number,
  preReturn: number,
  postReturn: number,
  inflation: number,
  ssAnnualBenefit: number,
  ssStartAge: number
): SpcxSolvencyResult {
  if (spcxShares <= 0) {
    return {
      minSpcxPrice: 0,
      minSpcxValue: 0,
      currentSpcxPrice,
      currentSpcxValue: 0,
      priceBuffer: 0,
      priceBufferPct: 0,
      isSolventAtCurrentPrice: true,
      depletionAgeAtCurrentPrice: null,
      age90LiquidBalanceAtCurrentPrice: 0,
      age90NetWorthAtCurrentPrice: 0,
    };
  }

  const runProjectionForPrice = (price: number) => {
    const testLiquid = nonSpcxLiquidPortfolio + (spcxShares * price);
    const projection = calculateFinancialFreedomProjection(
      currentAge,
      retireYear,
      retireMonth,
      testLiquid,
      realEstateVal,
      mortgageBalance,
      annualSavings,
      annualExpenses,
      preReturn,
      postReturn,
      inflation,
      ssAnnualBenefit,
      ssStartAge
    );
    const age90Point = projection[projection.length - 1];
    const depletedPoint = projection.find(p => p.endingLiquidBalance <= 0);
    return {
      projection,
      age90Point,
      isSolvent: age90Point.endingLiquidBalance > 0,
      depletionAge: depletedPoint ? depletedPoint.age : null
    };
  };

  let low = 0;
  let high = 2000;
  let minPrice = 0;

  if (runProjectionForPrice(0).isSolvent) {
    minPrice = 0;
  } else {
    for (let i = 0; i < 30; i++) {
      const mid = (low + high) / 2;
      const res = runProjectionForPrice(mid);
      if (res.isSolvent) {
        minPrice = mid;
        high = mid;
      } else {
        low = mid;
      }
    }
  }

  const currentRes = runProjectionForPrice(currentSpcxPrice);
  const minSpcxValue = minPrice * spcxShares;
  const currentSpcxValue = currentSpcxPrice * spcxShares;
  const priceBuffer = currentSpcxPrice - minPrice;
  const priceBufferPct = minPrice > 0 ? ((currentSpcxPrice - minPrice) / minPrice) * 100 : 100;

  return {
    minSpcxPrice: Math.round(minPrice * 100) / 100,
    minSpcxValue: Math.round(minSpcxValue),
    currentSpcxPrice,
    currentSpcxValue: Math.round(currentSpcxValue),
    priceBuffer: Math.round(priceBuffer * 100) / 100,
    priceBufferPct: Math.round(priceBufferPct * 10) / 10,
    isSolventAtCurrentPrice: currentRes.isSolvent,
    depletionAgeAtCurrentPrice: currentRes.depletionAge,
    age90LiquidBalanceAtCurrentPrice: currentRes.age90Point.endingLiquidBalance,
    age90NetWorthAtCurrentPrice: currentRes.age90Point.netWorth
  };
}

/**
 * Generates SPCX stock price sensitivity matrix points across range of share prices.
 */
export function calculateSpcxSensitivityMatrix(
  spcxShares: number,
  nonSpcxLiquidPortfolio: number,
  minSpcxPrice: number,
  currentSpcxPrice: number,
  currentAge: number,
  retireYear: number,
  retireMonth: number,
  realEstateVal: number,
  mortgageBalance: number,
  annualSavings: number,
  annualExpenses: number,
  preReturn: number,
  postReturn: number,
  inflation: number,
  ssAnnualBenefit: number,
  ssStartAge: number
): SpcxSensitivityPoint[] {
  const priceSteps = [0, 25, 50, minSpcxPrice, currentSpcxPrice, 150, 200, 250];
  const uniquePrices = Array.from(new Set(priceSteps.map(p => Math.round(p * 100) / 100))).sort((a, b) => a - b);

  return uniquePrices.map(price => {
    const initialLiquid = Math.round(nonSpcxLiquidPortfolio + (spcxShares * price));
    const proj = calculateFinancialFreedomProjection(
      currentAge,
      retireYear,
      retireMonth,
      initialLiquid,
      realEstateVal,
      mortgageBalance,
      annualSavings,
      annualExpenses,
      preReturn,
      postReturn,
      inflation,
      ssAnnualBenefit,
      ssStartAge
    );

    const retirePt = proj.find(p => p.year === retireYear) || proj[0];
    const age60Pt = proj.find(p => p.age === 60) || proj[0];
    const age75Pt = proj.find(p => p.age === 75) || proj[0];
    const age90Pt = proj[proj.length - 1];
    const depletedPt = proj.find(p => p.endingLiquidBalance <= 0);

    let label: string | undefined;
    if (price === 0) label = '$0 (Wipeout)';
    else if (Math.abs(price - minSpcxPrice) < 0.05) label = `Min Required ($${minSpcxPrice.toFixed(2)})`;
    else if (Math.abs(price - currentSpcxPrice) < 0.05) label = `Current Live ($${currentSpcxPrice.toFixed(2)})`;

    return {
      spcxPrice: price,
      spcxValue: Math.round(price * spcxShares),
      initialLiquidPortfolio: initialLiquid,
      retireNetWorth: retirePt.netWorth,
      age60NetWorth: age60Pt.netWorth,
      age75NetWorth: age75Pt.netWorth,
      age90NetWorth: age90Pt.netWorth,
      age90LiquidBalance: age90Pt.endingLiquidBalance,
      depletionAge: depletedPt ? depletedPt.age : null,
      isSolvent: age90Pt.endingLiquidBalance > 0,
      label
    };
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatPercent(value: number): string {
  return (value * 100).toFixed(1) + '%';
}

export interface MortgageRecastInput {
  currentBalance: number;
  annualInterestRate: number;
  remainingTermMonths: number;
  lumpSumPayoff: number;
  recastFee?: number;
  fedMarginalRate: number;
  caMarginalRate: number;
  isItemizingFed: boolean;
  isItemizingCA: boolean;
  altInvestmentYield?: number;
  monthsRemainingIn2026?: number;
}

export interface TaxYear2026RecastImpact {
  monthsIn2026: number;
  interestDeductionLost2026: number;
  fedTaxIncrease2026: number;
  caTaxIncrease2026: number;
  totalTaxIncrease2026: number;
  safeHarborTargetIncrease2026: number;
  cashFlowSaved2026: number;
  netOutofPocket2026: number;
}

export interface MortgageRecastResult {
  currentBalance: number;
  lumpSumPayoff: number;
  payoffPct: number;
  newBalance: number;
  recastFee: number;
  origMonthlyPayment: number;
  newMonthlyPayment: number;
  monthlySavings: number;
  annualSavings: number;
  annualInterestBefore: number;
  annualInterestAfter: number;
  annualInterestSaved: number;
  totalLifetimeInterestSaved: number;

  taxYear2026: TaxYear2026RecastImpact;

  fedTaxShieldLost: number;
  caTaxShieldLost: number;
  totalTaxShieldLost: number;
  netAnnualBenefit: number;
  effectiveNetReturn: number;
  altInvestmentNetYield: number;
  annualAltInvestmentIncome: number;
  verdict: 'Highly Beneficial' | 'Favorable' | 'Neutral' | 'Less Favorable';
  verdictReason: string;
}

/**
 * Calculates Mortgage Recast and Principal Paydown math, tax impacts, and ROI vs alternative cash investment.
 */
export function calculateMortgageRecast(input: MortgageRecastInput): MortgageRecastResult {
  const {
    currentBalance,
    annualInterestRate,
    remainingTermMonths,
    lumpSumPayoff,
    recastFee = 250,
    fedMarginalRate,
    caMarginalRate,
    isItemizingFed,
    isItemizingCA,
    altInvestmentYield = 0.045,
    monthsRemainingIn2026 = 4
  } = input;

  const boundedPayoff = Math.min(Math.max(0, lumpSumPayoff), currentBalance);
  const payoffPct = currentBalance > 0 ? (boundedPayoff / currentBalance) * 100 : 0;
  const newBalance = Math.max(0, currentBalance - boundedPayoff);

  const r = annualInterestRate / 12;
  const n = remainingTermMonths;

  const calcPmt = (bal: number) => {
    if (bal <= 0 || n <= 0) return 0;
    if (r === 0) return bal / n;
    return (bal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  };

  const origMonthlyPayment = calcPmt(currentBalance);
  const newMonthlyPayment = calcPmt(newBalance);
  const monthlySavings = Math.max(0, origMonthlyPayment - newMonthlyPayment);
  const annualSavings = monthlySavings * 12;

  const annualInterestBefore = currentBalance * annualInterestRate;
  const annualInterestAfter = newBalance * annualInterestRate;
  const annualInterestSaved = Math.max(0, annualInterestBefore - annualInterestAfter);

  const origTotalRemainingInterest = Math.max(0, origMonthlyPayment * n - currentBalance);
  const newTotalRemainingInterest = Math.max(0, newMonthlyPayment * n - newBalance);
  const totalLifetimeInterestSaved = Math.max(0, origTotalRemainingInterest - newTotalRemainingInterest);

  const fedTaxShieldLost = isItemizingFed ? annualInterestSaved * fedMarginalRate : 0;
  const caTaxShieldLost = isItemizingCA ? annualInterestSaved * caMarginalRate : 0;
  const totalTaxShieldLost = fedTaxShieldLost + caTaxShieldLost;

  const monthsIn2026 = Math.min(12, Math.max(1, monthsRemainingIn2026));
  const fraction2026 = monthsIn2026 / 12;
  const interestDeductionLost2026 = annualInterestSaved * fraction2026;
  const fedTaxIncrease2026 = isItemizingFed ? interestDeductionLost2026 * fedMarginalRate : 0;
  const caTaxIncrease2026 = isItemizingCA ? interestDeductionLost2026 * caMarginalRate : 0;
  const totalTaxIncrease2026 = fedTaxIncrease2026 + caTaxIncrease2026;
  const safeHarborTargetIncrease2026 = totalTaxIncrease2026 * 0.90;
  const cashFlowSaved2026 = monthlySavings * monthsIn2026;
  const netOutofPocket2026 = boundedPayoff + recastFee + totalTaxIncrease2026 - cashFlowSaved2026;

  const netAnnualBenefit = Math.max(0, annualInterestSaved - totalTaxShieldLost);
  const effectiveNetReturn = boundedPayoff > 0 ? netAnnualBenefit / boundedPayoff : annualInterestRate * (1 - (isItemizingFed ? fedMarginalRate : 0) - (isItemizingCA ? caMarginalRate : 0));

  const altInvestmentNetYield = altInvestmentYield * (1 - (fedMarginalRate + caMarginalRate));
  const annualAltInvestmentIncome = boundedPayoff * altInvestmentNetYield;

  let verdict: 'Highly Beneficial' | 'Favorable' | 'Neutral' | 'Less Favorable' = 'Favorable';
  let verdictReason = '';

  if (boundedPayoff <= 0) {
    verdict = 'Neutral';
    verdictReason = 'Select a principal paydown amount above $0 to simulate a mortgage recast.';
  } else if (effectiveNetReturn > altInvestmentNetYield + 0.01) {
    verdict = 'Highly Beneficial';
    verdictReason = `Paying off principal yields a net ${formatPercent(effectiveNetReturn)} tax-adjusted return, significantly outperforming a ${formatPercent(altInvestmentYield)} CD (${formatPercent(altInvestmentNetYield)} net after tax).`;
  } else if (effectiveNetReturn >= altInvestmentNetYield) {
    verdict = 'Favorable';
    verdictReason = `Paying down principal yields ${formatPercent(effectiveNetReturn)} net guaranteed return, exceeding CD/cash net returns while eliminating ${formatCurrency(monthlySavings)}/mo in required payment.`;
  } else {
    verdict = 'Less Favorable';
    verdictReason = `Alternative investments returning over ${formatPercent(effectiveNetReturn)} may generate higher net after-tax returns.`;
  }

  return {
    currentBalance,
    lumpSumPayoff: boundedPayoff,
    payoffPct,
    newBalance,
    recastFee,
    origMonthlyPayment,
    newMonthlyPayment,
    monthlySavings,
    annualSavings,
    annualInterestBefore,
    annualInterestAfter,
    annualInterestSaved,
    totalLifetimeInterestSaved,

    taxYear2026: {
      monthsIn2026,
      interestDeductionLost2026,
      fedTaxIncrease2026,
      caTaxIncrease2026,
      totalTaxIncrease2026,
      safeHarborTargetIncrease2026,
      cashFlowSaved2026,
      netOutofPocket2026
    },

    fedTaxShieldLost,
    caTaxShieldLost,
    totalTaxShieldLost,
    netAnnualBenefit,
    effectiveNetReturn,
    altInvestmentNetYield,
    annualAltInvestmentIncome,
    verdict,
    verdictReason
  };
}

