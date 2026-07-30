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

  // Liquid assets: Cash/Bank and Taxable Investments (excluding real estate & retirement)
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
  phase: 'Accumulation' | 'Retirement';
}

/**
 * Calculates lifetime retirement projection and net worth balance trajectory
 */
export function calculateRetirementProjection(
  currentAge: number,
  retirementYear: number,
  retirementMonth: number, // 1-12 (e.g. 4 for April)
  liquidPortfolio: number,
  realEstateVal: number,
  mortgageBalance: number,
  annualSavings: number,
  annualExpensesInRetirement: number,
  preRetirementReturn: number,
  retirementReturn: number,
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
    
    // Check if this year is before, at, or after target retirement year/month
    const isRetirement = projectionYear > retirementYear || (projectionYear === retirementYear && retirementMonth <= 4);
    const returnRate = isRetirement ? retirementReturn : preRetirementReturn;
    
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

    if (!isRetirement) {
      annualContrib = annualSavings * inflationFactor;
      growth = (portfolio + annualContrib / 2) * returnRate;
      portfolio = portfolio + annualContrib + growth;
    } else {
      if (age >= ssStartAge) {
        ssIncome = ssAnnualBenefit * Math.pow(1 + inflationRate, age - ssStartAge);
      }
      const neededExpenses = annualExpensesInRetirement * inflationFactor;
      annualWithdrawal = Math.max(0, neededExpenses - ssIncome);

      growth = (portfolio - annualWithdrawal / 2) * returnRate;
      portfolio = Math.max(0, portfolio - annualWithdrawal + growth);
    }

    const endingLiquidBalance = Math.round(portfolio);
    const totalNetWorth = Math.round(portfolio + realEstateEquity);

    points.push({
      year: projectionYear,
      month: projectionYear === retirementYear ? monthsMap[retirementMonth - 1] : 'Dec',
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
      phase: isRetirement ? 'Retirement' : 'Accumulation'
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
