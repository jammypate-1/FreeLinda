import React, { useState } from 'react';
import { X, GraduationCap, ArrowRight, CheckCircle, Calculator, TrendingUp, ShieldAlert, Sparkles, Layers } from 'lucide-react';

interface DcfMasterclassModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DcfMasterclassModal: React.FC<DcfMasterclassModalProps> = ({ isOpen, onClose }) => {
  const [activeStep, setActiveStep] = useState(1);

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      title: 'Baseline Free Cash Flow (FCF)',
      icon: Calculator,
      summary: 'FCF represents the actual cash a company generates that is free to return to investors after capital expenditures (CapEx).',
      formula: 'FCF = Operating Cash Flow - Capital Expenditures (CapEx)',
      details: [
        'Unlike accounting net income, FCF cannot be manipulated by non-cash accounting methods.',
        'It is the actual cash available to pay dividends, buy back shares, or pay down debt.',
        'In our SPCX model, we start with a normalized baseline FCF (e.g., $145M).'
      ]
    },
    {
      step: 2,
      title: 'Multi-Stage Cash Flow Growth',
      icon: TrendingUp,
      summary: 'Companies grow rapidly early on, then transition to steady economic growth rate as markets mature.',
      formula: 'FCF_t = FCF_{t-1} × (1 + CAGR_t)',
      details: [
        'Stage 1 (Years 1–5): High-growth phase driven by competitive advantage and product expansion.',
        'Stage 2 (Years 6–10): Transition phase where growth slows down towards long-term macroeconomic rates.',
        'Stage 3 (Terminal): Constant perpetual growth rate matching baseline inflation and GDP growth (~2.0%–3.0%).'
      ]
    },
    {
      step: 3,
      title: 'Discount Rate / WACC (Cost of Capital)',
      icon: Layers,
      summary: 'WACC is the required annual rate of return expected by equity holders and debt lenders.',
      formula: 'WACC = (w_e × R_e) + [w_d × R_d × (1 - Tax)]   |   R_e = R_f + (β × ERP)',
      details: [
        'A dollar received 10 years from now is worth less than a dollar today due to time value of money and risk.',
        'Cost of Equity (R_e) is computed via CAPM using Risk-Free Treasury Yield (R_f), Stock Beta (β), and Equity Risk Premium (ERP).',
        'Higher risk or higher interest rates increase WACC, reducing the present value of future cash flows.'
      ]
    },
    {
      step: 4,
      title: 'Terminal Value Calculation',
      icon: Sparkles,
      summary: 'Terminal Value captures the value of all cash flows beyond explicit projection horizon (Year 10+).',
      formula: 'Gordon Growth: TV = [FCF_10 × (1 + g)] / (WACC - g)   |   Exit Multiple: TV = FCF_10 × Multiple',
      details: [
        'Over 60%–80% of total Enterprise Value often comes from Terminal Value.',
        'Gordon Growth assumes company grows perpetually at rate g (typically 2% to 3%).',
        'Exit Multiple method values the company at a normalized multiple of Year 10 FCF or EBITDA.'
      ]
    },
    {
      step: 5,
      title: 'Net Debt & Intrinsic Share Price',
      icon: CheckCircle,
      summary: 'Convert Enterprise Value to Equity Value and divide by diluted shares outstanding.',
      formula: 'Equity Value = Enterprise Value - Total Debt + Cash   |   Fair Value = Equity Value / Shares',
      details: [
        'Enterprise Value (EV) measures the value of the entire underlying business enterprise.',
        'To find stock value, add Cash & Equivalents and subtract Total Debt (Net Debt).',
        'Dividing Equity Value by shares gives the Intrinsic Fair Value Per Share.'
      ]
    },
    {
      step: 6,
      title: 'Margin of Safety & Decision Rules',
      icon: ShieldAlert,
      summary: 'Never buy a stock right at fair value; insist on a discount (Margin of Safety) to protect against estimation error.',
      formula: 'Margin of Safety % = [(Fair Value - Current Price) / Fair Value] × 100%',
      details: [
        'Margin of Safety > 20%: Strong Buy signal (buying dollars for 80 cents).',
        'Margin of Safety between 5% and 20%: Fairly valued / Moderate Buy.',
        'Margin of Safety < -10%: Overvalued relative to projected cash flows.'
      ]
    }
  ];

  const current = steps.find(s => s.step === activeStep) || steps[0];
  const StepIcon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">DCF Valuation Masterclass</h2>
              <p className="text-xs text-slate-400">Step-by-step guide to Discounted Cash Flow valuation principles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex space-x-1.5 overflow-x-auto py-3 border-b border-slate-800/80">
          {steps.map(s => (
            <button
              key={s.step}
              onClick={() => setActiveStep(s.step)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                activeStep === s.step
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-slate-950/50 flex items-center justify-center text-[10px]">
                {s.step}
              </span>
              <span>{s.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4">
          <div className="flex items-center space-x-3 text-sky-400">
            <StepIcon className="w-6 h-6 shrink-0" />
            <h3 className="text-base font-bold text-white">Step {current.step}: {current.title}</h3>
          </div>

          <p className="text-sm text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
            {current.summary}
          </p>

          {current.formula && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 font-mono text-xs text-emerald-300">
              <span className="block text-[10px] font-sans font-semibold uppercase text-emerald-400/80 mb-1">Mathematical Formula:</span>
              {current.formula}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Principles & Application:</h4>
            <ul className="space-y-2">
              {current.details.map(detail => (
                <li key={detail} className="flex items-start space-x-2 text-xs text-slate-300">
                  <CheckCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
          <button
            disabled={activeStep === 1}
            onClick={() => setActiveStep(prev => prev - 1)}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Previous Step
          </button>

          <span className="text-xs text-slate-500 font-medium">Step {activeStep} of {steps.length}</span>

          {activeStep < steps.length ? (
            <button
              onClick={() => setActiveStep(prev => prev + 1)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 shadow-md shadow-sky-600/30 transition"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition"
            >
              Got it, let's analyze SPCX!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
