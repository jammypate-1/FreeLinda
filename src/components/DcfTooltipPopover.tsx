import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, Sparkles, BookOpen } from 'lucide-react';

export interface EducationalConcept {
  title: string;
  definition: string;
  whyItMatters: string;
  formula?: string;
  ruleOfThumb?: string;
}

interface DcfTooltipPopoverProps {
  concept: EducationalConcept;
  className?: string;
  iconSize?: number;
}

export const DcfTooltipPopover: React.FC<DcfTooltipPopoverProps> = ({
  concept,
  className = '',
  iconSize = 15
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        aria-label={`Learn about ${concept.title}`}
        className="text-slate-400 hover:text-sky-400 focus:outline-none transition-colors p-0.5 rounded-full hover:bg-sky-950/40"
      >
        <HelpCircle size={iconSize} className="shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-72 sm:w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-4 text-xs animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
            <div className="flex items-center space-x-1.5 font-bold text-sky-400">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>{concept.title}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-2.5 text-slate-300 leading-relaxed">
            <div>
              <p className="text-slate-200">{concept.definition}</p>
            </div>

            {concept.formula && (
              <div className="bg-slate-950/80 rounded-lg p-2 border border-slate-800 font-mono text-[11px] text-emerald-400">
                <span className="text-slate-500 font-sans block text-[10px] uppercase font-semibold mb-0.5">Formula:</span>
                {concept.formula}
              </div>
            )}

            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">Valuation Impact:</span>
              <p className="text-slate-300 text-[11px]">{concept.whyItMatters}</p>
            </div>

            {concept.ruleOfThumb && (
              <div className="flex items-start space-x-1.5 pt-1 text-[11px] text-amber-300 bg-amber-950/20 rounded-md p-1.5 border border-amber-500/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Pro Tip:</strong> {concept.ruleOfThumb}</span>
              </div>
            )}
          </div>

          {/* Pointer Arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-slate-900"></div>
        </div>
      )}
    </div>
  );
};
