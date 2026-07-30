import React, { useState } from 'react';
import { EstateItem, BeneficiaryRecord } from '../types/financial';
import { FileCheck, Shield, CheckCircle2, AlertTriangle, Plus, Trash2 } from 'lucide-react';

interface EstateBeneficiariesPageProps {
  estateItems: EstateItem[];
  beneficiaries: BeneficiaryRecord[];
  onSaveEstate: (items: EstateItem[]) => void;
  onSaveBeneficiaries: (records: BeneficiaryRecord[]) => void;
}

export const EstateBeneficiariesPage: React.FC<EstateBeneficiariesPageProps> = ({
  estateItems,
  beneficiaries,
  onSaveEstate,
  onSaveBeneficiaries
}) => {
  const [eList, setEList] = useState<EstateItem[]>(estateItems);
  const [bList, setBList] = useState<BeneficiaryRecord[]>(beneficiaries);

  const handleEstateStatus = (id: string, newStatus: EstateItem['status']) => {
    const updated = eList.map(e => (e.id === id ? { ...e, status: newStatus } : e));
    setEList(updated);
    onSaveEstate(updated);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Estate Planning & Beneficiary Designations</h1>
        <p className="text-sm text-slate-400 mt-1">
          Wills, Revocable Living Trusts, Powers of Attorney, Healthcare Directives, and account TOD/POD beneficiary verification.
        </p>
      </div>

      {/* Estate Documents Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
          <FileCheck className="w-5 h-5 text-sky-400" />
          <span>Core Household Estate Documents</span>
        </h2>

        <div className="space-y-3">
          {eList.map(item => (
            <div key={item.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-white">{item.documentItem}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                    Applies: {item.appliesTo}
                  </span>
                  {item.reviewNeeded && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Review Recommended</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{item.notes}</p>
                <p className="text-[11px] text-slate-500">Attorney: {item.attorney} • Location: {item.storageLocation}</p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <select
                  value={item.status}
                  onChange={e => handleEstateStatus(item.id, e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold px-3 py-1.5 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="Complete">Complete</option>
                  <option value="Needs Drafting">Needs Drafting</option>
                  <option value="Needs Update">Needs Update</option>
                  <option value="Not Started">Not Started</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Account Beneficiaries Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 bg-slate-950 border-b border-slate-800 font-bold text-sm text-white flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Account & Policy Beneficiary Register</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Account / Policy</th>
              <th className="py-3.5 px-4">Owner</th>
              <th className="py-3.5 px-4">Primary Beneficiary (%)</th>
              <th className="py-3.5 px-4">Contingent Beneficiary (%)</th>
              <th className="py-3.5 px-4">Per Stirpes</th>
              <th className="py-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-200">
            {bList.map(b => (
              <tr key={b.id} className="hover:bg-slate-800/40 transition">
                <td className="py-3 px-4 font-bold text-white">{b.accountPolicy}</td>
                <td className="py-3 px-4 text-slate-400">{b.owner}</td>
                <td className="py-3 px-4 text-emerald-400 font-semibold">{b.primaryBeneficiary} ({b.primaryPct}%)</td>
                <td className="py-3 px-4 text-slate-300">{b.contingentBeneficiary} ({b.contingentPct}%)</td>
                <td className="py-3 px-4">{b.perStirpes ? 'Yes' : 'No'}</td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      b.status === 'Current'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
