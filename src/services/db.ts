import {
  ClientProfile,
  PlanningAssumptions,
  AssetAccount,
  TaxLot,
  Liability,
  CashFlowItem,
  Goal,
  SocialSecurityScenario,
  OptionHedgeConfig,
  EstateItem,
  BeneficiaryRecord,
  DocumentItem,
  ActionItem
} from '../types/financial';

import {
  initialClientProfile,
  initialAssumptions,
  initialAssetAccounts,
  initialTaxLots,
  initialLiabilities,
  initialCashFlowItems,
  initialGoals,
  initialSocialSecurityScenarios,
  initialHedgeConfig,
  initialEstateItems,
  initialBeneficiaries,
  initialDocuments,
  initialActionItems
} from '../data/initialData';

const STORAGE_KEYS = {
  CLIENT_PROFILE: 'freelinda_client_profile_v2',
  ASSUMPTIONS: 'freelinda_assumptions',
  ASSETS: 'freelinda_assets',
  TAX_LOTS: 'freelinda_tax_lots_v2', // Incremented version to clear legacy cache
  LIABILITIES: 'freelinda_liabilities',
  CASH_FLOWS: 'freelinda_cash_flows',
  GOALS: 'freelinda_goals',
  SOCIAL_SECURITY: 'freelinda_social_security',
  HEDGE_CONFIG: 'freelinda_hedge_config',
  ESTATE_ITEMS: 'freelinda_estate_items',
  BENEFICIARIES: 'freelinda_beneficiaries',
  DOCUMENTS: 'freelinda_documents',
  ACTION_ITEMS: 'freelinda_action_items',
};

function getStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return fallback;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e);
  }
}

export const db = {
  getClientProfile: (): ClientProfile => {
    const profile = getStorage(STORAGE_KEYS.CLIENT_PROFILE, initialClientProfile);
    if (!profile || profile.name === 'Jane Doe' || !profile.advisors || profile.advisors.length !== 4) {
      setStorage(STORAGE_KEYS.CLIENT_PROFILE, initialClientProfile);
      return initialClientProfile;
    }
    return profile;
  },
  saveClientProfile: (data: ClientProfile) => setStorage(STORAGE_KEYS.CLIENT_PROFILE, data),

  getAssumptions: (): PlanningAssumptions => getStorage(STORAGE_KEYS.ASSUMPTIONS, initialAssumptions),
  saveAssumptions: (data: PlanningAssumptions) => setStorage(STORAGE_KEYS.ASSUMPTIONS, data),

  getAssets: (): AssetAccount[] => getStorage(STORAGE_KEYS.ASSETS, initialAssetAccounts),
  saveAssets: (data: AssetAccount[]) => setStorage(STORAGE_KEYS.ASSETS, data),

  getTaxLots: (): TaxLot[] => {
    const stored = getStorage<TaxLot[]>(STORAGE_KEYS.TAX_LOTS, initialTaxLots);
    if (!stored || stored.length < 100) {
      setStorage(STORAGE_KEYS.TAX_LOTS, initialTaxLots);
      return initialTaxLots;
    }
    return stored;
  },
  saveTaxLots: (data: TaxLot[]) => setStorage(STORAGE_KEYS.TAX_LOTS, data),

  getLiabilities: (): Liability[] => getStorage(STORAGE_KEYS.LIABILITIES, initialLiabilities),
  saveLiabilities: (data: Liability[]) => setStorage(STORAGE_KEYS.LIABILITIES, data),

  getCashFlows: (): CashFlowItem[] => getStorage(STORAGE_KEYS.CASH_FLOWS, initialCashFlowItems),
  saveCashFlows: (data: CashFlowItem[]) => setStorage(STORAGE_KEYS.CASH_FLOWS, data),

  getGoals: (): Goal[] => getStorage(STORAGE_KEYS.GOALS, initialGoals),
  saveGoals: (data: Goal[]) => setStorage(STORAGE_KEYS.GOALS, data),

  getSocialSecurityScenarios: (): SocialSecurityScenario[] => getStorage(STORAGE_KEYS.SOCIAL_SECURITY, initialSocialSecurityScenarios),
  saveSocialSecurityScenarios: (data: SocialSecurityScenario[]) => setStorage(STORAGE_KEYS.SOCIAL_SECURITY, data),

  getHedgeConfig: (): OptionHedgeConfig => getStorage(STORAGE_KEYS.HEDGE_CONFIG, initialHedgeConfig),
  saveHedgeConfig: (data: OptionHedgeConfig) => setStorage(STORAGE_KEYS.HEDGE_CONFIG, data),

  getEstateItems: (): EstateItem[] => getStorage(STORAGE_KEYS.ESTATE_ITEMS, initialEstateItems),
  saveEstateItems: (data: EstateItem[]) => setStorage(STORAGE_KEYS.ESTATE_ITEMS, data),

  getBeneficiaries: (): BeneficiaryRecord[] => getStorage(STORAGE_KEYS.BENEFICIARIES, initialBeneficiaries),
  saveBeneficiaries: (data: BeneficiaryRecord[]) => setStorage(STORAGE_KEYS.BENEFICIARIES, data),

  getDocuments: (): DocumentItem[] => getStorage(STORAGE_KEYS.DOCUMENTS, initialDocuments),
  saveDocuments: (data: DocumentItem[]) => setStorage(STORAGE_KEYS.DOCUMENTS, data),

  getActionItems: (): ActionItem[] => getStorage(STORAGE_KEYS.ACTION_ITEMS, initialActionItems),
  saveActionItems: (data: ActionItem[]) => setStorage(STORAGE_KEYS.ACTION_ITEMS, data),

  getMeetingNotes: (): any[] => getStorage('freelinda_meeting_notes', []),
  saveMeetingNotes: (data: any[]) => setStorage('freelinda_meeting_notes', data),

  resetToDefaults: () => {
    localStorage.clear();
  }
};
