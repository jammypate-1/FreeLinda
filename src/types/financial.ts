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
  preRetirementReturn: number;
  retirementReturn: number;
  cashReturn: number;
  emergencyFundMonthsTarget: number;
  dtiWatchLimit: number;
  highInterestThreshold: number;
  estateReviewCadenceYears: number;
  insuranceReviewCadenceYears: number;
  primaryRetirementAge: number;
  coClientRetirementAge: number;
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

export interface RetirementIncomeSource {
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
