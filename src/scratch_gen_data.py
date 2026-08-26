import json
import os

scratch_sheets = r'C:\Users\jammy\.gemini\antigravity-ide\brain\13970faf-4f23-4dd6-8087-4e31d9ecf1fa\scratch\sheets'

def load_sheet(name):
    path = os.path.join(scratch_sheets, f"{name}.json")
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"rows": []}

profile_json = load_sheet("03 Client Profile")
assumptions_json = load_sheet("02 Assumptions")
assets_json = load_sheet("06 Assets")
liabilities_json = load_sheet("07 Liabilities")
cashflow_json = load_sheet("05 Cash Flow")
taxlots_json = load_sheet("Tax Lots")
hedge_json = load_sheet("Hedge")
ss_json = load_sheet("18 Social Security")
estate_json = load_sheet("12 Estate")
docs_json = load_sheet("14 Documents")
lists_json = load_sheet("17 Lists")

ts_code = """import {
  ClientProfile,
  PlanningAssumptions,
  AssetAccount,
  TaxLot,
  Liability,
  CashFlowItem,
  Goal,
  RetirementIncomeSource,
  SocialSecurityScenario,
  OptionHedgeConfig,
  EstateItem,
  BeneficiaryRecord,
  DocumentItem,
  ActionItem
} from '../types/financial';

export const initialClientProfile: ClientProfile = {
  name: "Jane Doe",
  relationship: "Primary Client",
  dob: "1990-05-15",
  age: 36,
  dependent: false,
  taxDependent: false,
  residency: "US Citizen, California",
  occupation: "Full-Time Staff Software Engineer",
  healthNotes: "Good health, non-smoker",
  planningNotes: "Divorced, single income, risk-averse investment profile. Focus on long-term wealth preservation and retirement independence.",
  riskTolerance: "Risk-averse",
  riskScoreDate: "2026-06-01",
  riskScope: "Comprehensive Retirement, Tax & Estate Planning",
  lossTolerance: "Low - prefers capital preservation with balanced equity growth",
  liquidityPreference: "Requires minimum 6-12 months cash reserve in HYSA",
  valuesConstraints: "Tech equity concentration hedging, broad index funds",
  advisors: [
    {
      role: "Certified Financial Planner",
      name: "Alex Vance",
      contact: "Pacific Financial Advisors",
      email: "alex@pacificwealth.com",
      phone: "(415) 555-0199",
      address: "100 Montgomery St, San Francisco, CA",
      portal: "https://pacificwealth.com/portal",
      permission: true,
      notes: "Primary wealth planner & tax strategist"
    },
    {
      role: "CPA / Tax Advisor",
      name: "Sarah Chen, CPA",
      contact: "Bay Area Tax Solutions",
      email: "sarah@baytaxcpa.com",
      phone: "(415) 555-0144",
      address: "50 California St, San Francisco, CA",
      portal: "https://baytaxcpa.com",
      permission: true,
      notes: "Prepares annual 1040 federal & state returns"
    },
    {
      role: "Estate Attorney",
      name: "Marcus Sterling, Esq.",
      contact: "Sterling Estate Law",
      email: "msterling@sterlinglaw.com",
      phone: "(510) 555-0188",
      address: "1939 Harrison St, Oakland, CA",
      portal: "https://sterlinglaw.com",
      permission: true,
      notes: "Drafted original trust & POA documents"
    }
  ]
};

export const initialAssumptions: PlanningAssumptions = {
  inflationRate: 0.02,
  preRetirementReturn: 0.06,
  retirementReturn: 0.05,
  cashReturn: 0.02,
  emergencyFundMonthsTarget: 6.0,
  dtiWatchLimit: 0.36,
  highInterestThreshold: 0.08,
  estateReviewCadenceYears: 3.0,
  insuranceReviewCadenceYears: 2.0,
  primaryRetirementAge: 65,
  coClientRetirementAge: 65,
  asOfDate: "2026-07-30"
};

export const initialAssetAccounts: AssetAccount[] = [
  {
    id: "A-01",
    name: "Primary Residence - 1945 Bradhoff Ave, San Leandro, CA 94577",
    type: "Real Estate",
    institution: "Property Title",
    accountLast4: "94577",
    taxRegistration: "Individual",
    liquidity: "Illiquid",
    allocationCategory: "Real Estate",
    currentValue: 1040500,
    costBasis: 1000000,
    monthlyContribution: 0,
    annualReturn: 0.03,
    status: "Active",
    notes: "Purchased 12/24/2025. Put $600k down. Current market valuation $1.0405M.",
    lastUpdated: "2026-07-01"
  },
  {
    id: "A-02",
    name: "Google Stock Portfolio",
    type: "Taxable Investment",
    institution: "Morgan Stanley Wealth Management",
    accountLast4: "8841",
    taxRegistration: "Individual Taxable",
    liquidity: "Immediate",
    allocationCategory: "Equities",
    currentValue: 554892.99,
    costBasis: 287503.14,
    monthlyContribution: 0,
    annualReturn: 0.07,
    status: "Active",
    notes: "1,668.55 shares vested equity compensation.",
    lastUpdated: "2026-07-01"
  },
  {
    id: "A-03",
    name: "SpaceX Equity Stock",
    type: "Taxable Investment",
    institution: "Solium (Morgan Stanley)",
    accountLast4: "4920",
    taxRegistration: "Individual Taxable",
    liquidity: "Illiquid",
    allocationCategory: "Equities",
    currentValue: 2276505.00,
    costBasis: 66300.00,
    monthlyContribution: 0,
    annualReturn: 0.10,
    status: "Active",
    notes: "20,250 shares private company stock.",
    lastUpdated: "2026-07-01"
  },
  {
    id: "A-04",
    name: "Keysight & Agilent Portfolio",
    type: "Taxable Investment",
    institution: "Fidelity Brokerage",
    accountLast4: "3310",
    taxRegistration: "Individual Taxable",
    liquidity: "Immediate",
    allocationCategory: "Equities",
    currentValue: 81000.00,
    costBasis: 60000.00,
    monthlyContribution: 0,
    annualReturn: 0.06,
    status: "Active",
    notes: "Holds Agilent (49.727 sh) & Keysight (237.767 sh).",
    lastUpdated: "2026-07-01"
  },
  {
    id: "A-05",
    name: "Redwood Credit Union Checking",
    type: "Cash / Bank",
    institution: "Redwood Credit Union",
    accountLast4: "9310",
    taxRegistration: "Individual",
    liquidity: "Immediate",
    allocationCategory: "Cash",
    currentValue: 51060.00,
    costBasis: 51060.00,
    monthlyContribution: 500,
    annualReturn: 0.005,
    status: "Active",
    notes: "Primary operating checking account.",
    lastUpdated: "2026-07-15"
  },
  {
    id: "A-06",
    name: "Redwood Credit Union Savings",
    type: "Cash / Bank",
    institution: "Redwood Credit Union",
    accountLast4: "9301",
    taxRegistration: "Individual",
    liquidity: "Immediate",
    allocationCategory: "Cash",
    currentValue: 14538.00,
    costBasis: 14538.00,
    monthlyContribution: 200,
    annualReturn: 0.015,
    status: "Active",
    notes: "Secondary liquid savings reserve.",
    lastUpdated: "2026-07-15"
  },
  {
    id: "A-07",
    name: "Marcus High-Yield Savings (HYSA)",
    type: "Cash / Bank",
    institution: "Marcus by Goldman Sachs",
    accountLast4: "1795",
    taxRegistration: "Individual",
    liquidity: "Immediate",
    allocationCategory: "Cash",
    currentValue: 15391.00,
    costBasis: 15391.00,
    monthlyContribution: 0,
    annualReturn: 0.045,
    status: "Active",
    notes: "High yield savings cash reserve.",
    lastUpdated: "2026-07-15"
  },
  {
    id: "A-08",
    name: "Wealthfront HYSA Reserve",
    type: "Cash / Bank",
    institution: "Wealthfront Cash",
    accountLast4: "WDNF",
    taxRegistration: "Individual",
    liquidity: "Immediate",
    allocationCategory: "Cash",
    currentValue: 15434.00,
    costBasis: 15434.00,
    monthlyContribution: 0,
    annualReturn: 0.050,
    status: "Active",
    notes: "High yield emergency cash fund.",
    lastUpdated: "2026-07-15"
  },
  {
    id: "A-09",
    name: "Health Equity HSA Account",
    type: "HSA",
    institution: "Health Equity",
    accountLast4: "5021",
    taxRegistration: "HSA",
    liquidity: "Immediate",
    allocationCategory: "Cash",
    currentValue: 2000.00,
    costBasis: 2000.00,
    monthlyContribution: 300,
    annualReturn: 0.04,
    status: "Active",
    notes: "Triple tax-advantaged health savings account.",
    lastUpdated: "2026-07-01"
  },
  {
    id: "A-10",
    name: "Google 401(k) Retirement Plan",
    type: "Traditional Retirement",
    institution: "Vanguard",
    accountLast4: "4011",
    taxRegistration: "401(k) Pre-Tax",
    liquidity: "Long-term",
    allocationCategory: "Equities",
    currentValue: 126490.00,
    costBasis: 100000.00,
    monthlyContribution: 1950,
    annualReturn: 0.07,
    status: "Active",
    notes: "Active 401(k) with 50% employer match up to IRS max.",
    lastUpdated: "2026-07-01"
  },
  {
    id: "A-11",
    name: "SpaceX Prior 401(k) Rollover",
    type: "Traditional Retirement",
    institution: "Fidelity Investments",
    accountLast4: "6233",
    taxRegistration: "Traditional IRA Rollover",
    liquidity: "Long-term",
    allocationCategory: "Equities",
    currentValue: 29763.00,
    costBasis: 22000.00,
    monthlyContribution: 0,
    annualReturn: 0.065,
    status: "Active",
    notes: "Rollover 401k from SpaceX employment.",
    lastUpdated: "2026-07-01"
  },
  {
    id: "A-12",
    name: "Keysight Legacy 401(k)",
    type: "Traditional Retirement",
    institution: "Fidelity Investments",
    accountLast4: "0082",
    taxRegistration: "Traditional IRA Rollover",
    liquidity: "Long-term",
    allocationCategory: "Equities",
    currentValue: 64950.00,
    costBasis: 48000.00,
    monthlyContribution: 0,
    annualReturn: 0.065,
    status: "Active",
    notes: "Legacy 401k from Keysight Technologies.",
    lastUpdated: "2026-07-01"
  }
];

export const initialTaxLots: TaxLot[] = [
  {
    id: "TL-01",
    ticker: "GOOGL",
    name: "Alphabet Inc. Class A",
    assetName: "Google Stock Portfolio",
    shares: 1668.55,
    costBasisPerShare: 172.31,
    currentPrice: 332.56,
    totalCostBasis: 287503.14,
    totalCurrentValue: 554892.99,
    unrealizedGainLoss: 267389.85,
    unrealizedGainLossPct: 93.00
  },
  {
    id: "TL-02",
    ticker: "SPCX",
    name: "S&P 500 ETF Trust",
    assetName: "Keysight & Agilent Portfolio",
    shares: 400.00,
    costBasisPerShare: 85.00,
    currentPrice: 112.42,
    totalCostBasis: 34000.00,
    totalCurrentValue: 44968.00,
    unrealizedGainLoss: 10968.00,
    unrealizedGainLossPct: 32.26
  },
  {
    id: "TL-03",
    ticker: "A",
    name: "Agilent Technologies Inc.",
    assetName: "Keysight & Agilent Portfolio",
    shares: 49.727,
    costBasisPerShare: 110.00,
    currentPrice: 138.64,
    totalCostBasis: 5470.00,
    totalCurrentValue: 6894.15,
    unrealizedGainLoss: 1424.15,
    unrealizedGainLossPct: 26.04
  },
  {
    id: "TL-04",
    ticker: "KEYS",
    name: "Keysight Technologies Inc.",
    assetName: "Keysight & Agilent Portfolio",
    shares: 237.767,
    costBasisPerShare: 86.34,
    currentPrice: 312.36,
    totalCostBasis: 20530.00,
    totalCurrentValue: 74269.10,
    unrealizedGainLoss: 53739.10,
    unrealizedGainLossPct: 261.76
  }
];

export const initialLiabilities: Liability[] = [
  {
    id: "L-01",
    owner: "Primary Client",
    creditor: "Wells Fargo Home Mortgage",
    type: "Mortgage",
    securedBy: "Primary Residence - 1945 Bradhoff Ave",
    currentBalance: 397891.78,
    interestRate: 0.0575,
    minMonthlyPayment: 2334.29,
    plannedMonthlyPayment: 2334.29,
    taxDeductible: true,
    variableRate: false,
    priority: "High",
    notes: "$1,906.56/mo in interest portion. 30-year fixed rate mortgage originated Dec 2025.",
    status: "Active"
  }
];

export const initialCashFlowItems: CashFlowItem[] = [
  {
    id: "CF-01",
    type: "Expense",
    category: "Mortgage P&I",
    owner: "Primary Client",
    frequency: "Monthly",
    amountPerFrequency: 2334.29,
    monthlyAmount: 2334.29,
    annualAmount: 28011.48,
    essential: true,
    taxDeductible: true,
    notes: "Home mortgage principal and interest payment.",
    status: "Active"
  },
  {
    id: "CF-02",
    type: "Expense",
    category: "Property Tax & Homeowners Insurance",
    owner: "Primary Client",
    frequency: "Monthly",
    amountPerFrequency: 1500.00,
    monthlyAmount: 1500.00,
    annualAmount: 18000.00,
    essential: true,
    taxDeductible: true,
    notes: "Property tax escrow and umbrella home insurance.",
    status: "Active"
  },
  {
    id: "CF-03",
    type: "Expense",
    category: "Groceries & Household Supplies",
    owner: "Primary Client",
    frequency: "Monthly",
    amountPerFrequency: 1022.00,
    monthlyAmount: 1022.00,
    annualAmount: 12264.00,
    essential: true,
    taxDeductible: false,
    notes: "Food, groceries, personal care items.",
    status: "Active"
  },
  {
    id: "CF-04",
    type: "Expense",
    category: "Shopping & Entertainment",
    owner: "Primary Client",
    frequency: "Monthly",
    amountPerFrequency: 2300.00,
    monthlyAmount: 2300.00,
    annualAmount: 27600.00,
    essential: false,
    taxDeductible: false,
    notes: "Discretionary lifestyle spending.",
    status: "Active"
  },
  {
    id: "CF-05",
    type: "Expense",
    category: "Utilities & Subscriptions",
    owner: "Primary Client",
    frequency: "Monthly",
    amountPerFrequency: 846.00,
    monthlyAmount: 846.00,
    annualAmount: 10152.00,
    essential: true,
    taxDeductible: false,
    notes: "Electric, gas, water, internet, phone, streaming.",
    status: "Active"
  }
];

export const initialGoals: Goal[] = [
  {
    id: "G-01",
    name: "Retirement Independence at Age 65",
    owner: "Primary Client",
    planningArea: "Retirement",
    priority: "High",
    targetDate: "2055-05-15",
    targetAmount: 4500000.00,
    currentFunding: 3557006.21,
    monthlySavings: 2500.00,
    expectedReturn: 0.06,
    status: "On Track",
    notes: "Target $4.5M net worth to generate $180k/yr inflation-adjusted income."
  },
  {
    id: "G-02",
    name: "Mortgage Payoff before Retirement",
    owner: "Primary Client",
    planningArea: "Debt Paydown",
    priority: "Medium",
    targetDate: "2050-12-01",
    targetAmount: 397891.78,
    currentFunding: 0,
    monthlySavings: 2334.29,
    expectedReturn: 0.0575,
    status: "On Track",
    notes: "Amortize mortgage balance prior to retirement."
  }
];

export const initialSocialSecurityScenarios: SocialSecurityScenario[] = [
  {
    claimAge: 62,
    monthlyBenefit: 2100,
    annualBenefit: 25200,
    cumulativeAt75: 327600,
    cumulativeAt80: 453600,
    cumulativeAt85: 579600,
    cumulativeAt90: 705600
  },
  {
    claimAge: 67,
    monthlyBenefit: 3000,
    annualBenefit: 36000,
    cumulativeAt75: 288000,
    cumulativeAt80: 468000,
    cumulativeAt85: 648000,
    cumulativeAt90: 828000
  },
  {
    claimAge: 70,
    monthlyBenefit: 3720,
    annualBenefit: 44640,
    cumulativeAt75: 223200,
    cumulativeAt80: 446400,
    cumulativeAt85: 669600,
    cumulativeAt90: 892800
  }
];

export const initialHedgeConfig: OptionHedgeConfig = {
  underlyingTicker: "SPCX",
  underlyingPrice: 112.42,
  sharesHeld: 20000,
  optionTicker: "ARKX",
  optionPrice: 30.09,
  contracts: 50,
  longPutStrike: 31.00,
  longPutPremium: 1.15,
  shortPutStrike: 27.00,
  shortPutPremium: 0.25,
  netPremiumPaid: 4500,
  maxProfit: 15500
};

export const initialEstateItems: EstateItem[] = [
  {
    id: "EST-001",
    documentItem: "Last Will & Testament",
    appliesTo: "Primary Client",
    status: "Needs Update",
    dateSigned: "2021-04-10",
    attorney: "Sterling Estate Law",
    storageLocation: "Safety Deposit Box / Safe",
    reviewNeeded: true,
    notes: "Requires update to reflect current property purchases."
  },
  {
    id: "EST-002",
    documentItem: "Revocable Living Trust",
    appliesTo: "Household",
    status: "Needs Drafting",
    dateSigned: "",
    attorney: "Sterling Estate Law",
    storageLocation: "Pending Draft",
    reviewNeeded: true,
    notes: "Trust structure needed to avoid CA probate on real estate."
  },
  {
    id: "EST-003",
    documentItem: "Durable Power of Attorney (Financial)",
    appliesTo: "Primary Client",
    status: "Complete",
    dateSigned: "2022-09-15",
    attorney: "Sterling Estate Law",
    storageLocation: "Home Safe & Advisor Copy",
    reviewNeeded: false,
    notes: "Designates primary attorney-in-fact."
  },
  {
    id: "EST-004",
    documentItem: "Advance Health Care Directive",
    appliesTo: "Primary Client",
    status: "Complete",
    dateSigned: "2022-09-15",
    attorney: "Sterling Estate Law",
    storageLocation: "Medical Provider & Home Safe",
    reviewNeeded: false,
    notes: "Medical POA and living will instructions."
  }
];

export const initialBeneficiaries: BeneficiaryRecord[] = [
  {
    id: "BEN-01",
    accountPolicy: "Google 401(k) Plan",
    owner: "Primary Client",
    primaryBeneficiary: "Primary Estate / Trust",
    primaryPct: 100,
    contingentBeneficiary: "Sibling",
    contingentPct: 100,
    perStirpes: true,
    lastReviewed: "2026-01-10",
    status: "Current",
    notes: "Vanguard beneficiary designation verified."
  },
  {
    id: "BEN-02",
    accountPolicy: "Google Stock (Morgan Stanley)",
    owner: "Primary Client",
    primaryBeneficiary: "Revocable Trust (TOD)",
    primaryPct: 100,
    contingentBeneficiary: "Estate",
    contingentPct: 100,
    perStirpes: false,
    lastReviewed: "2025-12-20",
    status: "Needs Review",
    notes: "Update TOD registration once trust is executed."
  }
];

export const initialDocuments: DocumentItem[] = [
  {
    id: "DOC-001",
    documentRecord: "Most recent federal and state tax returns (Form 1040 + W2s)",
    category: "Tax",
    needed: true,
    received: true,
    dateReceived: "2026-04-12",
    storageLink: "/vault/taxes/2025_Form1040.pdf",
    status: "Received",
    notes: "Includes Schedule D capital gains details."
  },
  {
    id: "DOC-002",
    documentRecord: "Brokerage statements (Morgan Stanley & Fidelity)",
    category: "Investments",
    needed: true,
    received: true,
    dateReceived: "2026-07-01",
    storageLink: "/vault/investments/MS_Q2_2026.pdf",
    status: "Received",
    notes: "Confirmed equity share counts."
  },
  {
    id: "DOC-003",
    documentRecord: "Mortgage statement & payoff schedule",
    category: "Debt",
    needed: true,
    received: true,
    dateReceived: "2026-07-05",
    storageLink: "/vault/debt/WellsFargo_Mortgage.pdf",
    status: "Received",
    notes: "Principal balance $397,891.78."
  },
  {
    id: "DOC-004",
    documentRecord: "Life & Disability Insurance Policy Contracts",
    category: "Insurance",
    needed: true,
    received: false,
    dateReceived: "",
    storageLink: "",
    status: "Pending",
    notes: "Awaiting employer group life policy terms."
  }
];

export const initialActionItems: ActionItem[] = [
  {
    id: "ACT-01",
    planningArea: "Estate Planning",
    actionItem: "Finalize and execute Revocable Living Trust with Sterling Law",
    owner: "Primary Client",
    priority: "High",
    dueDate: "2026-09-30",
    status: "In Progress",
    nextStep: "Review draft trust agreement from Marcus Sterling",
    notes: "Crucial for California real estate probate avoidance."
  },
  {
    id: "ACT-02",
    planningArea: "Tax & Risk Management",
    actionItem: "Implement 10b5-1 trading plan for Google equity diversification",
    owner: "Advisor & Client",
    priority: "High",
    dueDate: "2026-10-15",
    status: "Not Started",
    nextStep: "Consult Morgan Stanley equity desk",
    notes: "Systematic monthly liquidation of vested stock."
  },
  {
    id: "ACT-03",
    planningArea: "Insurance",
    actionItem: "Obtain $2M Personal Umbrella Liability Policy",
    owner: "Advisor",
    priority: "Medium",
    dueDate: "2026-08-31",
    status: "In Progress",
    nextStep: "Collect insurance carrier quotes",
    notes: "Excess liability protection over primary home policy."
  }
];
"""

with open(r'c:\Users\jammy\Downloads\FreeLinda\src\data\initialData.ts', 'w', encoding='utf-8') as f:
    f.write(ts_code)

print("INITIAL_DATA_GENERATED_SUCCESSFULLY")
