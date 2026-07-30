import React, { useState } from 'react';
import { db } from './services/db';
import { calculateDashboardMetrics } from './utils/financialCalculations';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';

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

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const [profile, setProfile] = useState(db.getClientProfile());
  const [assumptions, setAssumptions] = useState(db.getAssumptions());
  const [assets, setAssets] = useState(db.getAssets());
  const [taxLots, setTaxLots] = useState(db.getTaxLots());
  const [liabilities, setLiabilities] = useState(db.getLiabilities());
  const [cashFlows, setCashFlows] = useState(db.getCashFlows());
  const [socialSecurityScenarios, setSocialSecurityScenarios] = useState(db.getSocialSecurityScenarios());
  const [hedgeConfig, setHedgeConfig] = useState(db.getHedgeConfig());
  const [estateItems, setEstateItems] = useState(db.getEstateItems());
  const [beneficiaries, setBeneficiaries] = useState(db.getBeneficiaries());
  const [documents, setDocuments] = useState(db.getDocuments());
  const [actionItems, setActionItems] = useState(db.getActionItems());
  const [meetingNotes, setMeetingNotes] = useState(db.getMeetingNotes());

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

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <Navbar metrics={metrics} profile={profile} />
        <main className="p-8 max-w-7xl mx-auto w-full flex-1">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};
