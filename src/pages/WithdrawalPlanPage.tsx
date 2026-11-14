import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AssetAccount, CashFlowItem, ClientProfile, PlanningAssumptions, WithdrawalConfig } from '../types/financial';
import { formatCurrency } from '../utils/financialCalculations';
import { buildMonthlySchedule, classifyAccount, planMonthlyNeed, type AccountKind, type ScheduleYear } from '../utils/withdrawalPlan';

interface WithdrawalPlanPageProps {
  profile: ClientProfile;
  assets: AssetAccount[];
  cashFlows: CashFlowItem[];
  assumptions: PlanningAssumptions;
  config: WithdrawalConfig;
  onSaveConfig: (config: WithdrawalConfig) => void;
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
  plan: 'Plan cash flow expenses',
  custom: 'Custom amount'
};

const toPct = (rate: number): number => Math.round(rate * 1000) / 10;

const monthLabel = (month: string): string => {
  const [year, index] = month.split('-').map(Number);
  return new Date(year, index - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
};

// Milliseconds until just after the next local midnight, when the plan is worked out again.
const untilTomorrow = (now: Date): number => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1).getTime() - now.getTime();

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

const MonthTable: React.FC<{ year: ScheduleYear; startMonth: string }> = ({ year, startMonth }) => (
  <table className="w-full text-left text-xs">
    <thead className="text-slate-500">
      <tr>
        <th className="py-1 pr-3 font-medium">Month</th>
        <th className="py-1 pr-3 font-medium">From</th>
        <th className="py-1 pr-3 text-right font-medium">Withdraw</th>
        <th className="py-1 pr-3 text-right font-medium">Tax</th>
        <th className="py-1 pr-3 text-right font-medium">Net to spend</th>
        <th className="py-1 text-right font-medium">Social Security</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-800/60">
      {year.months.map(month => (
        <tr key={month.month} className="align-top">
          <td className="py-1.5 pr-3 text-slate-300">{monthLabel(month.month)}</td>
          <td className="py-1.5 pr-3 text-slate-300">
            {month.withdrawing ? null : <span className="text-slate-500">Saving: withdrawals start {monthLabel(startMonth)}</span>}
            {month.withdrawing && month.draws.length === 0 && month.shortfall === 0 ? <span className="text-slate-500">Social Security covers it</span> : null}
            {month.draws.map(draw => (
              <div key={draw.assetId}>
                <span className={`mr-1.5 rounded px-1 py-0.5 text-[10px] font-semibold ${KIND_STYLE[draw.kind]}`}>{KIND_LABEL[draw.kind]}</span>
                {draw.name}: {formatCurrency(draw.gross)}
              </div>
            ))}
            {month.shortfall > 0.5 ? <div className="text-rose-300">Short {formatCurrency(month.shortfall)}</div> : null}
          </td>
          <td className="py-1.5 pr-3 text-right font-mono text-slate-200">{formatCurrency(month.gross)}</td>
          <td className="py-1.5 pr-3 text-right font-mono text-amber-300">{formatCurrency(month.tax)}</td>
          <td className="py-1.5 pr-3 text-right font-mono text-emerald-300">{formatCurrency(month.net)}</td>
          <td className="py-1.5 text-right font-mono text-slate-400">{formatCurrency(month.socialSecurity)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export const WithdrawalPlanPage: React.FC<WithdrawalPlanPageProps> = props => {
  const { config, onSaveConfig } = props;
  const [today, setToday] = useState(() => new Date());
  const [openYear, setOpenYear] = useState<number | null>(null);
  useEffect(() => {
    const timer = globalThis.setTimeout(() => setToday(new Date()), untilTomorrow(today));
    return () => globalThis.clearTimeout(timer);
  }, [today]);

  const planNeed = useMemo(() => planMonthlyNeed(props.cashFlows), [props.cashFlows]);
  const monthlyExpenses = config.needSource === 'custom' ? Math.max(0, config.customMonthlyNeed) : planNeed.expenses;
  const inflationRate = props.assumptions.inflationRate || 0;
  const schedule = useMemo(
    () => buildMonthlySchedule({
      assets: props.assets,
      config,
      monthlyExpenses,
      essentialMonthly: planNeed.essential,
      inflationRate,
      dob: props.profile.dob,
      today
    }),
    [props.assets, config, monthlyExpenses, planNeed.essential, inflationRate, props.profile.dob, today]
  );
  const first = schedule.firstWithdrawal;
  const lastYear = schedule.years[schedule.years.length - 1];
  const totalSocialSecurity = schedule.years.reduce((total, year) => total + year.socialSecurity, 0);
  const chartData = schedule.years.map(year => ({ year: year.year, liquid: Math.round(year.liquidEnd) }));
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
            Month by month from {monthLabel(config.startMonth)} until {props.profile.name} is {config.endAge}: how much to withdraw, from which account, and the tax.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Worked out {today.toLocaleDateString('en-US', { dateStyle: 'medium' })} from today&apos;s balances and live GOOG and SPCX prices; it is worked out again every day.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          label={first ? `First withdrawal, ${monthLabel(first.month)}` : 'First withdrawal'}
          value={formatCurrency(first?.gross ?? 0)}
          hint={first ? `From ${first.draws.map(draw => draw.name).join(', ')}; ${formatCurrency(first.tax)} tax` : 'None needed in the plan'}
        />
        <Card label="Lifetime taxes & penalties" value={formatCurrency(schedule.totalTax)} hint={`On ${formatCurrency(schedule.totalGross)} withdrawn`} tone="text-amber-300" />
        <Card label="Lifetime spending covered" value={formatCurrency(schedule.totalNet)} hint={`Plus ${formatCurrency(totalSocialSecurity)} of Social Security`} tone="text-emerald-300" />
        <Card
          label="Money lasts"
          value={schedule.firstShortfallMonth ? `Until ${monthLabel(schedule.firstShortfallMonth)}` : `To age ${config.endAge}`}
          hint={schedule.firstShortfallMonth ? `${formatCurrency(schedule.totalShortfall)} short over the plan` : `${formatCurrency(lastYear?.liquidEnd ?? 0)} left in liquid accounts`}
          tone={schedule.firstShortfallMonth ? 'text-rose-300' : 'text-white'}
        />
      </div>

      {schedule.firstShortfallMonth ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-sm text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          The liquid accounts run out in {monthLabel(schedule.firstShortfallMonth)}; spending after that is {formatCurrency(schedule.totalShortfall)} short in total.
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Liquid accounts left at each year end</h2>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} width={64} tickFormatter={value => `$${Math.round(Number(value) / 1000)}k`} />
              <Tooltip formatter={value => formatCurrency(Number(value))} contentStyle={{ background: '#0f172a', border: '1px solid #334155', fontSize: 12 }} />
              <Line type="monotone" dataKey="liquid" name="Liquid accounts" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-bold text-white">Year by year</h2>
        <p className="mt-1 text-xs text-slate-400">Open a year to see each month: which account, how much, and the tax.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Year</th>
                <th className="py-2 pr-3 font-medium">Age</th>
                <th className="py-2 pr-3 font-medium">From</th>
                <th className="py-2 pr-3 text-right font-medium">Withdraw</th>
                <th className="py-2 pr-3 text-right font-medium">Tax</th>
                <th className="py-2 pr-3 text-right font-medium">Net to spend</th>
                <th className="py-2 text-right font-medium">Liquid left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {schedule.years.map(year => (
                <React.Fragment key={year.year}>
                  <tr>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => setOpenYear(openYear === year.year ? null : year.year)}
                        className="inline-flex items-center gap-1 font-semibold text-slate-100 hover:text-sky-300"
                      >
                        {openYear === year.year ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {year.year}
                      </button>
                    </td>
                    <td className="py-2 pr-3 text-slate-400">{Math.floor(year.age)}</td>
                    <td className="py-2 pr-3 text-xs text-slate-400">{year.accounts.length ? year.accounts.join(', ') : '-'}</td>
                    <td className="py-2 pr-3 text-right font-mono text-slate-200">{formatCurrency(year.gross)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-amber-300">{formatCurrency(year.tax)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-emerald-300">{formatCurrency(year.net)}</td>
                    <td className={`py-2 text-right font-mono ${year.shortfall > 0.5 ? 'text-rose-300' : 'text-slate-200'}`}>{formatCurrency(year.liquidEnd)}</td>
                  </tr>
                  {openYear === year.year ? (
                    <tr>
                      <td colSpan={7} className="pb-4 pl-6">
                        <MonthTable year={year} startMonth={config.startMonth} />
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Info className="h-4 w-4 text-sky-400" />
          How this is worked out
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-400">
          <li>Each month: cash above the emergency floor first, then taxable investments with the least gain, then Roth contributions, then pre-tax accounts (with the early-withdrawal penalty before 59½). The emergency cash itself is used only when everything else is gone.</li>
          <li>Until withdrawals start, each account keeps getting its monthly contribution from Assets. Every account grows at its own return from Assets.</li>
          <li>Spending and Social Security rise with {toPct(inflationRate)}% inflation (Assumptions). Spending is {formatCurrency(monthlyExpenses)} a month in today&apos;s dollars; salary is assumed to stop when withdrawals start.</li>
          <li>Not drawn on: the HSA (kept for medical bills) and illiquid holdings such as SpaceX stock and the home.</li>
          <li>Taxes are flat-rate estimates from the settings below. Tax brackets, required minimum distributions from 75, 72(t) plans and Covered California effects are not modelled; confirm with the CPA.</li>
        </ul>
      </section>

      <section className="grid gap-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="wd-source" className="block text-[11px] font-medium text-slate-400">Monthly spending comes from</label>
              <select
                id="wd-source"
                value={config.needSource}
                onChange={event => update({ needSource: event.target.value as WithdrawalConfig['needSource'] })}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              >
                {(Object.keys(SOURCE_LABEL) as WithdrawalConfig['needSource'][]).map(key => <option key={key} value={key}>{SOURCE_LABEL[key]}</option>)}
              </select>
            </div>
            {config.needSource === 'custom' ? (
              <NumberField id="wd-custom" label="Monthly spending (today's dollars)" value={config.customMonthlyNeed} suffix="$" step={100} onChange={value => update({ customMonthlyNeed: value })} />
            ) : null}
            <div>
              <label htmlFor="wd-start" className="block text-[11px] font-medium text-slate-400">Withdrawals start</label>
              <input
                id="wd-start"
                type="month"
                value={config.startMonth}
                onChange={event => { if (event.target.value) update({ startMonth: event.target.value }); }}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              />
            </div>
            <NumberField id="wd-end" label="Plan ends at age" value={config.endAge} onChange={value => update({ endAge: Math.max(0, Math.round(value)) })} />
            <NumberField id="wd-ss-age" label="Social Security from age" value={config.socialSecurityAge} onChange={value => update({ socialSecurityAge: Math.max(0, value) })} />
            <NumberField id="wd-ss" label="Social Security (today's dollars)" value={config.socialSecurityMonthly} suffix="$ a month" step={100} onChange={value => update({ socialSecurityMonthly: Math.max(0, value) })} />
            <NumberField id="wd-floor" label="Cash floor" value={config.cashFloorMonths} suffix="months of essentials" onChange={value => update({ cashFloorMonths: Math.max(0, value) })} />
            <NumberField id="wd-ltcg" label="Long-term gains tax" value={toPct(config.longTermGainsRate)} suffix="%" step={0.5} onChange={value => update({ longTermGainsRate: value / 100 })} />
            <NumberField id="wd-ordinary" label="Ordinary income tax" value={toPct(config.ordinaryIncomeRate)} suffix="%" step={0.5} onChange={value => update({ ordinaryIncomeRate: value / 100 })} />
            <NumberField id="wd-penalty" label="Early-withdrawal penalty" value={toPct(config.earlyWithdrawalPenalty)} suffix="%" step={0.5} onChange={value => update({ earlyWithdrawalPenalty: value / 100 })} />
          </div>
          <p className="text-[11px] text-slate-500">Rates are combined federal and California estimates; the penalty applies to pre-tax money taken before 59½.</p>
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
    </div>
  );
};
