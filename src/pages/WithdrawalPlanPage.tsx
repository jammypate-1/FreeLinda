import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ChevronDown, ChevronRight, Info } from 'lucide-react';
import type { AssetAccount, CashFlowItem, ClientProfile, Liability, TaxLot, WithdrawalConfig } from '../types/financial';
import { formatCurrency } from '../utils/financialCalculations';
import { ageFromDob, buildWithdrawalPlan, classifyAccount, planMonthlyNeed, simplifiMonthlyNeed, type AccountKind, type WithdrawalLine } from '../utils/withdrawalPlan';
import { subscribeSimplifi, type SimplifiSnapshot } from '../services/simplifi';
import { SimplifiSyncPanel } from '../components/SimplifiSyncPanel';

interface WithdrawalPlanPageProps {
  profile: ClientProfile;
  assets: AssetAccount[];
  liabilities: Liability[];
  taxLots: TaxLot[];
  cashFlows: CashFlowItem[];
  config: WithdrawalConfig;
  onSaveConfig: (config: WithdrawalConfig) => void;
  simplifiLinks: Record<string, string>;
  onSaveSimplifiLinks: (links: Record<string, string>) => void;
  onSaveAssets: (assets: AssetAccount[]) => void;
  onSaveLiabilities: (liabilities: Liability[]) => void;
}

const KIND_LABEL: Record<AccountKind, string> = { cash: 'Cash', taxable: 'Taxable', roth: 'Roth', pre_tax: 'Pre-tax', hsa: 'HSA', illiquid: 'Illiquid' };

const KIND_STYLE: Record<AccountKind, string> = {
  cash: 'bg-emerald-500/15 text-emerald-300',
  taxable: 'bg-sky-500/15 text-sky-300',
  roth: 'bg-violet-500/15 text-violet-300',
  pre_tax: 'bg-amber-500/15 text-amber-300',
  hsa: 'bg-teal-500/15 text-teal-300',
  illiquid: 'bg-slate-700 text-slate-300'
};

const SOURCE_LABEL: Record<WithdrawalConfig['needSource'], string> = {
  plan: 'Plan cash flow',
  simplifi: 'Simplifi, 12-month average',
  custom: 'Custom amount'
};

const toPct = (rate: number): number => Math.round(rate * 1000) / 10;

// Tax lot dates come from the spreadsheet as Excel day numbers ("46167.0"); show them as dates.
const showDate = (value: string): string => {
  const serial = Number(value);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + serial * 86400e3).toISOString().slice(0, 10);
  }
  return value;
};

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  step?: number;
  onChange: (value: number) => void;
}

const NumberField: React.FC<NumberFieldProps> = ({ id, label, value, suffix, step = 1, onChange }) => (
  <div>
    <label htmlFor={id} className="block text-[11px] font-medium text-slate-400">{label}</label>
    <div className="mt-1 flex items-center gap-2">
      <input
        id={id}
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={event => {
          const next = Number.parseFloat(event.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
      />
      {suffix ? <span className="whitespace-nowrap text-xs text-slate-500">{suffix}</span> : null}
    </div>
  </div>
);

interface CardProps {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}

const Card: React.FC<CardProps> = ({ label, value, hint, tone = 'text-white' }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
    <div className={`mt-2 text-2xl font-bold ${tone}`}>{value}</div>
    <div className="mt-1 text-xs text-slate-400">{hint}</div>
  </div>
);

const LotTable: React.FC<{ line: WithdrawalLine }> = ({ line }) => (
  <table className="w-full text-left text-xs">
    <thead className="text-slate-500">
      <tr>
        <th className="py-1 pr-3 font-medium">Lot</th>
        <th className="py-1 pr-3 font-medium">Acquired</th>
        <th className="py-1 pr-3 font-medium">Term</th>
        <th className="py-1 pr-3 text-right font-medium">Shares</th>
        <th className="py-1 pr-3 text-right font-medium">Proceeds</th>
        <th className="py-1 text-right font-medium">Gain / loss</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-800/60">
      {line.lots.map(sale => (
        <tr key={sale.lotId}>
          <td className="py-1 pr-3 text-slate-300">{sale.lotId} {sale.ticker}</td>
          <td className="py-1 pr-3 text-slate-400">{showDate(sale.acquisitionDate)}</td>
          <td className="py-1 pr-3 text-slate-400">{sale.term}</td>
          <td className="py-1 pr-3 text-right font-mono text-slate-200">{sale.shares.toLocaleString('en-US', { maximumFractionDigits: 4 })}</td>
          <td className="py-1 pr-3 text-right font-mono text-slate-200">{formatCurrency(sale.proceeds)}</td>
          <td className={`py-1 text-right font-mono ${sale.gain < 0 ? 'text-emerald-300' : 'text-amber-300'}`}>{formatCurrency(sale.gain)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const WithdrawalPlanPage: React.FC<WithdrawalPlanPageProps> = props => {
  const { config, onSaveConfig } = props;
  const [snapshot, setSnapshot] = useState<SimplifiSnapshot | null>(null);
  const [openLots, setOpenLots] = useState('');
  useEffect(() => subscribeSimplifi(setSnapshot), []);

  const planNeed = useMemo(() => planMonthlyNeed(props.cashFlows), [props.cashFlows]);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const actualNeed = useMemo(() => simplifiMonthlyNeed(snapshot?.months ?? [], currentMonth), [snapshot, currentMonth]);
  const simplifiMissing = config.needSource === 'simplifi' && !actualNeed;
  let monthlyNeed = planNeed.gap;
  if (config.needSource === 'custom') monthlyNeed = Math.max(0, config.customMonthlyNeed);
  else if (config.needSource === 'simplifi' && actualNeed) monthlyNeed = actualNeed.gap;
  const age = ageFromDob(props.profile.dob, new Date());
  const plan = useMemo(
    () => buildWithdrawalPlan({ assets: props.assets, taxLots: props.taxLots, config, monthlyNeed, essentialMonthly: planNeed.essential, age }),
    [props.assets, props.taxLots, config, monthlyNeed, planNeed.essential, age]
  );
  const perMonth = config.monthsToFund > 0 ? plan.totalNet / config.monthsToFund : 0;
  const update = (patch: Partial<WithdrawalConfig>): void => onSaveConfig({ ...config, ...patch });
  const toggleAccount = (id: string): void => update({
    excludedAssetIds: config.excludedAssetIds.includes(id) ? config.excludedAssetIds.filter(item => item !== id) : [...config.excludedAssetIds, id]
  });
  const activeAssets = props.assets.filter(asset => asset.status === 'Active');

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-start gap-4 border-b border-slate-800 pb-6">
        <div className="rounded-xl bg-sky-500/10 p-3">
          <ArrowDownToLine className="h-6 w-6 text-sky-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Withdrawal Plan</h1>
          <p className="mt-1 text-sm text-slate-400">
            How much {props.profile.name} should pull for the next {config.monthsToFund} months, and from which accounts, cheapest in tax first.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card label="Monthly need" value={formatCurrency(monthlyNeed)} hint={simplifiMissing ? 'No Simplifi months yet: using the plan' : SOURCE_LABEL[config.needSource]} />
        <Card label="Net to pull" value={formatCurrency(plan.totalNet)} hint={`${formatCurrency(perMonth)} a month into checking`} tone="text-emerald-300" />
        <Card label="Tax & penalties" value={formatCurrency(plan.totalTax)} hint="Estimate: set it aside for April" tone="text-amber-300" />
        <Card label="Sell or withdraw" value={formatCurrency(plan.totalGross)} hint={`From ${plan.lines.length} account${plan.lines.length === 1 ? '' : 's'}`} />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
        <span>
          Plan: {formatCurrency(planNeed.expenses)} spending less {formatCurrency(planNeed.income)} income = {formatCurrency(planNeed.gap)} a month
        </span>
        {actualNeed ? (
          <span>
            Simplifi ({actualNeed.monthsUsed} months): {formatCurrency(actualNeed.expenses)} spending less {formatCurrency(actualNeed.income)} income = {formatCurrency(actualNeed.gap)} a month
          </span>
        ) : (
          <span>Simplifi: no complete months synced yet</span>
        )}
      </div>

      {plan.netNeeded === 0 ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200">Income covers spending: nothing needs to be pulled right now.</div>
      ) : null}

      {plan.shortfall > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          The usable accounts fall {formatCurrency(plan.shortfall)} short of the {formatCurrency(plan.netNeeded)} needed.
        </div>
      ) : null}

      {plan.lines.length > 0 ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-bold text-white">Pull from these accounts, in this order</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">Account</th>
                  <th className="py-2 pr-3 text-right font-medium">Sell / withdraw</th>
                  <th className="py-2 pr-3 text-right font-medium">Tax & penalty</th>
                  <th className="py-2 pr-3 text-right font-medium">Net to you</th>
                  <th className="py-2 font-medium">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {plan.lines.map((line, index) => (
                  <React.Fragment key={line.assetId}>
                    <tr>
                      <td className="py-3 pr-3 text-slate-500">{index + 1}</td>
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-slate-100">{line.name}</div>
                        <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[line.kind]}`}>{KIND_LABEL[line.kind]}</span>
                        {line.lots.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setOpenLots(openLots === line.assetId ? '' : line.assetId)}
                            className="ml-2 inline-flex items-center text-[11px] text-sky-400 hover:text-sky-300"
                          >
                            {openLots === line.assetId ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            {line.lots.length} lots to sell
                          </button>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3 text-right font-mono text-slate-200">{formatCurrency(line.gross)}</td>
                      <td className="py-3 pr-3 text-right font-mono text-amber-300">{formatCurrency(line.tax)}</td>
                      <td className="py-3 pr-3 text-right font-mono text-emerald-300">{formatCurrency(line.net)}</td>
                      <td className="py-3 text-xs text-slate-400">{line.reason}</td>
                    </tr>
                    {openLots === line.assetId ? (
                      <tr>
                        <td colSpan={6} className="pb-4">
                          <LotTable line={line} />
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Info className="h-4 w-4 text-sky-400" />
          How this was worked out
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-400">
          <li>Order: cash above the emergency floor, then taxable investments (losses and high-basis long-term lots first), then Roth contributions, then pre-tax accounts.</li>
          {plan.notes.map(note => <li key={note}>{note}</li>)}
          <li>Tax rates are planning estimates; confirm sales and withdrawals with the CPA.</li>
        </ul>
      </section>

      <section className="grid gap-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Settings</h2>
          <div>
            <label htmlFor="wd-source" className="block text-[11px] font-medium text-slate-400">Monthly need comes from</label>
            <select
              id="wd-source"
              value={config.needSource}
              onChange={event => update({ needSource: event.target.value as WithdrawalConfig['needSource'] })}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            >
              {(Object.keys(SOURCE_LABEL) as WithdrawalConfig['needSource'][]).map(key => <option key={key} value={key}>{SOURCE_LABEL[key]}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {config.needSource === 'custom' ? (
              <NumberField id="wd-custom" label="Custom monthly need" value={config.customMonthlyNeed} suffix="$ a month" step={100} onChange={value => update({ customMonthlyNeed: value })} />
            ) : null}
            <NumberField id="wd-months" label="Months to fund" value={config.monthsToFund} suffix="months" onChange={value => update({ monthsToFund: Math.max(0, Math.round(value)) })} />
            <NumberField id="wd-floor" label="Cash floor" value={config.cashFloorMonths} suffix="months of essentials" onChange={value => update({ cashFloorMonths: Math.max(0, value) })} />
            <NumberField id="wd-ltcg" label="Long-term gains tax" value={toPct(config.longTermGainsRate)} suffix="%" step={0.5} onChange={value => update({ longTermGainsRate: value / 100 })} />
            <NumberField id="wd-ordinary" label="Ordinary income tax" value={toPct(config.ordinaryIncomeRate)} suffix="%" step={0.5} onChange={value => update({ ordinaryIncomeRate: value / 100 })} />
            <NumberField id="wd-penalty" label="Early-withdrawal penalty" value={toPct(config.earlyWithdrawalPenalty)} suffix="%" step={0.5} onChange={value => update({ earlyWithdrawalPenalty: value / 100 })} />
          </div>
          <p className="text-[11px] text-slate-500">Rates are combined federal and California estimates; the penalty applies to pre-tax money taken before 59½. Age now: {age}.</p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Accounts the plan may use</h2>
          <ul className="mt-3 divide-y divide-slate-800">
            {activeAssets.map(asset => {
              const kind = classifyAccount(asset);
              const locked = kind === 'hsa' || kind === 'illiquid';
              return (
                <li key={asset.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <label htmlFor={`wd-use-${asset.id}`} className="flex items-center gap-2 text-slate-300">
                    <input id={`wd-use-${asset.id}`} type="checkbox" disabled={locked} checked={!locked && !config.excludedAssetIds.includes(asset.id)} onChange={() => toggleAccount(asset.id)} />
                    {asset.name}
                  </label>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">{formatCurrency(asset.currentValue)}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[kind]}`}>{KIND_LABEL[kind]}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <SimplifiSyncPanel
        snapshot={snapshot}
        assets={props.assets}
        liabilities={props.liabilities}
        links={props.simplifiLinks}
        onSaveLinks={props.onSaveSimplifiLinks}
        onSaveAssets={props.onSaveAssets}
        onSaveLiabilities={props.onSaveLiabilities}
      />
    </div>
  );
};
