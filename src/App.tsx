import React, { useEffect, useState } from 'react';
import { db } from './services/db';
import { calculateDashboardMetrics } from './utils/financialCalculations';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { AuthGate } from './components/AuthGate';

import { DashboardPage } from './pages/DashboardPage';
import { ClientProfilePage } from './pages/ClientProfilePage';
import { AssumptionsPage } from './pages/AssumptionsPage';
import { CashFlowPage } from './pages/CashFlowPage';
import { AssetsPage } from './pages/AssetsPage';
import { TaxLotsPage } from './pages/TaxLotsPage';
import { LiabilitiesPage } from './pages/LiabilitiesPage';
import { RetirementProjectionPage } from './pages/RetirementProjectionPage';
import { TaxesPage } from './pages/TaxesPage';
import { SocialSecurityPage } from './pages/SocialSecurityPage';
import { HedgeCalculatorPage } from './pages/HedgeCalculatorPage';
import { EstateBeneficiariesPage } from './pages/EstateBeneficiariesPage';
import { DocumentsActionPlanPage } from './pages/DocumentsActionPlanPage';
import { MeetingNotesPage } from './pages/MeetingNotesPage';

const PlannerApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [profile, setProfile] = useState(db.defaults.clientProfile);
  const [assumptions, setAssumptions] = useState(db.defaults.assumptions);
  const [assets, setAssets] = useState(db.defaults.assets);
  const [taxLots, setTaxLots] = useState(db.defaults.taxLots);
  const [liabilities, setLiabilities] = useState(db.defaults.liabilities);
  const [cashFlows, setCashFlows] = useState(db.defaults.cashFlows);
  const [socialSecurityScenarios, setSocialSecurityScenarios] = useState(db.defaults.socialSecurityScenarios);
  const [hedgeConfig, setHedgeConfig] = useState(db.defaults.hedgeConfig);
  const [estateItems, setEstateItems] = useState(db.defaults.estateItems);
  const [beneficiaries, setBeneficiaries] = useState(db.defaults.beneficiaries);
  const [documents, setDocuments] = useState(db.defaults.documents);
  const [actionItems, setActionItems] = useState(db.defaults.actionItems);
  const [meetingNotes, setMeetingNotes] = useState(db.defaults.meetingNotes);

  useEffect(() => db.subscribe(data => {
    setProfile(data.clientProfile);
    setAssumptions(data.assumptions);
    setAssets(data.assets);
    setTaxLots(data.taxLots);
    setLiabilities(data.liabilities);
    setCashFlows(data.cashFlows);
    setSocialSecurityScenarios(data.socialSecurityScenarios);
    setHedgeConfig(data.hedgeConfig);
    setEstateItems(data.estateItems);
    setBeneficiaries(data.beneficiaries);
    setDocuments(data.documents);
    setActionItems(data.actionItems);
    setMeetingNotes(data.meetingNotes);
    setSyncError(null);
    setIsDataLoaded(true);
  }, error => {
    console.error('Shared data synchronization failed', error);
    setSyncError(error.message);
    setIsDataLoaded(true);
  }), []);

  // Real-time calculation of executive metrics
  const metrics = calculateDashboardMetrics(assets, liabilities, cashFlows, assumptions);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            metrics={metrics}
            assets={assets}
            liabilities={liabilities}
            cashFlows={cashFlows}
            assumptions={assumptions}
            taxLots={taxLots}
          />
        );
      case 'profile':
        return <ClientProfilePage profile={profile} onSaveProfile={updated => { setProfile(updated); db.saveClientProfile(updated); }} />;
      case 'assumptions':
        return <AssumptionsPage assumptions={assumptions} onSaveAssumptions={updated => { setAssumptions(updated); db.saveAssumptions(updated); }} />;
      case 'cashflow':
        return <CashFlowPage cashFlows={cashFlows} onSaveCashFlows={updated => { setCashFlows(updated); db.saveCashFlows(updated); }} />;
      case 'assets':
        return <AssetsPage assets={assets} onSaveAssets={updated => { setAssets(updated); db.saveAssets(updated); }} />;
      case 'taxlots':
        return <TaxLotsPage taxLots={taxLots} onSaveTaxLots={updated => { setTaxLots(updated); db.saveTaxLots(updated); }} />;
      case 'liabilities':
        return <LiabilitiesPage liabilities={liabilities} onSaveLiabilities={updated => { setLiabilities(updated); db.saveLiabilities(updated); }} />;
      case 'projection':
        return <RetirementProjectionPage assumptions={assumptions} metrics={metrics} taxLots={taxLots} cashFlows={cashFlows} />;
      case 'taxes':
        return <TaxesPage taxLots={taxLots} assumptions={assumptions} metrics={metrics} />;
      case 'socialsecurity':
        return <SocialSecurityPage scenarios={socialSecurityScenarios} />;
      case 'hedge':
        return <HedgeCalculatorPage config={hedgeConfig} onSaveConfig={updated => { setHedgeConfig(updated); db.saveHedgeConfig(updated); }} />;
      case 'estate':
        return (
          <EstateBeneficiariesPage
            estateItems={estateItems}
            beneficiaries={beneficiaries}
            onSaveEstate={updated => { setEstateItems(updated); db.saveEstateItems(updated); }}
            onSaveBeneficiaries={updated => { setBeneficiaries(updated); db.saveBeneficiaries(updated); }}
          />
        );
      case 'documents':
        return (
          <DocumentsActionPlanPage
            documents={documents}
            actionItems={actionItems}
            onSaveDocuments={updated => { setDocuments(updated); db.saveDocuments(updated); }}
            onSaveActionItems={updated => { setActionItems(updated); db.saveActionItems(updated); }}
          />
        );
      case 'meetingnotes':
        return (
          <MeetingNotesPage
            notes={meetingNotes}
            onSaveNotes={updated => { setMeetingNotes(updated); db.saveMeetingNotes(updated); }}
          />
        );
      default:
        return (
          <DashboardPage
            metrics={metrics}
            assets={assets}
            liabilities={liabilities}
            cashFlows={cashFlows}
            assumptions={assumptions}
            taxLots={taxLots}
          />
        );
    }
  };

  if (!isDataLoaded) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm font-semibold text-slate-300">Loading shared financial plan...</div>;
  }

  if (syncError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="max-w-lg rounded-lg border border-rose-500/30 bg-slate-900 p-6 text-center">
          <h1 className="text-lg font-bold text-white">Shared data is unavailable</h1>
          <p className="mt-2 text-sm text-rose-300">{syncError}</p>
          <p className="mt-3 text-xs text-slate-400">Confirm that Cloud Firestore is enabled and the security rules are deployed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <Navbar metrics={metrics} profile={profile} />
        <main className={activeTab === 'hedge' ? 'w-full flex-1' : 'p-8 max-w-7xl mx-auto w-full flex-1'}>
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => (
  <AuthGate>
    <PlannerApp />
  </AuthGate>
);
