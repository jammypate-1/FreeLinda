import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import TaxModeler from './components/TaxModeler';

/* ============================================================
   Objective tax model — every number on the page derives from
   these rules so the analysis is internally consistent.
   All rates are decimals; yield inputs are percentages.
   ============================================================ */
const CD_YIELD = 0.045; // 4.50% APY
const PORT_YIELD = 0.0338; // 3.38% blended 30-day SEC yield (Aug 2026)
const NIIT_RATE = 0.038; // Net Investment Income Tax
const NIIT_APPLY_AT = 0.32; // NIIT assumed when marginal fed >= 32%
const FDIC_LIMIT = 250000;

/** Qualified dividend tier for a given federal marginal rate (decimal). */
const qualRate = (fed: number): number =>
  fed <= 0.12 ? 0 : fed <= 0.24 ? 0.15 : 0.2;

const niit = (fed: number): number => (fed >= NIIT_APPLY_AT ? NIIT_RATE : 0);

/** Effective all-in tax rate for the CD (ordinary income). */
const effCD = (fed: number, state: number): number =>
  fed + state + niit(fed);

/** Effective tax rate for the 40/40/20 portfolio.
 *  SGOV (40%): fed + NIIT, state-exempt.
 *  CMF  (40%): fully exempt.
 *  SCHD (20%): qualified rate + state + NIIT. */
const effPort = (fed: number, state: number): number =>
  0.4 * (fed + niit(fed)) + 0.2 * (qualRate(fed) + state + niit(fed));

/** Net annualized yield as a percent (e.g., 2.07). */
const netYieldCD = (fed: number, state: number): number =>
  CD_YIELD * (1 - effCD(fed, state)) * 100;

const netYieldPort = (fed: number, state: number): number =>
  PORT_YIELD * (1 - effPort(fed, state)) * 100;

/** Federal marginal rate (in percent) where both options tie, or null. */
function findBreakEven(state: number): number | null {
  let prev = netYieldCD(0, state) - netYieldPort(0, state);
  for (let f = 0.1; f <= 40; f += 0.1) {
    const cur = netYieldCD(f, state) - netYieldPort(f, state);
    if ((prev < 0 && cur >= 0) || (prev > 0 && cur <= 0)) {
      return Math.round(f * 10) / 10;
    }
    prev = cur;
  }
  return null;
}

const fmtUSD = (n: number): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number, digits = 2): string => `${n.toFixed(digits)}%`;

/* ============================================================
   Decision guide definitions
   ============================================================ */
type AnswerKey =
  | 'taxBracket'
  | 'riskTolerance'
  | 'liquidity'
  | 'horizon'
  | 'priority'
  | 'state';

type Answers = Record<AnswerKey, string | null>;

type Question = {
  id: AnswerKey;
  title: string;
  subtitle: string;
  options: { value: string; label: string; detail: string; icon: string }[];
};

type Recommendation = {
  choice: 'A' | 'B' | 'SPLIT';
  title: string;
  summary: string;
  reasons: string[];
  scoreA: number;
  scoreB: number;
  confidence: 'High' | 'Moderate' | 'Low';
};

const EMPTY_ANSWERS: Answers = {
  taxBracket: null,
  riskTolerance: null,
  liquidity: null,
  horizon: null,
  priority: null,
  state: null,
};

/** What each question really means — shown when partners disagree. */
const QUESTION_MEANING: Record<AnswerKey, string> = {
  taxBracket: 'The more tax a person pays, the more valuable tax-free income becomes to them.',
  state: 'California residents gain the most from the CA muni and Treasury state exemptions.',
  riskTolerance: 'This captures how important it is that the original amount never drops.',
  liquidity: 'The CD charges a penalty for early access; the portfolio does not.',
  horizon: 'A longer timeline makes the portfolio’s ups and downs easier to ride out.',
  priority: 'The CD wins on safety; the portfolio wins on after-tax income and buying power.',
};

const QUESTIONS: Question[] = [
  {
    id: 'taxBracket',
    title: 'How much tax do you pay on extra income?',
    subtitle: 'The more tax you pay, the more valuable tax-free income becomes.',
    options: [
      {
        value: 'top',
        label: 'A lot',
        detail: 'Top tax brackets — the government takes a big share of interest income',
        icon: 'fa-arrow-trend-up',
      },
      {
        value: 'mid',
        label: 'A medium amount',
        detail: 'Middle tax brackets — taxes matter, but less',
        icon: 'fa-equals',
      },
      {
        value: 'low',
        label: 'Not much',
        detail: 'Lower tax brackets — taxes don’t hurt much',
        icon: 'fa-arrow-trend-down',
      },
    ],
  },
  {
    id: 'state',
    title: 'Do you pay California state income tax?',
    subtitle: 'This is important — CA residents get big tax breaks from the CA bond and Treasury funds.',
    options: [
      {
        value: 'ca',
        label: 'Yes — I file California taxes',
        detail: 'You benefit from CA munis and the state-tax exemption on Treasuries',
        icon: 'fa-location-dot',
      },
      {
        value: 'other',
        label: 'No — another state',
        detail: 'The California-specific tax advantages matter less for you',
        icon: 'fa-map',
      },
    ],
  },
  {
    id: 'riskTolerance',
    title: 'If the portfolio’s value dropped 8–12% for a while, how would you feel?',
    subtitle: 'The portfolio’s value moves up and down every day. The CD’s never does.',
    options: [
      {
        value: 'cannot',
        label: 'I couldn’t tolerate it',
        detail: 'No matter the reason, that loss isn’t acceptable to me',
        icon: 'fa-shield-halved',
      },
      {
        value: 'uncomfortable',
        label: 'Uncomfortable, but I’d hold on',
        detail: 'I understand it can drop if the math is sound',
        icon: 'fa-scale-balanced',
      },
      {
        value: 'fine',
        label: 'I’m fine with it',
        detail: 'I know values go up and down, and I won’t panic',
        icon: 'fa-chart-line',
      },
    ],
  },
  {
    id: 'liquidity',
    title: 'How likely are you to need this money before the 2 years are up?',
    subtitle: 'The CD charges a penalty for early access. The portfolio doesn’t.',
    options: [
      {
        value: 'critical',
        label: 'Very likely — I may need it',
        detail: 'I need to be able to get the money out without a penalty',
        icon: 'fa-unlock',
      },
      {
        value: 'helpful',
        label: 'Maybe — access would be nice',
        detail: 'Liquidity is a plus, but locking it up is acceptable',
        icon: 'fa-key',
      },
      {
        value: 'none',
        label: 'Not needed — I can lock it up',
        detail: 'I won’t need this money until the term ends',
        icon: 'fa-lock',
      },
    ],
  },
  {
    id: 'horizon',
    title: 'How long do you plan to leave this money invested?',
    subtitle: 'The comparison below assumes a 24-month (2-year) window.',
    options: [
      {
        value: 'under12',
        label: 'Less than a year',
        detail: 'A short window favors safety and simplicity',
        icon: 'fa-hourglass-start',
      },
      {
        value: '12to24',
        label: '1 to 2 years',
        detail: 'Matches the 2-year comparison used in this analysis',
        icon: 'fa-hourglass-half',
      },
      {
        value: 'over24',
        label: 'More than 2 years',
        detail: 'A longer window can ride out the portfolio’s ups and downs',
        icon: 'fa-hourglass-end',
      },
    ],
  },
  {
    id: 'priority',
    title: 'What matters most to you?',
    subtitle: 'There’s no wrong answer — this decides how trade-offs should be weighted.',
    options: [
      {
        value: 'guarantee',
        label: 'Knowing the money is safe',
        detail: 'The original amount never shrinks, even if income is lower',
        icon: 'fa-building-columns',
      },
      {
        value: 'netincome',
        label: 'Getting the most spendable income',
        detail: 'I care about what I actually keep after taxes',
        icon: 'fa-coins',
      },
      {
        value: 'purchasing',
        label: 'Keeping up with the cost of living',
        detail: 'I don’t want inflation to eat away at my money',
        icon: 'fa-cart-shopping',
      },
    ],
  },
];

function scoreAnswers(answers: Answers): Recommendation {
  let scoreA = 0;
  let scoreB = 0;
  const reasons: string[] = [];

  if (answers.taxBracket === 'top') {
    scoreB += 3;
    reasons.push('High taxes heavily penalize the CD’s ordinary interest.');
  } else if (answers.taxBracket === 'mid') {
    scoreB += 1;
    scoreA += 1;
    reasons.push('Mid-level taxes give a moderate advantage to tax-efficient assets.');
  } else if (answers.taxBracket === 'low') {
    scoreA += 2;
    reasons.push('Low taxes reduce the drag on CD interest, narrowing the gap.');
  }

  if (answers.state === 'ca') {
    scoreB += 2;
    reasons.push('California residency increases the value of CA munis and Treasury state exemption.');
  } else if (answers.state === 'other') {
    scoreA += 1;
    reasons.push('Outside California, CA-specific munis lose their state-tax edge.');
  }

  if (answers.riskTolerance === 'cannot') {
    scoreA += 4;
    reasons.push('Not tolerating dips favors guaranteed, FDIC-protected principal.');
  } else if (answers.riskTolerance === 'uncomfortable') {
    scoreA += 1;
    scoreB += 1;
    reasons.push('Moderate risk tolerance allows either path with clear trade-offs.');
  } else if (answers.riskTolerance === 'fine') {
    scoreB += 3;
    reasons.push('Comfort with temporary dips unlocks tax-efficient portfolio construction.');
  }

  if (answers.liquidity === 'critical') {
    scoreB += 3;
    reasons.push('Needing penalty-free access strongly favors liquid ETFs over a locked CD.');
  } else if (answers.liquidity === 'helpful') {
    scoreB += 1;
    reasons.push('Optional access is a mild advantage for the portfolio option.');
  } else if (answers.liquidity === 'none') {
    scoreA += 2;
    reasons.push('Willingness to lock the money removes the CD’s liquidity penalty.');
  }

  if (answers.horizon === 'under12') {
    scoreA += 2;
    reasons.push('A sub-12-month horizon favors simplicity and stability.');
  } else if (answers.horizon === '12to24') {
    scoreA += 1;
    scoreB += 1;
    reasons.push('A 1–2 year window matches the modeled comparison period.');
  } else if (answers.horizon === 'over24') {
    scoreB += 2;
    reasons.push('A longer horizon improves the case for the portfolio’s equity sleeve.');
  }

  if (answers.priority === 'guarantee') {
    scoreA += 4;
    reasons.push('Safety of the original amount maps directly to a bank CD.');
  } else if (answers.priority === 'netincome') {
    scoreB += 3;
    reasons.push('Maximizing after-tax spendable income favors the tax-managed portfolio.');
  } else if (answers.priority === 'purchasing') {
    scoreB += 3;
    reasons.push('Protecting buying power favors the higher real net yield path.');
  }

  const diff = Math.abs(scoreA - scoreB);
  let choice: Recommendation['choice'];
  let title: string;
  let summary: string;
  let confidence: Recommendation['confidence'];

  if (diff <= 2) {
    choice = 'SPLIT';
    title = 'Split Allocation May Be Optimal';
    summary =
      'Your answers produce a near-tie. An objective approach is to split the money — for example 50/50 — so you get safety on one piece and tax efficiency on the other.';
    confidence = 'Moderate';
  } else if (scoreA > scoreB) {
    choice = 'A';
    title = 'Option A: Bank CD Is the Better Fit';
    summary =
      'Based on your priorities around safety, risk tolerance, and constraints, a high-yield bank CD is the more objective match for this money.';
    confidence = diff >= 5 ? 'High' : 'Moderate';
  } else {
    choice = 'B';
    title = 'Option B: 40/40/20 Portfolio Is the Better Fit';
    summary =
      'Based on your tax situation, liquidity needs, and after-tax goals, the tax-managed ETF portfolio is the more objective match for this money.';
    confidence = diff >= 5 ? 'High' : 'Moderate';
  }

  if (diff <= 1) confidence = 'Low';

  return { choice, title, summary, reasons: reasons.slice(0, 5), scoreA, scoreB, confidence };
}

const NAV_LINKS = [
  { href: '#guide', label: 'Decision Guide' },
  { href: '#lab', label: 'Scenario Lab' },
  { href: '#compare', label: 'Compare' },
  { href: '#tax', label: 'Tax Reality' },
  { href: '#horizon', label: '24-Month' },
  { href: '#real', label: 'Real Return' },
  { href: '#components', label: 'Components' },
  { href: '#glossary', label: 'Plain English' },
  { href: '#sources', label: 'Sources' },
];

type GlossaryCategory = 'basics' | 'taxes' | 'safety' | 'markets';

type GlossaryTerm = {
  id: string;
  icon: string;
  term: string;
  aka?: string;
  def: string;
  example?: string;
  category: GlossaryCategory;
};

const GLOSSARY_CATEGORIES: {
  id: GlossaryCategory | 'all';
  label: string;
  icon: string;
  color: string;
}[] = [
  { id: 'all', label: 'All terms', icon: 'fa-layer-group', color: 'bg-slate-400' },
  { id: 'basics', label: 'Money basics', icon: 'fa-coins', color: 'bg-sky-500' },
  { id: 'taxes', label: 'Taxes', icon: 'fa-file-invoice-dollar', color: 'bg-violet-500' },
  { id: 'safety', label: 'Safety & insurance', icon: 'fa-shield-halved', color: 'bg-emerald-500' },
  { id: 'markets', label: 'Markets & risk', icon: 'fa-chart-line', color: 'bg-amber-500' },
];

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'principal',
    icon: 'fa-coins',
    term: 'Principal',
    category: 'basics',
    def: 'The original amount of money you put in — before any interest is earned or any losses.',
    example: 'Here, the principal is $460,000.',
  },
  {
    id: 'yield',
    icon: 'fa-arrow-trend-up',
    term: 'Yield',
    category: 'basics',
    def: 'Income produced in a year, shown as a percentage of the money invested. “Yield” is the investing word for “interest rate.”',
    example: 'A 4.50% yield on $460,000 produces about $20,700 before tax.',
  },
  {
    id: 'apy',
    icon: 'fa-percent',
    term: 'APY',
    aka: 'Annual Percentage Yield',
    category: 'basics',
    def: 'The interest a bank pays in one year, including compounding. It is a guaranteed number for a CD held to maturity.',
    example: 'The CD’s 4.50% is its APY.',
  },
  {
    id: 'sec-yield',
    icon: 'fa-chart-simple',
    term: 'SEC Yield',
    category: 'basics',
    def: 'The income a fund is producing right now, averaged over 30 days and after fees. It is a snapshot, not a promise.',
    example: 'The portfolio’s 3.38% is its blended 30-day SEC yield (as of August 2026).',
  },
  {
    id: 'nav',
    icon: 'fa-tag',
    term: 'NAV',
    aka: 'Net Asset Value',
    category: 'basics',
    def: 'The price of one share of a fund. It is recalculated every trading day and changes as markets move.',
    example: 'If a fund’s NAV drops from $50 to $48, each share is worth $2 less.',
  },
  {
    id: 'tax-exempt',
    icon: 'fa-hand-holding-dollar',
    term: 'Tax-Exempt',
    category: 'taxes',
    def: 'Income you don’t owe tax on. Some bond interest is free of federal tax, state tax, or both.',
    example: 'The CA muni bond income in this portfolio is fully tax-exempt for CA residents.',
  },
  {
    id: 'niit',
    icon: 'fa-file-invoice-dollar',
    term: 'NIIT',
    aka: 'Net Investment Income Tax',
    category: 'taxes',
    def: 'An extra 3.8% federal tax on investment income for higher earners. It stacks on top of ordinary or qualified rates.',
    example: 'It applies to CD interest and to most portfolio income when federal marginal rate is high enough.',
  },
  {
    id: 'muni',
    icon: 'fa-landmark',
    term: 'Municipal Bond',
    aka: 'Muni',
    category: 'taxes',
    def: 'A loan to a state or city. The interest is free of federal tax and, for residents of that state, often free of state tax too.',
    example: 'CMF holds California munis — the portfolio’s biggest tax advantage.',
  },
  {
    id: 'qualified',
    icon: 'fa-money-bill-trend-up',
    term: 'Qualified Dividends',
    category: 'taxes',
    def: 'Stock payouts taxed at a lower rate (0–20%) than normal income (up to 40.8% including NIIT).',
    example: 'The SCHD fund pays qualified dividends.',
  },
  {
    id: 'fdic',
    icon: 'fa-shield-halved',
    term: 'FDIC Insurance',
    category: 'safety',
    def: 'A government backstop that covers bank deposits up to $250,000 per person, per bank, per ownership category. It protects CDs — not investment portfolios.',
    example: 'Above $250,000 in a single name, CD money is not guaranteed. A joint account can cover up to $500,000.',
  },
  {
    id: 'reinvestment',
    icon: 'fa-rotate-right',
    term: 'Reinvestment Risk',
    category: 'safety',
    def: 'The risk that when a CD matures, new rates are lower than today’s — so your renewal earns less.',
    example: 'If today’s 4.50% CD rolls into a 3% CD in 2028, income drops sharply.',
  },
  {
    id: 'volatility',
    icon: 'fa-wave-square',
    term: 'Volatility & Drawdown',
    category: 'markets',
    def: 'Volatility is how much a value moves up and down. A drawdown is a drop from its peak.',
    example: 'The portfolio’s value will move day to day; the CD’s never will.',
  },
  {
    id: 'duration',
    icon: 'fa-clock',
    term: 'Duration',
    category: 'markets',
    def: 'A measure of how sensitive a bond’s price is to interest-rate changes. Higher duration means bigger price swings when rates move.',
    example: 'CMF’s effective duration is about 6.4 years — rates up, price down (and vice versa).',
  },
  {
    id: 'sipc',
    icon: 'fa-building-columns',
    term: 'SIPC',
    aka: 'Securities Investor Protection',
    category: 'safety',
    def: 'Protects brokerage accounts if the broker fails — not against market losses. Different from FDIC bank insurance.',
    example: 'ETFs at a brokerage are SIPC-protected against broker failure, not against the market falling.',
  },
];

/* ============================================================
   Small UI helpers
   ============================================================ */
type RangeFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  minLabel?: string;
  maxLabel?: string;
  onChange: (v: number) => void;
};

function RangeField({
  label,
  value,
  min,
  max,
  step,
  display,
  minLabel,
  maxLabel,
  onChange,
}: RangeFieldProps) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <span className="text-sm font-bold text-slate-900 tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        className="range-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-0.5">
        <span>{minLabel ?? String(min)}</span>
        <span>{maxLabel ?? String(max)}</span>
      </div>
    </label>
  );
}

function BreakEvenGauge({ state, fed }: { state: number; fed: number }) {
  const be = findBreakEven(state);
  const cdAheadAtStart = netYieldCD(0, state) > netYieldPort(0, state);

  let leftPct: number;
  let fill: string;
  if (be === null) {
    leftPct = cdAheadAtStart ? 100 : 0;
    fill = cdAheadAtStart
      ? 'linear-gradient(to right, #10b981 0%, #10b981 100%)'
      : 'linear-gradient(to right, #3b82f6 0%, #3b82f6 100%)';
  } else {
    leftPct = (be / 40) * 100;
    fill = `linear-gradient(to right, #10b981 0%, #10b981 ${leftPct}%, #3b82f6 ${leftPct}%, #3b82f6 100%)`;
  }

  let message: string;
  if (be === null) {
    message = cdAheadAtStart
      ? `At a ${state.toFixed(1)}% state rate, the CD retains the advantage at every federal marginal rate from 0–40%.`
      : `At a ${state.toFixed(1)}% state rate, the portfolio leads at every federal marginal rate from 0–40%.`;
  } else if (Math.abs(fed - be) < 0.6) {
    message = `You are at the crossover (≈ ${be.toFixed(1)}% federal). A split allocation is objectively defensible.`;
  } else if (fed > be) {
    message = `Portfolio nets more at your ${fed.toFixed(1)}% federal rate. Crossover is ≈ ${be.toFixed(1)}% federal (at ${state.toFixed(1)}% state).`;
  } else {
    message = `CD nets more at your ${fed.toFixed(1)}% federal rate. Crossover is ≈ ${be.toFixed(1)}% federal (at ${state.toFixed(1)}% state).`;
  }

  return (
    <div>
      <div className="text-sm font-semibold text-slate-800 mb-2">
        Break-even federal marginal rate
      </div>
      <div className="relative h-4 rounded-full overflow-hidden" style={{ background: fill }} aria-hidden="true">
        {be !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow"
            style={{ left: `${leftPct}%` }}
          />
        )}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-700 shadow"
          style={{ left: `calc(${(fed / 40) * 100}% - 7px)` }}
        />
      </div>
      <div className="flex justify-between text-[11px] font-semibold text-slate-500 mt-1.5">
        <span className="text-emerald-700">CD favored</span>
        <span className="text-blue-700">Portfolio favored</span>
      </div>
      <p className="text-sm text-slate-600 mt-3 leading-relaxed">{message}</p>
    </div>
  );
}

/* ============================================================
   App
   ============================================================ */
type Stage = 'intro' | 'questions' | 'divider' | 'result';
type Mode = 'solo' | 'couple';

const CHOICE_SHORT: Record<Recommendation['choice'], string> = {
  A: 'the CD',
  B: 'the portfolio',
  SPLIT: 'a split',
};

export const App = () => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);

  const [mainTab, setMainTab] = useState<'cd-portfolio' | 'tax-modeling'>('cd-portfolio');
  const [stage, setStage] = useState<Stage>('intro');
  const [mode, setMode] = useState<Mode>('solo');
  const [partnerTurn, setPartnerTurn] = useState(0); // 0 = partner 1, 1 = partner 2
  const [step, setStep] = useState(0);
  const [answers1, setAnswers1] = useState<Answers>(EMPTY_ANSWERS);
  const [answers2, setAnswers2] = useState<Answers>(EMPTY_ANSWERS);
  const [activeNav, setActiveNav] = useState('guide');

  const [lab, setLab] = useState({ principal: 460000, fed: 37, state: 13.3, inflation: 2.5 });
  const [glossaryQuery, setGlossaryQuery] = useState('');
  const [glossaryCat, setGlossaryCat] = useState<GlossaryCategory | 'all'>('all');

  const filteredGlossary = useMemo(() => {
    const q = glossaryQuery.trim().toLowerCase();
    return GLOSSARY_TERMS.filter((t) => {
      if (glossaryCat !== 'all' && t.category !== glossaryCat) return false;
      if (!q) return true;
      const hay = `${t.term} ${t.aka ?? ''} ${t.def} ${t.example ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [glossaryQuery, glossaryCat]);

  const glossaryByCategory = useMemo(() => {
    const order: GlossaryCategory[] = ['basics', 'taxes', 'safety', 'markets'];
    return order
      .map((cat) => ({
        cat,
        meta: GLOSSARY_CATEGORIES.find((c) => c.id === cat)!,
        terms: filteredGlossary.filter((t) => t.category === cat),
      }))
      .filter((g) => g.terms.length > 0);
  }, [filteredGlossary]);

  const currentAnswers = partnerTurn === 0 ? answers1 : answers2;
  const currentQ = stage === 'questions' ? QUESTIONS[step] : null;
  const canNext = currentQ ? currentAnswers[currentQ.id] !== null : false;

  /* Progress across all steps (6 solo, 12 for a couple) */
  const totalSteps = mode === 'couple' ? QUESTIONS.length * 2 : QUESTIONS.length;
  const doneSteps = partnerTurn * QUESTIONS.length + step;
  const progress =
    stage === 'intro'
      ? 0
      : stage === 'divider'
        ? 50
        : stage === 'result'
          ? 100
          : Math.round((doneSteps / totalSteps) * 100);

  const rec1 = useMemo(() => (mode === 'couple' ? scoreAnswers(answers1) : null), [mode, answers1]);
  const rec2 = useMemo(() => (mode === 'couple' ? scoreAnswers(answers2) : null), [mode, answers2]);
  const soloRec = useMemo(() => (mode === 'solo' && stage === 'result' ? scoreAnswers(answers1) : null), [mode, stage, answers1]);

  /* Couple split math */
  const totalA = (rec1?.scoreA ?? 0) + (rec2?.scoreA ?? 0);
  const totalB = (rec1?.scoreB ?? 0) + (rec2?.scoreB ?? 0);
  const sameChoice = rec1 && rec2 ? rec1.choice === rec2.choice : true;
  let cdPct = 50;
  if (rec1 && rec2 && !sameChoice && totalA + totalB > 0) {
    const raw = (totalA / (totalA + totalB)) * 100;
    cdPct = Math.max(10, Math.min(90, Math.round(raw / 5) * 5));
  }
  const cdUSD = Math.round((lab.principal * cdPct) / 100);
  const portUSD = lab.principal - cdUSD;

  /* Live scenario-lab results (all derived from the tax model above) */
  const labGrossCD = lab.principal * CD_YIELD;
  const labGrossPort = lab.principal * PORT_YIELD;
  const labEffCD = effCD(lab.fed / 100, lab.state / 100);
  const labEffPort = effPort(lab.fed / 100, lab.state / 100);
  const labNetCD = labGrossCD * (1 - labEffCD);
  const labNetPort = labGrossPort * (1 - labEffPort);
  const labYieldCD = netYieldCD(lab.fed / 100, lab.state / 100);
  const labYieldPort = netYieldPort(lab.fed / 100, lab.state / 100);
  const labRealCD = labYieldCD - lab.inflation;
  const labRealPort = labYieldPort - lab.inflation;
  const labWinner = labRealCD >= labRealPort ? ('A' as const) : ('B' as const);
  const uninsured = Math.max(0, lab.principal - FDIC_LIMIT);

  const stressRows = [
    {
      label: 'CD early withdrawal (−3 mo interest)',
      impact: -lab.principal * CD_YIELD * 0.25,
      note: 'Only applies if funds are needed before maturity',
    },
    {
      label: 'SCHD correction (−15%)',
      impact: -lab.principal * 0.2 * 0.15,
      note: 'Equity sleeve drops 15%',
    },
    {
      label: 'SCHD severe bear (−30%)',
      impact: -lab.principal * 0.2 * 0.3,
      note: 'Equity sleeve drops 30%',
    },
    {
      label: 'CMF rate rise (−5% NAV)',
      impact: -lab.principal * 0.4 * 0.05,
      note: 'Muni bond prices fall as rates rise',
    },
    {
      label: 'Combined stress (SCHD −30%, CMF −5%)',
      impact: -lab.principal * (0.2 * 0.3 + 0.4 * 0.05),
      note: 'Worst-case sleeve drawdown',
    },
  ];

  useEffect(() => {
    Chart.defaults.font.family = 'Inter';
    Chart.defaults.color = '#475569';

    const canvas = chartRef.current;
    if (!canvas) return;

    const ctxTax = canvas.getContext('2d');
    if (!ctxTax) return;

    const chart = new Chart(ctxTax, {
      type: 'bar',
      data: {
        labels: ['Option A (4.50% CD)', 'Option B (3.38% Portfolio)'],
        datasets: [
          {
            label: 'Gross Annual Income (Before Tax)',
            data: [20700, 15548],
            backgroundColor: '#cbd5e1',
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.5,
          },
          {
            label: 'Net Spendable Income (After CA & Fed Tax)',
            data: [9501, 11857],
            backgroundColor: (context) => {
              const index = context.dataIndex;
              return index === 0 ? '#10b981' : '#3b82f6';
            },
            borderRadius: 6,
            barPercentage: 0.7,
            categoryPercentage: 0.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: 'rectRounded',
              font: { family: 'Inter', size: 12, weight: 500 as const },
            },
          },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { family: 'Inter', size: 13, weight: 600 as const },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label(context) {
                const value = Number(context.raw);
                const principal = 460000;
                const yieldPct = ((value / principal) * 100).toFixed(2);
                return `${context.dataset.label}: ${fmtUSD(value)} (${yieldPct}% Yield)`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Annual Income ($)',
              font: { family: 'Inter', size: 12, weight: 600 as const },
              color: '#334155',
            },
            ticks: {
              callback(value) {
                return '$' + Number(value).toLocaleString();
              },
              font: { family: 'Inter', size: 11, weight: 500 as const },
              color: '#475569',
            },
            grid: { color: '#f1f5f9' },
          },
          x: {
            grid: { display: false },
            ticks: {
              font: { family: 'Inter', size: 11, weight: 500 as const },
              color: '#334155',
            },
          },
        },
      },
    });

    return () => chart.destroy();
  }, []);

  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveNav(visible.target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0.1, 0.3, 0.5] }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  /* ——— Questionnaire handlers ——— */
  const startQuestions = (m: Mode) => {
    setMode(m);
    setPartnerTurn(0);
    setStep(0);
    setStage('questions');
  };

  const startPartner2 = () => {
    setPartnerTurn(1);
    setStep(0);
    setStage('questions');
  };

  const selectAnswer = (value: string) => {
    if (!currentQ) return;
    if (partnerTurn === 0) {
      setAnswers1((prev) => ({ ...prev, [currentQ.id]: value }));
    } else {
      setAnswers2((prev) => ({ ...prev, [currentQ.id]: value }));
    }
  };

  const goNext = () => {
    if (!currentQ || !canNext) return;
    if (step < QUESTIONS.length - 1) {
      setStep((s) => s + 1);
    } else if (mode === 'couple' && partnerTurn === 0) {
      setStage('divider');
    } else {
      setStage('result');
    }
  };

  const goBack = () => {
    if (stage === 'result') {
      setStage('questions');
      setStep(QUESTIONS.length - 1);
      setPartnerTurn(mode === 'couple' ? 1 : 0);
    } else if (stage === 'divider') {
      setStage('questions');
      setPartnerTurn(0);
      setStep(QUESTIONS.length - 1);
    } else if (stage === 'questions') {
      if (step > 0) {
        setStep((s) => s - 1);
      } else if (mode === 'couple' && partnerTurn === 1) {
        setStage('divider');
      } else {
        setStage('intro');
      }
    }
  };

  const resetGuide = () => {
    setStage('intro');
    setMode('solo');
    setPartnerTurn(0);
    setStep(0);
    setAnswers1(EMPTY_ANSWERS);
    setAnswers2(EMPTY_ANSWERS);
  };

  const resultAccent =
    rec1 && rec2 && !sameChoice
      ? 'amber'
      : (rec1?.choice ?? soloRec?.choice) === 'A'
        ? 'emerald'
        : (rec1?.choice ?? soloRec?.choice) === 'B'
          ? 'blue'
          : 'amber';

  const qLabel = (ans: Answers, qid: AnswerKey): string =>
    QUESTIONS.find((q) => q.id === qid)?.options.find((o) => o.value === ans[qid])?.label ?? '—';

  return (
    <div className="text-slate-800 antialiased pb-24">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-lg focus:shadow-lg focus:font-semibold focus:text-sm"
      >
        Skip to main content
      </a>

      {/* Sticky nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between py-2 sm:py-0 min-h-[3.5rem] gap-3 sm:gap-4">
            
            {/* Logo & Main View Switcher */}
            <div className="flex items-center justify-between sm:justify-start gap-4">
              <button 
                onClick={() => setMainTab('cd-portfolio')}
                className="flex items-center gap-2.5 shrink-0 text-left group focus:outline-none"
              >
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-blue-900 text-white shadow-sm group-hover:shadow-md transition-shadow">
                  <i className="fa-solid fa-scale-balanced text-xs" aria-hidden="true" />
                </span>
                <span className="font-bold text-slate-900 text-sm tracking-tight">
                  Wealth & Tax Planner
                </span>
              </button>

              {/* Primary Navigation Tabs */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-bold shadow-inner">
                <button
                  onClick={() => setMainTab('cd-portfolio')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    mainTab === 'cd-portfolio'
                      ? 'bg-white text-blue-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <i className="fa-solid fa-chart-pie text-[11px]" />
                  <span>CD & Portfolio</span>
                </button>
                <button
                  onClick={() => setMainTab('tax-modeling')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    mainTab === 'tax-modeling'
                      ? 'bg-white text-blue-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <i className="fa-solid fa-calculator text-[11px]" />
                  <span>Tax Modeling</span>
                </button>
              </div>
            </div>

            {/* Sub-navigation links (shown when in CD & Portfolio tab) */}
            {mainTab === 'cd-portfolio' && (
              <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-1 -mr-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`nav-pill whitespace-nowrap ${
                      activeNav === link.href.slice(1) ? 'nav-pill-active' : ''
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {mainTab === 'tax-modeling' ? (
        <TaxModeler />
      ) : (
        <>
          {/* Hero */}
          <header id="top" className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.25),_transparent_55%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.12),_transparent_50%)]" />
            <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-20">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-slate-200 text-xs font-semibold uppercase tracking-wider mb-6">
                <i className="fa-solid fa-flask text-sky-300" aria-hidden="true" />
                Objective · Plain English · No Sales Pitch
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-[1.1] text-balance max-w-4xl">
                One safe choice, one tax-smart choice.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-emerald-300">
                  Which fits your money?
                </span>
              </h1>
              <p className="text-base md:text-lg text-slate-300 max-w-2xl leading-relaxed mb-8">
                You have $460,000 to invest for about 2 years. Option A is a bank CD — safe, but heavily
                taxed. Option B is a mix of bond funds and dividend stocks — no guarantee, but far lighter
                taxes. Answer a few plain questions (individually or as a couple) and this tool shows you
                the numbers, the risks, and a fair way to split the difference.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#guide" className="btn-primary-light">
                  <i className="fa-solid fa-compass mr-2" aria-hidden="true" />
                  Start Decision Guide
                </a>
                <a href="#lab" className="btn-secondary">
                  <i className="fa-solid fa-sliders mr-2" aria-hidden="true" />
                  Try the Scenario Lab
                </a>
                <button 
                  onClick={() => setMainTab('tax-modeling')}
                  className="px-4 py-2.5 rounded-xl bg-blue-600/80 hover:bg-blue-600 text-white font-semibold text-sm transition border border-blue-400/40 shadow-sm flex items-center gap-2"
                >
                  <i className="fa-solid fa-calculator" aria-hidden="true" />
                  2026 Tax Modeler
                </button>
              </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12">
            {[
              { label: 'Principal', value: '$460,000' },
              { label: 'Horizon', value: '2 years' },
              { label: 'CD APY', value: '4.50%' },
              { label: 'Portfolio Yield', value: '3.38%' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  {stat.label}
                </div>
                <div className="text-lg md:text-xl font-bold text-white tabular-nums">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Decision Guide / Questionnaire */}
        <section id="guide" className="scroll-mt-20 -mt-8 mb-20 relative z-10">
          <div className="section-card p-6 md:p-10 shadow-xl shadow-slate-200/60">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <div className="section-kicker">
                  <i className="fa-solid fa-route mr-1.5" aria-hidden="true" />
                  Interactive Decision Guide
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">
                  Which choice fits your situation?
                </h2>
                <p className="text-slate-600 mt-2 max-w-xl leading-relaxed">
                  Six plain-English questions. If two of you are deciding, each answers separately —
                  you’ll see where you agree, where you differ, and a fair split.
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Progress
                </div>
                <div className="text-2xl font-bold text-slate-800 tabular-nums">{progress}%</div>
              </div>
            </div>

            <div className="progress-track mb-8" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>

            {/* ——— Intro: who is deciding ——— */}
            {stage === 'intro' && (
              <div className="animate-fade-in">
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                  Who is making this decision?
                </h3>
                <p className="text-slate-600 mb-6 max-w-xl leading-relaxed">
                  If you and your partner want different things, answering separately is the most
                  objective way to find common ground.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <button type="button" onClick={() => startQuestions('solo')} className="mode-card">
                    <span className="mode-card-icon bg-slate-100 text-slate-600" aria-hidden="true">
                      <i className="fa-solid fa-user" />
                    </span>
                    <span className="text-left">
                      <span className="block font-bold text-slate-900">Just me</span>
                      <span className="block text-sm text-slate-600 mt-0.5 leading-relaxed">
                        I’m deciding on my own
                      </span>
                    </span>
                    <i className="fa-solid fa-arrow-right text-slate-300 ml-auto" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => startQuestions('couple')} className="mode-card">
                    <span className="mode-card-icon bg-indigo-100 text-indigo-600" aria-hidden="true">
                      <i className="fa-solid fa-user-group" />
                    </span>
                    <span className="text-left">
                      <span className="block font-bold text-slate-900">The two of us</span>
                      <span className="block text-sm text-slate-600 mt-0.5 leading-relaxed">
                        Answer separately — see where you agree, where you differ, and a fair split
                      </span>
                    </span>
                    <i className="fa-solid fa-arrow-right text-slate-300 ml-auto" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-6 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
                  Not sure what a word means? There’s a plain-English glossary at the bottom of the
                  page. Every question is about you, not about which choice is “better.”
                </p>
              </div>
            )}

            {/* ——— Divider: hand off to partner 2 ——— */}
            {stage === 'divider' && (
              <div className="animate-fade-in text-center py-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 mb-4">
                  <i className="fa-solid fa-handshake text-2xl" aria-hidden="true" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">
                  Partner 1 is done — now Partner 2
                </h3>
                <p className="text-slate-600 max-w-lg mx-auto leading-relaxed mb-6">
                  Partner 2 answers the same six questions with their own opinions. There are no right
                  answers — the tool uses both sets to find common ground.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={goBack} className="btn-ghost">
                    <i className="fa-solid fa-arrow-left mr-2 text-xs" aria-hidden="true" />
                    Back
                  </button>
                  <button type="button" onClick={startPartner2} className="btn-primary">
                    Start Partner 2’s questions
                    <i className="fa-solid fa-arrow-right ml-2 text-xs" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* ——— Questions ——— */}
            {stage === 'questions' && currentQ && (
              <div className="animate-fade-in">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 font-medium mb-3">
                  {mode === 'couple' && (
                    <span
                      className={`partner-chip ${
                        partnerTurn === 0 ? 'partner-chip-1' : 'partner-chip-2'
                      }`}
                    >
                      {partnerTurn === 0 ? (
                        <i className="fa-solid fa-user text-xs mr-1" aria-hidden="true" />
                      ) : (
                        <i className="fa-solid fa-user text-xs mr-1" aria-hidden="true" />
                      )}
                      Partner {partnerTurn + 1}
                    </span>
                  )}
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold">
                    {step + 1}
                  </span>
                  of {QUESTIONS.length}
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">{currentQ.title}</h3>
                <p className="text-slate-600 mb-6">{currentQ.subtitle}</p>

                <div className="grid gap-3" role="radiogroup" aria-label={currentQ.title}>
                  {currentQ.options.map((opt) => {
                    const selected = currentAnswers[currentQ.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => selectAnswer(opt.value)}
                        className={`quiz-option ${selected ? 'quiz-option-selected' : ''}`}
                      >
                        <span
                          className={`quiz-option-icon ${selected ? 'quiz-option-icon-selected' : ''}`}
                          aria-hidden="true"
                        >
                          <i className={`fa-solid ${opt.icon}`} />
                        </span>
                        <span className="text-left flex-1 min-w-0">
                          <span className="block font-semibold text-slate-900">{opt.label}</span>
                          <span className="block text-sm text-slate-600 mt-0.5 leading-relaxed">
                            {opt.detail}
                          </span>
                        </span>
                        <span
                          className={`quiz-check ${selected ? 'quiz-check-selected' : ''}`}
                          aria-hidden="true"
                        >
                          {selected && <i className="fa-solid fa-check text-xs" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={stage !== 'questions' || (step === 0 && mode === 'solo')}
                    className="btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <i className="fa-solid fa-arrow-left mr-2 text-xs" aria-hidden="true" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!canNext}
                    className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none"
                  >
                    {step === QUESTIONS.length - 1
                      ? mode === 'couple' && partnerTurn === 0
                        ? 'Next: Partner 2'
                        : 'See Recommendation'
                      : 'Continue'}
                    <i className="fa-solid fa-arrow-right ml-2 text-xs" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}

            {/* ——— Result: solo ——— */}
            {stage === 'result' && mode === 'solo' && soloRec && (
              <div className="animate-fade-in">
                <div className={`rounded-2xl border-2 p-6 md:p-8 mb-6 result-banner result-${resultAccent}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`confidence-badge confidence-${resultAccent}`}>
                          {soloRec.confidence} confidence
                        </span>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Scored recommendation
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-slate-900">{soloRec.title}</h3>
                    </div>
                    <div className="flex gap-3">
                      <div className="score-chip score-a">
                        <span className="text-[10px] uppercase font-bold tracking-wide opacity-80">CD</span>
                        <span className="text-xl font-bold tabular-nums">{soloRec.scoreA}</span>
                      </div>
                      <div className="score-chip score-b">
                        <span className="text-[10px] uppercase font-bold tracking-wide opacity-80">Port</span>
                        <span className="text-xl font-bold tabular-nums">{soloRec.scoreB}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-base md:text-lg mb-5">
                    {soloRec.summary}
                  </p>
                  <ul className="space-y-2.5">
                    {soloRec.reasons.map((r) => (
                      <li key={r} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <i className="fa-solid fa-circle-check text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <a href="#lab" className="result-link-card">
                    <i className="fa-solid fa-sliders text-indigo-600 mb-2" aria-hidden="true" />
                    <span className="font-semibold text-slate-800">Test with your numbers</span>
                    <span className="text-xs text-slate-500 mt-1">Principal, tax, inflation</span>
                  </a>
                  <a href="#compare" className="result-link-card">
                    <i className="fa-solid fa-table-columns text-blue-600 mb-2" aria-hidden="true" />
                    <span className="font-semibold text-slate-800">Review side-by-side</span>
                    <span className="text-xs text-slate-500 mt-1">Option cards & features</span>
                  </a>
                  <a href="#tax" className="result-link-card">
                    <i className="fa-solid fa-chart-column text-emerald-600 mb-2" aria-hidden="true" />
                    <span className="font-semibold text-slate-800">Inspect the tax math</span>
                    <span className="text-xs text-slate-500 mt-1">Gross vs net income</span>
                  </a>
                  <a href="#real" className="result-link-card">
                    <i className="fa-solid fa-gauge-high text-amber-600 mb-2" aria-hidden="true" />
                    <span className="font-semibold text-slate-800">Real return path</span>
                    <span className="text-xs text-slate-500 mt-1">After tax & inflation</span>
                  </a>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={goBack} className="btn-ghost">
                    <i className="fa-solid fa-arrow-left mr-2 text-xs" aria-hidden="true" />
                    Edit last answer
                  </button>
                  <button type="button" onClick={resetGuide} className="btn-secondary-light">
                    <i className="fa-solid fa-rotate-left mr-2 text-xs" aria-hidden="true" />
                    Start over
                  </button>
                </div>

                <p className="mt-6 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
                  Scoring is transparent and rule-based: each answer adds weighted points to Option A
                  (CD) or Option B (Portfolio). A near-tie suggests a split. This is decision support,
                  not personalized financial advice.
                </p>
              </div>
            )}

            {/* ——— Result: couple ——— */}
            {stage === 'result' && mode === 'couple' && rec1 && rec2 && (
              <div className="animate-fade-in">
                <div className={`rounded-2xl border-2 p-6 md:p-8 mb-6 result-banner result-${resultAccent}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`confidence-badge confidence-${resultAccent}`}>
                          {sameChoice ? 'You both agree' : 'Common-ground split'}
                        </span>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          Couple decision
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-slate-900">
                        {sameChoice
                          ? `You both lean toward ${CHOICE_SHORT[rec1.choice]}`
                          : 'A split may serve you both'}
                      </h3>
                    </div>
                    <div className="flex gap-3">
                      <div className="score-chip score-a">
                        <span className="text-[10px] uppercase font-bold tracking-wide opacity-80">CD</span>
                        <span className="text-xl font-bold tabular-nums">{totalA}</span>
                      </div>
                      <div className="score-chip score-b">
                        <span className="text-[10px] uppercase font-bold tracking-wide opacity-80">Port</span>
                        <span className="text-xl font-bold tabular-nums">{totalB}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed text-base md:text-lg mb-6">
                    {sameChoice
                      ? rec1.choice === 'SPLIT'
                        ? 'You both answered in a way that points to splitting the money rather than choosing one side. That is a valid, objective outcome.'
                        : `You both answered the same way — your priorities point the same direction. Before committing, confirm the trade-offs on that choice are ones you can both live with.`
                      : 'It is normal to want different things. One of you is drawn to safety, the other to tax-efficient income. A fair, objective compromise is to give each of you a meaningful piece:'}
                  </p>

                  {!sameChoice && (
                    <div className="mb-6">
                      <div className="flex h-4 rounded-full overflow-hidden" role="img" aria-label={`${cdPct}% CD, ${100 - cdPct}% portfolio`}>
                        <div className="bg-emerald-500" style={{ width: `${cdPct}%` }} />
                        <div className="bg-blue-500" style={{ width: `${100 - cdPct}%` }} />
                      </div>
                      <div className="flex flex-wrap justify-between gap-2 mt-2.5 text-sm font-bold">
                        <span className="text-emerald-700">
                          {cdPct}% CD — {fmtUSD(cdUSD)}
                        </span>
                        <span className="text-blue-700">
                          {100 - cdPct}% Portfolio — {fmtUSD(portUSD)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        The split is weighted by how strongly each of you feels, based on your answers.
                        Adjust the exact amounts any way you like — the Scenario Lab below shows the
                        after-tax income for any mix.
                      </p>
                    </div>
                  )}

                  {/* Per-partner leans */}
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                        Partner 1
                      </div>
                      <div className="text-sm text-slate-700 leading-relaxed">
                        Leans toward <strong className="text-slate-900">{CHOICE_SHORT[rec1.choice]}</strong> — CD {rec1.scoreA} vs Portfolio {rec1.scoreB} ({rec1.confidence.toLowerCase()} confidence)
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                        Partner 2
                      </div>
                      <div className="text-sm text-slate-700 leading-relaxed">
                        Leans toward <strong className="text-slate-900">{CHOICE_SHORT[rec2.choice]}</strong> — CD {rec2.scoreA} vs Portfolio {rec2.scoreB} ({rec2.confidence.toLowerCase()} confidence)
                      </div>
                    </div>
                  </div>

                  {/* Agreement breakdown */}
                  <h4 className="text-sm font-bold text-slate-900 mb-3">
                    Where you agree and where you differ
                  </h4>
                  <div className="space-y-2 mb-6">
                    {QUESTIONS.map((q) => {
                      const same = answers1[q.id] === answers2[q.id];
                      return (
                        <div
                          key={q.id}
                          className={`rounded-xl border p-4 ${
                            same
                              ? 'border-slate-200 bg-white'
                              : 'border-amber-200 bg-amber-50/40'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-semibold text-slate-800 leading-snug pr-2">
                              {q.title}
                            </p>
                            <span className={`agree-badge ${same ? 'agree' : 'differ'}`}>
                              {same ? 'Agree' : 'Different'}
                            </span>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-2 text-sm">
                            <div className="rounded-lg bg-white/80 border border-slate-100 px-3 py-2">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 block mb-0.5">
                                Partner 1
                              </span>
                              <span className="text-slate-700 font-medium">
                                {qLabel(answers1, q.id)}
                              </span>
                            </div>
                            <div className="rounded-lg bg-white/80 border border-slate-100 px-3 py-2">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 block mb-0.5">
                                Partner 2
                              </span>
                              <span className="text-slate-700 font-medium">
                                {qLabel(answers2, q.id)}
                              </span>
                            </div>
                          </div>
                          {!same && (
                            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed flex items-start gap-1.5">
                              <i
                                className="fa-solid fa-circle-info text-amber-600 mt-0.5 shrink-0"
                                aria-hidden="true"
                              />
                              <span>{QUESTION_MEANING[q.id]}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <a href="#lab" className="result-link-card">
                    <i className="fa-solid fa-sliders text-indigo-600 mb-2" aria-hidden="true" />
                    <span className="font-semibold text-slate-800">Test with your numbers</span>
                    <span className="text-xs text-slate-500 mt-1">Adjust the split & assumptions</span>
                  </a>
                  <a href="#compare" className="result-link-card">
                    <i className="fa-solid fa-table-columns text-blue-600 mb-2" aria-hidden="true" />
                    <span className="font-semibold text-slate-800">Review side-by-side</span>
                    <span className="text-xs text-slate-500 mt-1">Option cards & features</span>
                  </a>
                  <a href="#tax" className="result-link-card">
                    <i className="fa-solid fa-chart-column text-emerald-600 mb-2" aria-hidden="true" />
                    <span className="font-semibold text-slate-800">Inspect the tax math</span>
                    <span className="text-xs text-slate-500 mt-1">Gross vs net income</span>
                  </a>
                  <a href="#real" className="result-link-card">
                    <i className="fa-solid fa-gauge-high text-amber-600 mb-2" aria-hidden="true" />
                    <span className="font-semibold text-slate-800">Real return path</span>
                    <span className="text-xs text-slate-500 mt-1">After tax & inflation</span>
                  </a>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={goBack} className="btn-ghost">
                    <i className="fa-solid fa-arrow-left mr-2 text-xs" aria-hidden="true" />
                    Edit Partner 2’s answers
                  </button>
                  <button type="button" onClick={resetGuide} className="btn-secondary-light">
                    <i className="fa-solid fa-rotate-left mr-2 text-xs" aria-hidden="true" />
                    Start over
                  </button>
                </div>

                <p className="mt-6 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
                  Scoring is transparent and rule-based. The suggested split is weighted by how strongly
                  each partner’s answers lean toward each option — it is a starting point for a
                  conversation, not financial advice.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Scenario Lab */}
        <section id="lab" className="scroll-mt-20 mb-20">
          <div className="section-header">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="section-kicker">
                <i className="fa-solid fa-sliders mr-1.5" aria-hidden="true" />
                Scenario Lab
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wide">
                Data as of Aug 2026
              </span>
            </div>
            <h2 className="section-title">Put in your own numbers</h2>
            <p className="section-desc">
              The analysis above assumes $460,000, top brackets, and 2.5% inflation. Move the sliders
              to see after-tax and real outcomes update live — the decision can flip.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Inputs */}
            <div className="lg:col-span-2">
              <div className="section-card p-6 md:p-7">
                <h3 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
                  <i className="fa-solid fa-sliders text-blue-600" aria-hidden="true" />
                  Assumptions
                </h3>
                <div className="space-y-6">
                  <RangeField
                    label="Principal"
                    value={lab.principal}
                    min={100000}
                    max={2000000}
                    step={10000}
                    display={fmtUSD(lab.principal)}
                    minLabel="$100k"
                    maxLabel="$2M"
                    onChange={(v) => setLab((p) => ({ ...p, principal: v }))}
                  />
                  <RangeField
                    label="Marginal federal rate"
                    value={lab.fed}
                    min={0}
                    max={40}
                    step={0.5}
                    display={fmtPct(lab.fed, 1)}
                    minLabel="0%"
                    maxLabel="40%"
                    onChange={(v) => setLab((p) => ({ ...p, fed: v }))}
                  />
                  <RangeField
                    label="State income tax rate"
                    value={lab.state}
                    min={0}
                    max={13.5}
                    step={0.1}
                    display={fmtPct(lab.state, 1)}
                    minLabel="0%"
                    maxLabel="13.5%"
                    onChange={(v) => setLab((p) => ({ ...p, state: v }))}
                  />
                  <RangeField
                    label="Inflation assumption"
                    value={lab.inflation}
                    min={0}
                    max={6}
                    step={0.1}
                    display={fmtPct(lab.inflation, 1)}
                    minLabel="0%"
                    maxLabel="6%"
                    onChange={(v) => setLab((p) => ({ ...p, inflation: v }))}
                  />
                </div>

                <div
                  className={`mt-6 rounded-xl border p-4 text-sm ${
                    uninsured > 0
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-emerald-200 bg-emerald-50'
                  }`}
                  role="status"
                >
                  <div className="flex items-start gap-3">
                    <i
                      className={`fa-solid ${
                        uninsured > 0 ? 'fa-triangle-exclamation text-amber-600' : 'fa-shield-halved text-emerald-600'
                      } mt-0.5`}
                      aria-hidden="true"
                    />
                    <div>
                      <strong className="block text-slate-900">
                        {uninsured > 0
                          ? `${fmtUSD(uninsured)} above the FDIC limit in a single name`
                          : 'Fully covered by FDIC'}
                      </strong>
                      <span className="text-slate-600">
                        FDIC covers up to {fmtUSD(FDIC_LIMIT)} per depositor, per bank, per ownership
                        category (fdic.gov). If this money is held in one person’s name,{' '}
                        {fmtUSD(Math.max(0, lab.principal - FDIC_LIMIT))} is uninsured. Held as a
                        joint account, each co-owner is covered up to {fmtUSD(FDIC_LIMIT)} — so up to{' '}
                        {fmtUSD(FDIC_LIMIT * 2)} is protected.
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-5 text-xs text-slate-500 leading-relaxed">
                  Tax model: CD interest is ordinary income (fed + state + 3.8% NIIT when fed ≥ 32%).
                  Portfolio: SGOV (40%) taxed on fed + NIIT, state-exempt; CMF (40%) fully exempt; SCHD
                  (20%) at qualified rate + state + NIIT. Yields are held constant at 4.50% (CD) and
                  3.38% (portfolio, blended 30-day SEC yield) — see sources at the bottom of the page.
                </p>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-3 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="section-card p-6 border-t-4 border-t-emerald-500">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-900">Bank CD</h4>
                    <span className="badge bg-emerald-50 text-emerald-800 border-emerald-200">4.50%</span>
                  </div>
                  <dl className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Effective tax</dt>
                      <dd className="font-semibold text-slate-800 tabular-nums">{fmtPct(labEffCD * 100)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Net retention</dt>
                      <dd className="font-semibold text-slate-800 tabular-nums">{fmtPct((1 - labEffCD) * 100)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Gross annual</dt>
                      <dd className="font-semibold text-slate-800 tabular-nums">{fmtUSD(labGrossCD)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2.5">
                      <dt className="text-slate-500">Net annual</dt>
                      <dd className="font-bold text-emerald-700 tabular-nums">{fmtUSD(labNetCD)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Net / 2 yrs</dt>
                      <dd className="font-bold text-emerald-700 tabular-nums">{fmtUSD(labNetCD * 2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Net yield</dt>
                      <dd className="font-semibold text-slate-800 tabular-nums">{fmtPct(labYieldCD)}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-slate-500">Real yield</dt>
                      <dd
                        className={`font-bold tabular-nums ${
                          labRealCD >= 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {labRealCD >= 0 ? '+' : ''}
                        {fmtPct(labRealCD)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="section-card p-6 border-t-4 border-t-blue-500">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-900">40/40/20 Portfolio</h4>
                    <span className="badge bg-blue-50 text-blue-800 border-blue-200">3.38%</span>
                  </div>
                  <dl className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Effective tax</dt>
                      <dd className="font-semibold text-slate-800 tabular-nums">{fmtPct(labEffPort * 100)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Net retention</dt>
                      <dd className="font-semibold text-slate-800 tabular-nums">{fmtPct((1 - labEffPort) * 100)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Gross annual</dt>
                      <dd className="font-semibold text-slate-800 tabular-nums">{fmtUSD(labGrossPort)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2.5">
                      <dt className="text-slate-500">Net annual</dt>
                      <dd className="font-bold text-blue-700 tabular-nums">{fmtUSD(labNetPort)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Net / 2 yrs</dt>
                      <dd className="font-bold text-blue-700 tabular-nums">{fmtUSD(labNetPort * 2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Net yield</dt>
                      <dd className="font-semibold text-slate-800 tabular-nums">{fmtPct(labYieldPort)}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-slate-500">Real yield</dt>
                      <dd
                        className={`font-bold tabular-nums ${
                          labRealPort >= 0 ? 'text-emerald-700' : 'text-red-600'
                        }`}
                      >
                        {labRealPort >= 0 ? '+' : ''}
                        {fmtPct(labRealPort)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div
                className={`rounded-xl border px-4 py-3 text-sm font-semibold flex items-center gap-2.5 ${
                  labWinner === 'A'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-blue-200 bg-blue-50 text-blue-900'
                }`}
              >
                <i
                  className={`fa-solid ${
                    labWinner === 'A' ? 'fa-building-columns text-emerald-600' : 'fa-layer-group text-blue-600'
                  }`}
                  aria-hidden="true"
                />
                {labWinner === 'A'
                  ? `The CD keeps more purchasing power at these settings (+${fmtPct(labRealCD)} vs ${labRealPort >= 0 ? '+' : ''}${fmtPct(labRealPort)}).`
                  : `The portfolio keeps more purchasing power at these settings (+${fmtPct(labRealPort)} vs ${labRealCD >= 0 ? '+' : ''}${fmtPct(labRealCD)}).`}
              </div>

              <div className="section-card p-6 md:p-7">
                <BreakEvenGauge state={lab.state} fed={lab.fed} />
              </div>

              <div className="section-card overflow-hidden">
                <div className="p-6 pb-3 md:p-7 md:pb-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-amber-600" aria-hidden="true" />
                    What could go wrong
                  </h3>
                  <p className="text-sm text-slate-600 mt-1.5">
                    One-time impacts on the money you put in — not returns. The CD is guaranteed only if
                    held to maturity; the portfolio is never guaranteed.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table" aria-label="Stress scenario principal impacts">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th scope="col" className="text-slate-700">Scenario</th>
                        <th scope="col" className="text-slate-700">Principal impact</th>
                        <th scope="col" className="text-slate-700">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stressRows.map((row) => (
                        <tr key={row.label}>
                          <td className="font-medium text-slate-700">{row.label}</td>
                          <td className={`font-semibold tabular-nums ${row.impact < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                            {fmtUSD(row.impact)}
                            <span className="text-xs text-slate-500 font-normal block mt-0.5">
                              {fmtPct((row.impact / lab.principal) * 100)} of principal
                            </span>
                          </td>
                          <td className="text-slate-600">{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 pb-6 md:px-7 md:pb-7">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Also consider: the CD faces reinvestment risk at maturity (your 2028 renewal rate
                    is unknown), while the portfolio’s income can vary and its stock sleeve can stay
                    depressed for longer than 24 months. ETFs at a brokerage are protected by SIPC
                    against broker failure, not against market losses.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Compare options */}
        <section id="compare" className="scroll-mt-20 mb-20">
          <div className="section-header">
            <div className="section-kicker">Side-by-side</div>
            <h2 className="section-title">The two choices, in plain English</h2>
            <p className="section-desc">
              Same amount of money. Different safety, taxes, and access. Neither is universally
              “better” — it depends on what matters to you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <article className="option-card option-card-a">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
                    Option A
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">Bank CD</h3>
                </div>
                <div className="badge bg-emerald-50 text-emerald-800 border-emerald-200">
                  <i className="fa-solid fa-building-columns mr-1.5" aria-hidden="true" />
                  4.50% APY
                </div>
              </div>
              <p className="text-slate-700 mb-3 leading-relaxed">
                <strong className="text-slate-900">Plain English:</strong> like a 2-year savings
                account with a locked rate. The bank promises your money back, but the tax on its
                interest is high.
              </p>
              <p className="text-slate-700 mb-6 leading-relaxed">
                A time deposit with a fixed term. FDIC-protected up to $250,000 per person per bank —
                above that, not guaranteed.
              </p>
              <ul className="space-y-4">
                {[
                  {
                    icon: 'fa-check',
                    title: 'Safety',
                    text: 'The original amount is guaranteed if held to maturity.',
                  },
                  {
                    icon: 'fa-scale-unbalanced',
                    title: 'Taxes',
                    text: 'Interest taxed as ordinary income — high brackets keep less.',
                  },
                  {
                    icon: 'fa-lock',
                    title: 'Access',
                    text: 'Early access usually costs 3–6 months of interest.',
                  },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3 text-sm">
                    <span className="feature-icon feature-icon-a" aria-hidden="true">
                      <i className={`fa-solid ${item.icon} text-xs`} />
                    </span>
                    <span>
                      <strong className="text-slate-900">{item.title}:</strong>{' '}
                      <span className="text-slate-700">{item.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="option-card option-card-b">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">
                    Option B
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">40/40/20 Portfolio</h3>
                </div>
                <div className="badge bg-blue-50 text-blue-800 border-blue-200">
                  <i className="fa-solid fa-layer-group mr-1.5" aria-hidden="true" />
                  3.38% Yield
                </div>
              </div>
              <p className="text-slate-700 mb-3 leading-relaxed">
                <strong className="text-slate-900">Plain English:</strong> a mix of bond funds and
                dividend-paying stocks. No promise on the value, but the income is taxed far less.
              </p>
              <p className="text-slate-700 mb-6 leading-relaxed">
                Three funds: SGOV (short-term Treasuries), CMF (California bonds), SCHD (dividend
                stocks). Value moves up and down daily.
              </p>
              <ul className="space-y-4">
                {[
                  {
                    icon: 'fa-shield-halved',
                    title: 'Taxes',
                    text: 'Much lighter — CA bonds are fully tax-exempt; most income is state-exempt.',
                  },
                  {
                    icon: 'fa-money-bill-transfer',
                    title: 'Access',
                    text: 'Can sell any trading day — no bank penalty.',
                  },
                  {
                    icon: 'fa-chart-line',
                    title: 'Safety',
                    text: 'No guarantee — the value moves with markets.',
                  },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3 text-sm">
                    <span className="feature-icon feature-icon-b" aria-hidden="true">
                      <i className={`fa-solid ${item.icon} text-xs`} />
                    </span>
                    <span>
                      <strong className="text-slate-900">{item.title}:</strong>{' '}
                      <span className="text-slate-700">{item.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {/* Tax reality */}
        <section id="tax" className="scroll-mt-20 mb-20">
          <div className="section-header">
            <div className="section-kicker">Tax Reality</div>
            <h2 className="section-title">The headline rate is not what you keep</h2>
            <p className="section-desc">
              The CD pays more on paper (4.50% vs 3.38%), but its interest is taxed heavily. The chart
              and table show what you actually keep each year from $460,000.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 items-stretch">
            <div className="section-card p-6 md:p-8 flex flex-col">
              <h3 className="text-base font-semibold mb-4 text-center text-slate-700">
                Annual Income: Gross vs. Net (on $460k)
              </h3>
              <div className="relative flex-1 min-h-[280px]">
                <canvas
                  ref={chartRef}
                  aria-label="Bar chart comparing gross and net annual income for Option A CD and Option B Portfolio"
                  role="img"
                />
              </div>
            </div>

            <div className="section-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table" aria-label="Annual income comparison chart data">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th scope="col" className="text-slate-700">Tax Component</th>
                      <th scope="col" className="text-emerald-700">Option A (CD)</th>
                      <th scope="col" className="text-blue-700">Option B (Portfolio)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="font-medium text-slate-700">How the income is taxed</td>
                      <td className="text-slate-700">Ordinary income (highest rates)</td>
                      <td className="text-slate-700">Tax-exempt / qualified (low rates)</td>
                    </tr>
                    <tr>
                      <td className="font-medium text-slate-700">Marginal Fed Rate + NIIT</td>
                      <td className="text-slate-700">Up to 40.8%</td>
                      <td className="text-slate-700">0.0% (CMF) / 23.8% (SCHD)</td>
                    </tr>
                    <tr>
                      <td className="font-medium text-slate-700">CA FTB Marginal Rate</td>
                      <td className="text-slate-700">Up to 13.3%</td>
                      <td className="text-slate-700">0.0% (SGOV, CMF) / 13.3%</td>
                    </tr>
                    <tr>
                      <td className="font-medium text-slate-700">Effective all-in tax rate</td>
                      <td className="text-slate-700">54.1%</td>
                      <td className="text-slate-700">23.7%</td>
                    </tr>
                    <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                      <td className="text-slate-900">What you keep</td>
                      <td className="text-emerald-700">~46% of the interest</td>
                      <td className="text-blue-700">~76% of the income</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* 24-month horizon */}
        <section id="horizon" className="scroll-mt-20 mb-20">
          <div className="section-header">
            <div className="section-kicker">Execution Horizon</div>
            <h2 className="section-title">The full 2-year picture on $460,000</h2>
            <p className="section-desc">
              August 2026 → August 2028, holding today’s rates steady for a fair comparison.
            </p>
          </div>

          <div className="section-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table" aria-label="24-month projection comparison">
                <thead>
                  <tr className="bg-slate-800 text-white border-b border-slate-700">
                    <th scope="col" className="text-slate-100">Metric</th>
                    <th scope="col" className="text-emerald-300">Option A: 4.5% CD</th>
                    <th scope="col" className="text-blue-300">Option B: 40/40/20</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="font-medium text-slate-700">Total gross income (2 yrs)</td>
                    <td className="text-slate-700">
                      $41,400{' '}
                      <span className="text-xs text-slate-500 block mt-0.5">(Guaranteed)</span>
                    </td>
                    <td className="text-slate-700">
                      $31,096{' '}
                      <span className="text-xs text-slate-500 block mt-0.5">(Estimated, not guaranteed)</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-700">Estimated tax (Fed + CA)</td>
                    <td className="text-red-600">
                      −$22,397{' '}
                      <span className="text-xs text-slate-500 block mt-0.5">(Ordinary income)</span>
                    </td>
                    <td className="text-red-600">
                      −$7,382{' '}
                      <span className="text-xs text-slate-500 block mt-0.5">(Tax-exempt / qualified)</span>
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-bold border-y-2 border-slate-200">
                    <td className="text-slate-900">What you keep (2 yrs)</td>
                    <td className="text-emerald-700">
                      $19,003{' '}
                      <span className="text-xs font-normal text-slate-500 block mt-0.5">
                        About 2.07% per year after tax
                      </span>
                    </td>
                    <td className="text-blue-700">
                      $23,714{' '}
                      <span className="text-xs font-normal text-slate-500 block mt-0.5">
                        About 2.58% per year after tax
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-700">Access to the money</td>
                    <td className="text-slate-700">
                      Locked until Aug 2028. Early exit forfeits ~$5,175 (about 3 months of interest).
                    </td>
                    <td className="text-slate-700">
                      Can sell any trading day — no penalty.
                    </td>
                  </tr>
                  <tr>
                    <td className="font-medium text-slate-700">Original amount in Aug 2028</td>
                    <td className="text-slate-700">
                      Exactly $460,000. But inflation makes it buy less than today.
                    </td>
                    <td className="text-slate-700">
                      Variable. The bond funds stay fairly stable; the stock portion will have moved.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Real return */}
        <section id="real" className="scroll-mt-20 mb-20">
          <div className="section-header">
            <div className="section-kicker">Purchasing Power</div>
            <h2 className="section-title">After taxes AND inflation, what’s left?</h2>
            <p className="section-desc">
              Prices rise about 2.5% a year. Subtract that from your after-tax yield to see if your
              money is really growing. The result is sensitive to assumptions — explore it in the
              Scenario Lab.
            </p>
          </div>

          <div className="section-card p-6 md:p-10">
            <div className="grid md:grid-cols-3 gap-4 md:gap-6 text-center mb-8">
              <div className="step-card">
                <div className="step-num">1</div>
                <div className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">
                  Stated rate
                </div>
                <div className="text-base text-slate-700 mb-1">
                  Option A: <span className="font-bold text-slate-900 tabular-nums">4.50%</span>
                </div>
                <div className="text-base text-slate-700">
                  Option B: <span className="font-bold text-slate-900 tabular-nums">3.38%</span>
                </div>
              </div>
              <div className="step-card relative">
                <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 text-slate-300" aria-hidden="true">
                  <i className="fa-solid fa-chevron-right text-xl" />
                </div>
                <div className="step-num">2</div>
                <div className="text-sm font-semibold text-slate-600 mb-4 uppercase tracking-wide">
                  After tax
                </div>
                <div className="text-base text-emerald-700 mb-1">
                  Option A: <span className="font-bold tabular-nums">~2.07%</span>
                </div>
                <div className="text-base text-blue-700">
                  Option B: <span className="font-bold tabular-nums">~2.58%</span>
                </div>
              </div>
              <div className="step-card-highlight text-white">
                <div className="hidden md:block absolute -left-4 top-1/2 -translate-y-1/2 text-slate-500 z-0" aria-hidden="true">
                  <i className="fa-solid fa-chevron-right text-2xl" />
                </div>
                <div className="step-num step-num-dark">3</div>
                <div className="text-sm font-bold text-white mb-4 uppercase tracking-wide relative z-10">
                  After tax AND inflation
                </div>
                <div className="text-lg text-red-200 font-bold mb-3 relative z-10">
                  Option A: −0.43%{' '}
                  <span className="text-xs font-normal block text-slate-300 mt-1">
                    Your money buys less each year — guaranteed
                  </span>
                </div>
                <div className="text-lg text-emerald-200 font-bold border-t border-slate-600 pt-3 relative z-10">
                  Option B: +0.08%{' '}
                  <span className="text-xs font-normal block text-slate-300 mt-1">
                    Roughly preserves purchasing power at top brackets
                  </span>
                </div>
              </div>
            </div>
            <div className="p-5 md:p-6 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm text-slate-700 leading-relaxed">
                <i className="fa-solid fa-microscope text-slate-500 mr-2" aria-hidden="true" />
                <strong className="text-slate-900">What this means:</strong> at top-bracket taxes and
                2.5% inflation, the CD’s buying power shrinks ~0.4% per year, while the portfolio roughly
                holds its own (+0.08%). That margin is thin and depends on your tax rates, inflation, and
                actual yields — use the Scenario Lab to see how it changes for you.
              </p>
            </div>
          </div>
        </section>

        {/* Components */}
        <section id="components" className="scroll-mt-20 mb-20">
          <div className="section-header">
            <div className="section-kicker">Portfolio Architecture</div>
            <h2 className="section-title">What’s inside the 40 / 40 / 20 portfolio</h2>
            <p className="section-desc">
              Three funds, each with a different job, risk, and tax treatment.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {[
              {
                ticker: 'SGOV',
                pct: '40%',
                amount: '$184,000',
                name: 'Short-term US Treasury bonds (0–3 months)',
                items: [
                  {
                    icon: 'fa-bullseye',
                    title: 'Its job',
                    text: 'A safe home for cash — the closest thing to a CD inside this portfolio.',
                  },
                  {
                    icon: 'fa-shield',
                    title: 'Risk',
                    text: 'Very low. Bonds mature in under 90 days. Backed by the US government.',
                  },
                  {
                    icon: 'fa-scale-unbalanced',
                    title: 'Taxes',
                    text: 'Taxed federally, but 100% free of California state tax.',
                  },
                  {
                    icon: 'fa-chart-simple',
                    title: 'Today (Aug 2026)',
                    text: '30-day SEC yield 3.59% · 0.09% expense ratio · duration ≈0.1 yr (iShares).',
                  },
                ],
              },
              {
                ticker: 'CMF',
                pct: '40%',
                amount: '$184,000',
                name: 'California municipal bonds',
                items: [
                  {
                    icon: 'fa-bullseye',
                    title: 'Its job',
                    text: 'Tax-free income — the portfolio’s biggest tax advantage.',
                  },
                  {
                    icon: 'fa-chart-line',
                    title: 'Risk',
                    text: 'Moderate. Bond prices move with interest rates; effective duration ≈6.4 years (iShares, Aug 2026).',
                  },
                  {
                    icon: 'fa-scale-unbalanced',
                    title: 'Taxes',
                    text: '100% free of federal AND California tax. Skips the 3.8% NIIT entirely.',
                  },
                  {
                    icon: 'fa-chart-simple',
                    title: 'Today (Aug 2026)',
                    text: '30-day SEC yield 3.25% · 0.08% expense ratio · 1,681 holdings (iShares).',
                  },
                ],
              },
              {
                ticker: 'SCHD',
                pct: '20%',
                amount: '$92,000',
                name: 'US dividend-paying stocks',
                items: [
                  {
                    icon: 'fa-bullseye',
                    title: 'Its job',
                    text: 'Income and long-term inflation defense via established US dividend payers.',
                  },
                  {
                    icon: 'fa-triangle-exclamation',
                    title: 'Risk',
                    text: 'Highest risk of the three — stock values move with the market.',
                  },
                  {
                    icon: 'fa-scale-unbalanced',
                    title: 'Taxes',
                    text: 'Dividends taxed at the lower qualified rate (15–20%), not up to 40.8%.',
                  },
                  {
                    icon: 'fa-chart-simple',
                    title: 'Today (Aug 2026)',
                    text: '30-day SEC yield 3.20% · 0.06% expense ratio · tracks ~100 companies with 10+ consecutive years of dividends (Schwab).',
                  },
                ],
              },
            ].map((fund) => (
              <article key={fund.ticker} className="section-card overflow-hidden flex flex-col">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 p-5 border-b border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-bold text-slate-900 text-lg">{fund.ticker}</h3>
                      <span className="text-sm font-semibold text-slate-500">{fund.pct}</span>
                    </div>
                    <span className="highlight-badge bg-white border border-slate-200 text-slate-700">
                      {fund.amount}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{fund.name}</p>
                </div>
                <div className="p-5 flex-grow">
                  <ul className="space-y-4 text-sm text-slate-700">
                    {fund.items.map((item) => (
                      <li key={item.title}>
                        <strong className="text-slate-900 block mb-1">
                          <i className={`fa-solid ${item.icon} text-blue-600 w-5`} aria-hidden="true" />{' '}
                          {item.title}
                        </strong>
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Glossary */}
        <section id="glossary" className="scroll-mt-20 mb-20">
          <div className="section-header">
            <div className="section-kicker">
              <i className="fa-solid fa-book-open mr-1.5" aria-hidden="true" />
              Plain-English Glossary
            </div>
            <h2 className="section-title">Every finance word, explained simply</h2>
            <p className="section-desc">
              No jargon required. Browse by topic or search — each card uses everyday language and a
              concrete example from this comparison.
            </p>
          </div>

          <div className="glossary-shell">
            <div className="glossary-toolbar">
              <div className="glossary-search">
                <i className="fa-solid fa-magnifying-glass glossary-search-icon" aria-hidden="true" />
                <label htmlFor="glossary-search" className="sr-only">
                  Search glossary
                </label>
                <input
                  id="glossary-search"
                  type="search"
                  className="glossary-search-input"
                  placeholder="Search terms — e.g. FDIC, yield, tax…"
                  value={glossaryQuery}
                  onChange={(e) => setGlossaryQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="glossary-filters" role="group" aria-label="Filter by topic">
                {GLOSSARY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`glossary-filter ${
                      glossaryCat === cat.id ? 'glossary-filter-active' : ''
                    }`}
                    aria-pressed={glossaryCat === cat.id}
                    onClick={() => setGlossaryCat(cat.id)}
                  >
                    <i className={`fa-solid ${cat.icon} text-[10px] opacity-80`} aria-hidden="true" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="glossary-body">
              {glossaryByCategory.length === 0 ? (
                <div className="glossary-empty">
                  <div className="glossary-empty-icon" aria-hidden="true">
                    <i className="fa-solid fa-book" />
                  </div>
                  <p className="font-semibold text-slate-800 mb-1">No matching terms</p>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    Try a different word, or clear the search to see all {GLOSSARY_TERMS.length}{' '}
                    definitions.
                  </p>
                  {(glossaryQuery || glossaryCat !== 'all') && (
                    <button
                      type="button"
                      className="btn-secondary-light mt-5"
                      onClick={() => {
                        setGlossaryQuery('');
                        setGlossaryCat('all');
                      }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                glossaryByCategory.map(({ cat, meta, terms }) => (
                  <div key={cat}>
                    <div className="glossary-category-label">
                      <span className={`glossary-category-dot ${meta.color}`} aria-hidden="true" />
                      <h3 className="glossary-category-title">{meta.label}</h3>
                      <span className="glossary-category-count">
                        {terms.length} {terms.length === 1 ? 'term' : 'terms'}
                      </span>
                    </div>
                    <div className="glossary-grid">
                      {terms.map((item) => (
                        <article
                          key={item.id}
                          className={`glossary-card glossary-cat-${item.category}`}
                        >
                          <span className="glossary-card-icon" aria-hidden="true">
                            <i className={`fa-solid ${item.icon}`} />
                          </span>
                          <div className="glossary-card-body">
                            <h4 className="glossary-card-term">{item.term}</h4>
                            {item.aka && (
                              <span className="glossary-card-aka">{item.aka}</span>
                            )}
                            <p className="glossary-card-def">{item.def}</p>
                            {item.example && (
                              <p className="glossary-card-example">
                                <strong>Example:</strong> {item.example}
                              </p>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 md:px-6 py-4 border-t border-slate-100 bg-slate-50/80">
              <p className="text-xs text-slate-500 leading-relaxed text-center">
                Showing {filteredGlossary.length} of {GLOSSARY_TERMS.length} terms · Definitions are
                educational summaries, not legal or tax advice
              </p>
            </div>
          </div>
        </section>

        {/* Sources */}
        <section id="sources" className="scroll-mt-20 mb-16">
          <div className="section-header">
            <div className="section-kicker">Reference Library</div>
            <h2 className="section-title">Primary sources & methodology</h2>
            <p className="section-desc">
              The rules, definitions, and independent research behind this comparison.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                href: 'https://www.schwab.com/learn/story/fixed-income-frequently-asked-questions',
                icon: 'fa-scale-unbalanced',
                title: 'Charles Schwab: Fixed Income FAQ — Tax-Equivalent Yield',
                desc: 'Schwab explains tax-equivalent yield and why munis can beat taxable bonds for top-bracket investors (37% + 3.8% NIIT).',
                cta: 'Read Analysis',
                tone: 'blue',
              },
              {
                href: 'https://www.fidelity.com/learning-center/trading-investing/guide-to-municipal-bonds',
                icon: 'fa-landmark-flag',
                title: 'Fidelity: Your Complete Guide to Municipal Bonds',
                desc: 'How tax-free muni bonds work, their risks, and who benefits most — especially residents of high-tax states.',
                cta: 'Read Guide',
                tone: 'emerald',
              },
              {
                href: 'https://www.irs.gov/individuals/net-investment-income-tax',
                icon: 'fa-landmark-dome',
                title: 'IRS: Net Investment Income Tax (IRC § 1411)',
                desc: 'The official 3.8% NIIT rules under IRC § 1411, including the MAGI thresholds ($250k MFJ) that trigger it.',
                cta: 'Read Regulation',
                tone: 'slate',
              },
              {
                href: 'https://www.irs.gov/publications/p936',
                icon: 'fa-house-chimney',
                title: 'IRS Pub 936 & IRC § 163(h): Mortgage Interest & Recast',
                desc: 'Official IRS rules on $750k acquisition mortgage debt limit (Schedule A) and re-amortization deductions.',
                cta: 'Read IRS Pub 936',
                tone: 'indigo',
              },
              {
                href: 'https://www.ftb.ca.gov/forms/2024/2024-540-booklet.html',
                icon: 'fa-building-columns',
                title: 'California FTB Form 540 & RTC § 17201 Rules',
                desc: 'Official FTB tax booklet specifying CA $1,000,000 mortgage interest deduction limit and state SALT exemption.',
                cta: 'Read FTB Form 540',
                tone: 'emerald',
              },
              {
                href: 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2025',
                icon: 'fa-file-invoice-dollar',
                title: 'IRS Rev. Proc. 2024-40: 2026 Standard Deduction',
                desc: 'Official IRS release establishing the $29,200 Federal Standard Deduction for Married Filing Jointly.',
                cta: 'Read Release',
                tone: 'purple',
              },
              {
                href: 'https://www.ftb.ca.gov/forms/2024/2024-5805.pdf',
                icon: 'fa-shield-halved',
                title: 'IRS § 6654 & CA FTB Form 5805: Safe Harbor Rule',
                desc: 'Statutory 90% current year / 110% prior year underpayment protection rules to avoid IRS & FTB penalties.',
                cta: 'Read FTB Form 5805',
                tone: 'amber',
              },
              {
                href: 'https://www.irs.gov/newsroom/401k-limit-increases-to-23500-for-2025-contrib-limits-for-iras-remain-7000',
                icon: 'fa-piggy-bank',
                title: '26 U.S.C. § 402(g) & IRS Notice: 401(k) Limits',
                desc: 'Official 2026 pre-tax 401(k) elective deferral limit ($23,500 standard / $31,000 catch-up for age 50+).',
                cta: 'Read 401(k) Limits',
                tone: 'blue',
              },
              {
                href: 'https://www.fdic.gov/resources/deposit-insurance/faq',
                icon: 'fa-shield-cat',
                title: 'FDIC: Deposit Insurance FAQ',
                desc: 'The official $250,000 coverage limit per depositor per bank, and joint account coverage rules.',
                cta: 'Read FDIC FAQ',
                tone: 'purple',
              },
            ].map((card) => (
              <a
                key={card.href}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                className="link-card group"
                data-tone={card.tone}
              >
                <div className={`icon-box icon-box-${card.tone}`}>
                  <i className={`fa-solid ${card.icon} text-xl`} aria-hidden="true" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-600 mb-4 flex-grow leading-relaxed">{card.desc}</p>
                <div className="text-sm font-semibold text-blue-700 flex items-center mt-auto">
                  {card.cta}{' '}
                  <i
                    className="fa-solid fa-arrow-up-right-from-square ml-1.5 text-[10px] opacity-70"
                    aria-hidden="true"
                  />
                </div>
              </a>
            ))}
          </div>
        </section>

        <footer className="site-footer">
          <div className="footer-brand">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-blue-900 text-white shadow-sm">
              <i className="fa-solid fa-scale-balanced text-xs" aria-hidden="true" />
            </span>
            <div>
              <div className="font-bold text-slate-800 text-sm">Capital Decision Guide</div>
              <div className="text-xs text-slate-500">Objective · Plain English · No sales pitch</div>
            </div>
          </div>
          <div className="max-w-3xl">
            <p className="font-bold mb-3 text-slate-500 text-sm uppercase tracking-wide">
              Sources, Statutory Methodology & Data As-Of Dates
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-slate-500 leading-relaxed">
              <li>
                <strong className="text-slate-600">Tax model (illustrative top-bracket scenario):</strong>{' '}
                CD interest taxed at federal + state + 3.8% NIIT (when federal ≥ 32%). Portfolio taxed
                per fund: SGOV (40%) at federal + NIIT (state-exempt under 31 U.S.C. § 3124), CMF (40%) fully exempt under IRC § 103 & CA RTC § 17133, SCHD (20%)
                at qualified rate + state + NIIT under IRC § 1(h)(11). Top rates used in the default scenario: 37% federal
                (applies above ~$609k single / ~$731k married filing jointly under 26 U.S.C. § 1) and 13.3% California
                (12.3% top bracket plus a 1% surcharge on income over $1M under CA RTC § 17041). The Scenario Lab lets you
                adjust both. Sources:{' '}
                <a href="https://www.irs.gov/individuals/net-investment-income-tax" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">IRS NIIT Guide</a>,{' '}
                <a href="https://www.ftb.ca.gov/forms/2024/2024-540-booklet.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">CA FTB Form 540</a>,{' '}
                <a href="https://www.law.cornell.edu/uscode/text/26/163" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">IRC § 163(h)</a>.
              </li>
              <li>
                <strong className="text-slate-600">CD rate & Treasury Benchmarks:</strong> 4.50% APY is the top national
                offer as of August 2026 (<a href="https://www.treasurydirect.gov/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">TreasuryDirect</a> & Popular Direct 3-yr & 5-yr, Bread Savings
                18-month). Typical 2-year terms pay ≈4.1–4.4%. If the CD pays 4.30% instead
                of 4.50%, the 2-year net drops from ≈$19,000 to ≈$18,200.
              </li>
              <li>
                <strong className="text-slate-600">Portfolio yield:</strong> 3.38% is the blended
                30-day SEC yield of the three funds, weighted 40/40/20, as of early August 2026 — SGOV
                3.59% (<a href="https://www.ishares.com/us/products/314116/ishares-0-3-month-treasury-bond-etf" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">iShares SGOV</a>), CMF 3.25% (<a href="https://www.ishares.com/us/products/239734/ishares-california-amtfree-muni-bond-etf" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">iShares CMF</a>), SCHD 3.20% (<a href="https://www.schwabassetmanagement.com/products/schd" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">Schwab SCHD</a>). SEC yields are snapshots and will change.
              </li>
              <li>
                <strong className="text-slate-600">FDIC coverage:</strong> up to $250,000 per
                depositor, per FDIC-insured bank, per ownership category (<a href="https://www.fdic.gov/resources/deposit-insurance/faq" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">FDIC Deposit Insurance FAQ</a>). A joint account covers up to $250,000 per co-owner, so $460,000 can be fully
                covered if held jointly; in a single name $210,000 is uninsured.
              </li>
              <li>
                <strong className="text-slate-600">Disclaimer:</strong> This tool is for education and
                decision support only — it is not personalized financial advice. Past performance does
                not predict the future. The portfolio carries market risk; the CD carries reinvestment
                and uninsured-deposit risk above $250,000. Yields and tax rules change — verify current
                figures with a licensed professional before acting. Adjust the assumptions in the
                Scenario Lab to match your situation.
              </li>
            </ul>
          </div>
        </footer>
      </main>
      </>
      )}
    </div>
  );
};
