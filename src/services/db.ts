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
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe
} from 'firebase/firestore';
import { auth, firestore } from '../firebase';

const LEGACY_STORAGE_KEYS = {
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
  MEETING_NOTES: 'freelinda_meeting_notes'
};

export interface SharedData {
  clientProfile: ClientProfile;
  assumptions: PlanningAssumptions;
  assets: AssetAccount[];
  taxLots: TaxLot[];
  liabilities: Liability[];
  cashFlows: CashFlowItem[];
  goals: Goal[];
  socialSecurityScenarios: SocialSecurityScenario[];
  hedgeConfig: OptionHedgeConfig;
  estateItems: EstateItem[];
  beneficiaries: BeneficiaryRecord[];
  documents: DocumentItem[];
  actionItems: ActionItem[];
  meetingNotes: any[];
}

type SharedDataKey = keyof SharedData;

const DEFAULT_DATA: SharedData = {
  clientProfile: initialClientProfile,
  assumptions: initialAssumptions,
  assets: initialAssetAccounts,
  taxLots: initialTaxLots,
  liabilities: initialLiabilities,
  cashFlows: initialCashFlowItems,
  goals: initialGoals,
  socialSecurityScenarios: initialSocialSecurityScenarios,
  hedgeConfig: initialHedgeConfig,
  estateItems: initialEstateItems,
  beneficiaries: initialBeneficiaries,
  documents: initialDocuments,
  actionItems: initialActionItems,
  meetingNotes: []
};

const LEGACY_KEYS_BY_DATA: Record<SharedDataKey, string> = {
  clientProfile: LEGACY_STORAGE_KEYS.CLIENT_PROFILE,
  assumptions: LEGACY_STORAGE_KEYS.ASSUMPTIONS,
  assets: LEGACY_STORAGE_KEYS.ASSETS,
  taxLots: LEGACY_STORAGE_KEYS.TAX_LOTS,
  liabilities: LEGACY_STORAGE_KEYS.LIABILITIES,
  cashFlows: LEGACY_STORAGE_KEYS.CASH_FLOWS,
  goals: LEGACY_STORAGE_KEYS.GOALS,
  socialSecurityScenarios: LEGACY_STORAGE_KEYS.SOCIAL_SECURITY,
  hedgeConfig: LEGACY_STORAGE_KEYS.HEDGE_CONFIG,
  estateItems: LEGACY_STORAGE_KEYS.ESTATE_ITEMS,
  beneficiaries: LEGACY_STORAGE_KEYS.BENEFICIARIES,
  documents: LEGACY_STORAGE_KEYS.DOCUMENTS,
  actionItems: LEGACY_STORAGE_KEYS.ACTION_ITEMS,
  meetingNotes: LEGACY_STORAGE_KEYS.MEETING_NOTES
};

const DATA_COLLECTION = 'sharedData';

function getLegacyValue<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Error reading legacy value ${key}`, e);
    return fallback;
  }
}

function getBootstrapValue<K extends SharedDataKey>(key: K): SharedData[K] {
  const value = getLegacyValue(LEGACY_KEYS_BY_DATA[key], DEFAULT_DATA[key]);
  if (key === 'clientProfile') {
    const profile = value as ClientProfile;
    return (!profile || profile.name === 'Jane Doe' || !profile.advisors || profile.advisors.length !== 4
      ? initialClientProfile
      : profile) as SharedData[K];
  }
  if (key === 'taxLots' && (!Array.isArray(value) || value.length < 100)) {
    return initialTaxLots as SharedData[K];
  }
  return value;
}

async function initializeMissingData(): Promise<void> {
  const snapshot = await getDocs(collection(firestore, DATA_COLLECTION));
  const existingKeys = new Set(snapshot.docs.map(item => item.id));
  const missingKeys = (Object.keys(DEFAULT_DATA) as SharedDataKey[]).filter(key => !existingKeys.has(key));

  if (missingKeys.length === 0) return;

  const batch = writeBatch(firestore);
  for (const key of missingKeys) {
    batch.set(doc(firestore, DATA_COLLECTION, key), {
      value: getBootstrapValue(key),
      updatedAt: serverTimestamp(),
      updatedBy: auth.currentUser?.email ?? 'system'
    });
  }
  await batch.commit();
}

async function save<K extends SharedDataKey>(key: K, value: SharedData[K]): Promise<void> {
  await setDoc(doc(firestore, DATA_COLLECTION, key), {
    value,
    updatedAt: serverTimestamp(),
    updatedBy: auth.currentUser?.email ?? 'unknown'
  });
}

export const db = {
  defaults: DEFAULT_DATA,

  subscribe(onData: (data: SharedData) => void, onError: (error: Error) => void): Unsubscribe {
    let unsubscribe: Unsubscribe | undefined;
    let cancelled = false;

    void initializeMissingData()
      .then(() => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          collection(firestore, DATA_COLLECTION),
          snapshot => {
            const nextData = { ...DEFAULT_DATA };
            for (const item of snapshot.docs) {
              if (item.id in nextData) {
                nextData[item.id as SharedDataKey] = item.data().value;
              }
            }
            onData(nextData);
          },
          error => onError(error)
        );
      })
      .catch(error => onError(error));

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  },

  saveClientProfile: (data: ClientProfile) => save('clientProfile', data),
  saveAssumptions: (data: PlanningAssumptions) => save('assumptions', data),
  saveAssets: (data: AssetAccount[]) => save('assets', data),
  saveTaxLots: (data: TaxLot[]) => save('taxLots', data),
  saveLiabilities: (data: Liability[]) => save('liabilities', data),
  saveCashFlows: (data: CashFlowItem[]) => save('cashFlows', data),
  saveGoals: (data: Goal[]) => save('goals', data),
  saveSocialSecurityScenarios: (data: SocialSecurityScenario[]) => save('socialSecurityScenarios', data),
  saveHedgeConfig: (data: OptionHedgeConfig) => save('hedgeConfig', data),
  saveEstateItems: (data: EstateItem[]) => save('estateItems', data),
  saveBeneficiaries: (data: BeneficiaryRecord[]) => save('beneficiaries', data),
  saveDocuments: (data: DocumentItem[]) => save('documents', data),
  saveActionItems: (data: ActionItem[]) => save('actionItems', data),
  saveMeetingNotes: (data: any[]) => save('meetingNotes', data),

  async resetToDefaults(): Promise<void> {
    const batch = writeBatch(firestore);
    for (const key of Object.keys(DEFAULT_DATA) as SharedDataKey[]) {
      batch.set(doc(firestore, DATA_COLLECTION, key), {
        value: DEFAULT_DATA[key],
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.email ?? 'unknown'
      });
    }
    await batch.commit();
  }
};
