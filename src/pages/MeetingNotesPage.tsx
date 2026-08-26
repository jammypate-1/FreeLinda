import React, { useState } from 'react';
import { FileText, Plus, ChevronDown, ChevronUp, Trash2, Calendar, Sparkles, Check, Save } from 'lucide-react';

export interface SimpleMeetingNote {
  id: string;
  date: string;
  title?: string;
  content: string;
  isExpanded?: boolean;
}

interface MeetingNotesPageProps {
  notes?: SimpleMeetingNote[];
  onSaveNotes?: (notes: SimpleMeetingNote[]) => void;
}

const defaultNotes: SimpleMeetingNote[] = [
  {
    id: 'NOTE-2026-07-30',
    date: '2026-07-30',
    title: 'Advisory Review: Early Retirement Readiness & Cash Surplus',
    content: `Meeting Date: July 30, 2026
Attendees: Jammy Pate & Linda

KEY STRATEGIC NOTES:
- Confirmed Target Retirement Date: April 2027 (Age 37).
- Net Worth is $2,870,227 across 123 stock tax lots ($2.83M) and liquid bank cash ($98,423).
- Monthly net cash surplus is +$11,166/mo including base earned income ($22,000/mo) and harvested stock tax lot proceeds ($10,000/mo equivalent).
- Action Items: Configure brokerage accounts for HIFO (Highest-Cost-Basis-First) share harvesting prior to initial $120k liquidation in April 2027.`,
    isExpanded: true
  },
  {
    id: 'NOTE-2026-07-28',
    date: '2026-07-28',
    title: 'Primary Residence Section 121 Tax Exclusion Strategy',
    content: `Meeting Date: July 28, 2026
Attendees: Jammy Pate & Linda

REAL ESTATE TAX EXCLUSION (SECTION 121):
- San Leandro Primary Residence (1945 Bradhoff Ave) valuation: $1,040,500 ($397,891 mortgage balance).
- Tax Exclusion Rule: Living in the home for at least 2 out of 5 years qualifies Linda for up to $250,000 of tax-free capital gain exclusion under IRC Section 121 upon sale.
- 3-Year Rental Window: If Linda moves out or rents the house, she can rent it out for up to 3 years (36 months) and still retain the full $250,000 capital gains tax exclusion upon sale. Renting beyond 3 years forfeits the exclusion.
- Entity Structure: No LLC needed for a single property; standard umbrella insurance policy is sufficient.`,
    isExpanded: false
  },
  {
    id: 'NOTE-2026-07-20',
    date: '2026-07-20',
    title: 'Tax Buckets & Capital Loss Offset Mechanics',
    content: `Meeting Date: July 20, 2026
Attendees: Jammy Pate & Linda

TAX CLASSIFICATIONS & LOSS HARVESTING RULES:
1. Earned Income (Salary $264k/yr): Standard graduated tax brackets + 7.65% FICA payroll taxes. Capital losses can only offset earned income up to $3,000/yr.
2. Unearned Ordinary Income (Interest/Dividends): Standard graduated brackets. No payroll taxes.
3. Short-Term Capital Gains (< 1 Yr): Standard graduated rates. Can be offset by short-term or long-term capital losses.
4. Long-Term Capital Gains (> 1 Yr): Preferential federal rates (0%, 15%, 20%) + CA state tax. Can be offset dollar-for-dollar by harvested long-term capital losses.`,
    isExpanded: false
  },
  {
    id: 'NOTE-2026-07-10',
    date: '2026-07-10',
    title: 'DCF Valuation & SGOV/FLOT Liquidity Allocation',
    content: `Meeting Date: July 10, 2026
Attendees: Jammy Pate & Linda

DCF VALUATION & LIQUIDITY STRATEGY:
- Discounted Cash Flow (DCF): "How much should I pay today for the cash this business will generate in the future?" Future cash flow is discounted due to opportunity cost.
- Ultra-Short Treasury Reserve: Lock $60,000 emergency cash buffer into SGOV (iShares 0-3 Month Treasury ETF) or FLOT (iShares Floating Rate ETF) to secure ~5.0% yield with state-tax exemption on Treasuries and zero duration risk.`,
    isExpanded: false
  }
];

export const MeetingNotesPage: React.FC<MeetingNotesPageProps> = ({
  notes,
  onSaveNotes
}) => {
  const [noteList, setNoteList] = useState<SimpleMeetingNote[]>(() => {
    if (notes && notes.length > 0) return notes;
    return defaultNotes;
  });

  const handleSave = (updated: SimpleMeetingNote[]) => {
    setNoteList(updated);
    if (onSaveNotes) onSaveNotes(updated);
  };

  const handleAddMeeting = () => {
    const today = new Date().toISOString().split('T')[0];
    const newId = `NOTE-${today}-${Date.now().toString().slice(-4)}`;

    // Collapse all existing meeting notes and prepend new meeting note at top (most recent first!)
    const updated = noteList.map(n => ({ ...n, isExpanded: false }));
    const newNote: SimpleMeetingNote = {
      id: newId,
      date: today,
      title: `Meeting Note — ${today}`,
      content: `Meeting Date: ${today}\nAttendees: Jammy Pate & Linda\n\nNOTES:\n- `,
      isExpanded: true
    };

    handleSave([newNote, ...updated]);
  };

  const handleToggleExpand = (id: string) => {
    const updated = noteList.map(n => {
      if (n.id === id) {
        return { ...n, isExpanded: !n.isExpanded };
      }
      return n;
    });
    handleSave(updated);
  };

  const handleContentChange = (id: string, newContent: string) => {
    const updated = noteList.map(n => {
      if (n.id === id) {
        return { ...n, content: newContent };
      }
      return n;
    });
    handleSave(updated);
  };

  const handleDateChange = (id: string, newDate: string) => {
    const updated = noteList.map(n => {
      if (n.id === id) {
        return { ...n, date: newDate };
      }
      return n;
    });
    // Re-sort most recent date first
    updated.sort((a, b) => b.date.localeCompare(a.date));
    handleSave(updated);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this meeting note?')) {
      const updated = noteList.filter(n => n.id !== id);
      handleSave(updated);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Advisory Journal</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-2">
            Meeting Notes & Strategy Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Chronological advisory meeting log organized by most recent first. Add a new meeting note to automatically expand the new text field and collapse prior entries.
          </p>
        </div>

        <button
          onClick={handleAddMeeting}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-sky-600/30 flex items-center space-x-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Meeting Note</span>
        </button>
      </div>

      {/* Meeting Notes Accordion Stack (Most Recent First) */}
      <div className="space-y-4">
        {noteList.map((note, index) => {
          const firstLinePreview = note.content
            .split('\n')
            .filter(l => l.trim().length > 0)[0] || 'Empty meeting note...';

          return (
            <div
              key={note.id}
              className={`border rounded-2xl overflow-hidden transition shadow-xl ${
                note.isExpanded
                  ? 'bg-slate-900 border-sky-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/20 ring-1 ring-sky-500/30'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Accordion Header Bar */}
              <div
                onClick={() => handleToggleExpand(note.id)}
                className="p-5 flex items-center justify-between cursor-pointer select-none border-b border-slate-800/80"
              >
                <div className="flex items-center space-x-4">
                  {/* Date Input / Display */}
                  <div
                    onClick={e => e.stopPropagation()}
                    className="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-sky-400"
                  >
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={note.date}
                      onChange={e => handleDateChange(note.id, e.target.value)}
                      className="bg-transparent text-sky-400 font-bold focus:outline-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <span>{note.title || `Meeting Note — ${note.date}`}</span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Latest Meeting
                        </span>
                      )}
                    </h3>
                    {!note.isExpanded && (
                      <p className="text-xs text-slate-400 truncate max-w-xl mt-0.5 font-mono">
                        {firstLinePreview}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(note.id);
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition rounded-lg hover:bg-slate-800"
                    title="Delete Meeting Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="p-1.5 text-slate-400 rounded-lg bg-slate-950 border border-slate-800">
                    {note.isExpanded ? <ChevronUp className="w-4 h-4 text-sky-400" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Free-Form Textarea Body (Rendered when Expanded) */}
              {note.isExpanded && (
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <FileText className="w-4 h-4 text-sky-400" />
                      <span>Meeting Notes & Free-Form Text Entry</span>
                    </label>
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
                      <Save className="w-3.5 h-3.5" />
                      <span>Auto-Saved</span>
                    </span>
                  </div>

                  <textarea
                    rows={12}
                    value={note.content}
                    onChange={e => handleContentChange(note.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 shadow-inner"
                    placeholder="Type meeting discussion details, key decisions, tax rules, and action items freely here..."
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Button to Add Next Meeting */}
      <div className="pt-4 flex justify-center">
        <button
          onClick={handleAddMeeting}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 border border-sky-500/40 text-sky-400 font-bold rounded-xl text-xs transition shadow-lg flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add New Meeting Note Below</span>
        </button>
      </div>
    </div>
  );
};
