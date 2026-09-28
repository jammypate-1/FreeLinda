export interface ClientProfile {
  name: string;
  relationship: string;
  dob: string;
  age: number;
  dependent: boolean;
  taxDependent: boolean;
  residency: string;
  occupation: string;
  healthNotes: string;
  planningNotes: string;
  riskTolerance: string;
  riskScoreDate: string;
  riskScope: string;
  lossTolerance: string;
  liquidityPreference: string;
  valuesConstraints: string;
  advisors: {
    role: string;
    name: string;
    contact: string;
    email: string;
    phone: string;
    address: string;
    portal?: string;
    permission: boolean;
    notes: string;
  }[];
}

export interface PlanningAssumptions {
  inflationRate: number;
  preFinancialFreedomReturn: number;
  financialFreedomReturn: number;
  cashReturn: number;
  emergencyFundMonthsTarget: number;
  dtiWatchLimit: number;
  highInterestThreshold: number;
  estateReviewCadenceYears: number;
  insuranceReviewCadenceYears: number;
  primaryFinancialFreedomAge: number;
  coClientFinancialFreedomAge: number;
  asOfDate: string;
}

export interface AssetAccount {
  id: string;
  name: string;
  type: string;
  institution: string;
  accountLast4: string;
  taxRegistration: string;
  liquidity: string;
  allocationCategory: string;
  currentValue: number;
  costBasis: number;
  monthlyContribution: number;
  annualReturn: number;
  status: 'Active' | 'Inactive' | 'Review';
  notes: string;
  lastUpdated: string;
}

export interface TaxLot {
  id: string;
  ticker: string;
  name: string;
  assetName: string;
  acquisitionDate: string;
  term: 'Short Term' | 'Long Term';
  shares: number;
  costBasisPerShare: number;
  currentPrice: number;
  totalCostBasis: number;
  totalCurrentValue: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPct: number;
}

export interface Liability {
  id: string;
  owner: string;
  creditor: string;
  type: string;
  securedBy: string;
  currentBalance: number;
  interestRate: number;
  minMonthlyPayment: number;
  plannedMonthlyPayment: number;
  taxDeductible: boolean;
  variableRate: boolean;
  priority: string;
  notes: string;
  status: 'Active' | 'Closed' | 'Inactive';
}

export interface CashFlowItem {
  id: string;
  type: 'Income' | 'Expense';
  category: string;
  description?: string;
  incomeTaxClassification?: 'Earned' | 'Unearned' | 'Short Term Capital' | 'Long Term Capital';
  owner: string;
  frequency: 'Weekly' | 'Biweekly' | 'Monthly' | 'Quarterly' | 'Annual' | 'One-Time';
  amountPerFrequency: number;
  monthlyAmount: number;
  annualAmount: number;
  essential: boolean;
  taxDeductible: boolean;
  notes: string;
  status: 'Active' | 'Pending' | 'Inactive';
}

export interface Goal {
  id: string;
  name: string;
  owner: string;
  planningArea: string;
  priority: 'High' | 'Medium' | 'Low';
  targetDate: string;
  targetAmount: number;
  currentFunding: number;
  monthlySavings: number;
  expectedReturn: number;
  status: 'Active' | 'Complete' | 'On Track' | 'Review Needed';
  notes: string;
}

export interface FinancialFreedomIncomeSource {
  id: string;
  owner: string;
  type: string;
  provider: string;
  earliestStartDate: string;
  plannedStartDate: string;
  annualAmountToday: number;
  cola: boolean;
  taxability: string;
  survivorBenefit: string;
  status: 'Active' | 'Planned' | 'Review';
  notes: string;
}

export interface SocialSecurityScenario {
  claimAge: number;
  monthlyBenefit: number;
  annualBenefit: number;
  cumulativeAt75: number;
  cumulativeAt80: number;
  cumulativeAt85: number;
  cumulativeAt90: number;
}

export type HedgeStrategyKey = 'protective_put' | 'collar' | 'bear_put_spread' | 'ratio_put' | 'put_spread_collar';

export interface HedgeOptionLeg {
  id: string;
  name: string;
  type: 'put' | 'call';
  action: 'buy' | 'sell';
  strike: number;
  premium: number;
  quantity: number;
}

export interface OptionHedgeConfig {
  underlyingTicker: string;
  underlyingPrice: number;
  sharesHeld: number;
  optionTicker?: string;
  optionPrice?: number;
  contracts: number;
  longPutStrike: number;
  longPutPremium?: number;
  shortPutStrike: number;
  shortPutPremium?: number;
  netPremiumPaid: number;
  maxProfit?: number;
  strategy?: HedgeStrategyKey;
  legs?: HedgeOptionLeg[];
}

export interface EstateItem {
  id: string;
  documentItem: string;
  appliesTo: string;
  status: 'Complete' | 'Needs Drafting' | 'Needs Update' | 'Not Started';
  dateSigned: string;
  attorney: string;
  storageLocation: string;
  reviewNeeded: boolean;
  notes: string;
}

export interface BeneficiaryRecord {
  id: string;
  accountPolicy: string;
  owner: string;
  primaryBeneficiary: string;
  primaryPct: number;
  contingentBeneficiary: string;
  contingentPct: number;
  perStirpes: boolean;
  lastReviewed: string;
  status: 'Current' | 'Needs Review' | 'Missing';
  notes: string;
}

export interface DocumentItem {
  id: string;
  documentRecord: string;
  category: string;
  needed: boolean;
  received: boolean;
  dateReceived: string;
  storageLink: string;
  status: 'Received' | 'Pending' | 'Missing';
  notes: string;
}

export interface ActionItem {
  id: string;
  planningArea: string;
  actionItem: string;
  owner: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status: 'Not Started' | 'In Progress' | 'Complete' | 'Waiting on Client';
  nextStep: string;
  notes: string;
}

export interface DashboardMetrics {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  liquidAssets: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNetCashFlow: number;
  essentialMonthlyExpenses: number;
  emergencyFundMonths: number;
  monthlyDebtPayments: number;
  dtiRatio: number;
}

export type WaccCalculationMode = 'custom' | 'capm';
export type TerminalValueMethod = 'gordon' | 'exit_multiple';

export interface SpcxRevenueStream {
  id: string;
  name: string;
  category: string;
  annualRevenue: number; // in $ Millions
  projectedGrowth: number; // annual growth rate decimal (e.g. 0.10)
  marginPct?: number; // optional segment margin %
  notes?: string;
}

export interface SpcxCostItem {
  id: string;
  name: string;
  category: 'COGS' | 'Personnel' | 'Technology & Data' | 'Compliance & Admin' | 'Marketing & Distribution' | 'CapEx' | 'Other';
  annualCost: number; // in $ Millions
  inflationRate: number; // annual cost inflation rate decimal (e.g. 0.03)
  isCapEx?: boolean;
  notes?: string;
}

export interface SpcxDcfAssumptions {
  id?: string;
  scenarioName?: string;
  
  // Baseline Financials Mode
  useGranularBreakdown: boolean;
  fcfBaseline: number; // in $ Millions (e.g. 145.0)
  sharesOutstanding: number; // in Millions (e.g. 20.25)
  cashAndEquivalents: number; // in $ Millions (e.g. 85.0)
  totalDebt: number; // in $ Millions (e.g. 110.0)
  currentPrice: number; // Market Price per share ($)

  // Granular Revenue & Cost Breakdown
  revenueStreams: SpcxRevenueStream[];
  costItems: SpcxCostItem[];

  // Growth Rate Assumptions
  projectionHorizonYears: number; // 5 to 10 years
  cagrYears1To5: number; // Stage 1 growth rate (decimal, e.g. 0.095 = 9.5%)
  cagrYears6To10: number; // Stage 2 growth rate (decimal, e.g. 0.05 = 5.0%)
  terminalGrowthRate: number; // Perpetual growth rate (decimal, e.g. 0.025 = 2.5%)

  // Discount Rate / WACC
  waccMode: WaccCalculationMode;
  customWacc: number; // Custom WACC rate (decimal, e.g. 0.085 = 8.5%)
  riskFreeRate: number; // decimal (e.g. 0.042)
  beta: number; // multiplier (e.g. 1.12)
  equityRiskPremium: number; // decimal (e.g. 0.055)
  costOfDebtPreTax: number; // decimal (e.g. 0.058)
  taxRate: number; // decimal (e.g. 0.21)
  debtWeight: number; // proportion (e.g. 0.20)
  equityWeight: number; // proportion (e.g. 0.80)

  // Terminal Value Method
  terminalMethod: TerminalValueMethod;
  exitMultiple: number; // Exit FCF / EV Multiple (e.g. 15.0)
}

export interface ProjectedCashFlowYear {
  year: number;
  growthRate: number;
  undiscountedFcf: number;
  discountFactor: number;
  pvFcf: number;
}

export interface DcfSimulationResult {
  effectiveWacc: number;
  costOfEquity: number;
  costOfDebtAfterTax: number;
  projectedCashFlows: ProjectedCashFlowYear[];
  pvExplicitCashFlows: number;
  terminalValue: number;
  pvTerminalValue: number;
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
  fairValuePerShare: number;
  marginOfSafetyPct: number;
  valuationStatus: 'Strong Buy' | 'Undervalued' | 'Fairly Valued' | 'Overvalued';
  totalPortfolioValueMarket: number;
  totalPortfolioValueIntrinsic: number;
  portfolioValueDelta: number;
}

export interface SensitivityCell {
  wacc: number;
  terminalGrowth: number;
  fairValuePerShare: number;
  marginOfSafetyPct: number;
  status: 'Undervalued' | 'Fairly Valued' | 'Overvalued';
}

export interface DcfScenarioPreset {
  id: string;
  name: string;
  description: string;
  assumptions: SpcxDcfAssumptions;
}

export type PortfolioBucketKey = 'spending' | 'income' | 'emergency' | 'growth' | 'nest_egg';

export interface PortfoliosConfig {
  emergencyTargetMonths: number;
  monthlyDistributionFromIncome: number;
  distributionFrequency: 'Monthly' | 'Quarterly';
  customAccountMappings: Record<string, PortfolioBucketKey>;
  nestEggAnnualDiversificationPct: number;
  spendingTargetBufferMonths: number;
  useEssentialExpensesForEmergency: boolean;
  notes: string;
}


