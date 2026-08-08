import React, { useEffect, useMemo, useState } from 'react';
import { db } from './services/db';
import { fetchMarketSeries, isUsMarketOpen, MarketSymbol } from './services/marketData';
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

const MARKET_REFRESH_INTERVAL = 60 * 60 * 1000;
const LIVE_TICKERS = new Set<MarketSymbol>(['SPCX', 'GOOG']);

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
  const [latestPrices, setLatestPrices] = useState<Partial<Record<MarketSymbol, number>>>({});

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

  useEffect(() => {
    let active = true;
    const refreshPrices = async () => {
      const results = await Promise.allSettled(
        (Array.from(LIVE_TICKERS)).map(symbol => fetchMarketSeries(symbol, '1D'))
      );
      if (!active) return;
      setLatestPrices(current => {
        const next = { ...current };
        results.forEach(result => {
          if (result.status === 'fulfilled') next[result.value.symbol] = result.value.latestPrice;
        });
        return next;
      });
    };

    void refreshPrices();
    const interval = window.setInterval(() => {
      if (isUsMarketOpen()) void refreshPrices();
    }, MARKET_REFRESH_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const valuedTaxLots = useMemo(() => taxLots.map(lot => {
    const ticker = lot.ticker.toUpperCase() as MarketSymbol;
    const latestPrice = LIVE_TICKERS.has(ticker) ? latestPrices[ticker] : undefined;
    if (latestPrice === undefined) return lot;
    const totalCurrentValue = lot.shares * latestPrice;
    const unrealizedGainLoss = totalCurrentValue - lot.totalCostBasis;
    return {
      ...lot,
      currentPrice: latestPrice,
      totalCurrentValue,
      unrealizedGainLoss,
      unrealizedGainLossPct: lot.totalCostBasis > 0 ? unrealizedGainLoss / lot.totalCostBasis * 100 : 0
    };
  }), [taxLots, latestPrices]);

  const valuedAssets = useMemo(() => {
    const liveValues = valuedTaxLots.reduce<Record<MarketSymbol, number>>((totals, lot) => {
      const ticker = lot.ticker.toUpperCase() as MarketSymbol;
      if (LIVE_TICKERS.has(ticker)) totals[ticker] += lot.totalCurrentValue;
      return totals;
    }, { SPCX: 0, GOOG: 0 });

    return assets.map(asset => {
      const ticker = asset.id === 'A-02' ? 'GOOG' : asset.id === 'A-03' ? 'SPCX' : undefined;
      return ticker && liveValues[ticker] > 0 ? { ...asset, currentValue: liveValues[ticker] } : asset;
    });
  }, [assets, valuedTaxLots]);

  // Real-time calculation of executive metrics
  const metrics = calculateDashboardMetrics(valuedAssets, liabilities, cashFlows, assumptions);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardPage
            metrics={metrics}
            assets={valuedAssets}
            liabilities={liabilities}
            cashFlows={cashFlows}
            assumptions={assumptions}
            taxLots={valuedTaxLots}
          />
        );
      case 'profile':
        return <ClientProfilePage profile={profile} onSaveProfile={updated => { setProfile(updated); db.saveClientProfile(updated); }} />;
      case 'assumptions':
        return <AssumptionsPage assumptions={assumptions} onSaveAssumptions={updated => { setAssumptions(updated); db.saveAssumptions(updated); }} />;
      case 'cashflow':
        return <CashFlowPage cashFlows={cashFlows} onSaveCashFlows={updated => { setCashFlows(updated); db.saveCashFlows(updated); }} />;
      case 'assets':
        return <AssetsPage assets={valuedAssets} onSaveAssets={updated => { setAssets(updated); db.saveAssets(updated); }} />;
      case 'taxlots':
        return <TaxLotsPage taxLots={valuedTaxLots} onSaveTaxLots={updated => { setTaxLots(updated); db.saveTaxLots(updated); }} />;
      case 'liabilities':
        return <LiabilitiesPage liabilities={liabilities} onSaveLiabilities={updated => { setLiabilities(updated); db.saveLiabilities(updated); }} />;
      case 'projection':
        return <RetirementProjectionPage assumptions={assumptions} metrics={metrics} taxLots={valuedTaxLots} cashFlows={cashFlows} />;
      case 'taxes':
        return <TaxesPage taxLots={valuedTaxLots} assumptions={assumptions} metrics={metrics} />;
      case 'socialsecurity':
        return <SocialSecurityPage scenarios={socialSecurityScenarios} />;
      case 'hedge':
        return <HedgeCalculatorPage config={hedgeConfig} liveUnderlyingPrice={latestPrices.SPCX} onSaveConfig={updated => { setHedgeConfig(updated); db.saveHedgeConfig(updated); }} />;
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
            assets={valuedAssets}
            liabilities={liabilities}
            cashFlows={cashFlows}
            assumptions={assumptions}
            taxLots={valuedTaxLots}
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
