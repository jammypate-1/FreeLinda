import React, { useState, useEffect } from 'react';
import { ClientProfile } from '../types/financial';
import { User, Phone, Mail, Shield, MapPin, CheckCircle2, Pencil, X, Save } from 'lucide-react';

interface ClientProfilePageProps {
  profile: ClientProfile;
  onSaveProfile: (profile: ClientProfile) => void;
}

export const ClientProfilePage: React.FC<ClientProfilePageProps> = ({ profile, onSaveProfile }) => {
  const [formData, setFormData] = useState<ClientProfile>(profile);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Index of advisor card being edited, or null if none
  const [editingAdvisorIndex, setEditingAdvisorIndex] = useState<number | null>(null);
  const [advisorEditForm, setAdvisorEditForm] = useState<any>(null);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleSave = () => {
    onSaveProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleStartEditAdvisor = (index: number) => {
    setEditingAdvisorIndex(index);
    setAdvisorEditForm({ ...formData.advisors[index] });
  };

  const handleSaveAdvisorEdit = () => {
    if (editingAdvisorIndex === null || !advisorEditForm) return;

    const updatedAdvisors = [...formData.advisors];
    updatedAdvisors[editingAdvisorIndex] = advisorEditForm;

    const updatedProfile = { ...formData, advisors: updatedAdvisors };
    setFormData(updatedProfile);
    onSaveProfile(updatedProfile);

    setEditingAdvisorIndex(null);
    setAdvisorEditForm(null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Client & Household Profile</h1>
          <p className="text-sm text-slate-400 mt-1">
            Household identity, residency, employment, risk score, loss tolerance, and advisor directory.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs transition shadow-lg shadow-sky-600/30 flex items-center space-x-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Save Profile Changes</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold">
          Profile changes saved successfully!
        </div>
      )}

      {/* Household Demographic Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
          <User className="w-5 h-5 text-sky-400" />
          <span>Primary Household Identity</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Full Legal Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Date of Birth</label>
            <input
              type="date"
              value={formData.dob}
              onChange={e => setFormData({ ...formData, dob: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Age</label>
            <input
              type="number"
              value={formData.age}
              onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Tax Residency / State</label>
            <input
              type="text"
              value={formData.residency}
              onChange={e => setFormData({ ...formData, residency: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Occupation & Employer</label>
            <input
              type="text"
              value={formData.occupation}
              onChange={e => setFormData({ ...formData, occupation: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Planning Scope</label>
            <input
              type="text"
              value={formData.riskScope}
              onChange={e => setFormData({ ...formData, riskScope: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1 text-xs">Planning & Life Notes</label>
          <textarea
            rows={3}
            value={formData.planningNotes}
            onChange={e => setFormData({ ...formData, planningNotes: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-sky-500"
          ></textarea>
        </div>
      </div>

      {/* Risk Profile & Investment Constraints */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Shield className="w-5 h-5 text-indigo-400" />
          <span>Risk Tolerance & Investment Profile</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Risk Tolerance Rating</label>
            <input
              type="text"
              value={formData.riskTolerance}
              onChange={e => setFormData({ ...formData, riskTolerance: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Loss Tolerance Capacity</label>
            <input
              type="text"
              value={formData.lossTolerance}
              onChange={e => setFormData({ ...formData, lossTolerance: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Liquidity Preference</label>
            <input
              type="text"
              value={formData.liquidityPreference}
              onChange={e => setFormData({ ...formData, liquidityPreference: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Values / Concentration Constraints</label>
            <input
              type="text"
              value={formData.valuesConstraints}
              onChange={e => setFormData({ ...formData, valuesConstraints: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Professional Advisor Directory (EDITABLE CARDS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Mail className="w-5 h-5 text-emerald-400" />
          <span>Professional Advisor & Professional Contact Cards</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {formData.advisors.map((advisor, idx) => (
            <div key={idx} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 relative group">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">{advisor.role}</span>
                <button
                  onClick={() => handleStartEditAdvisor(idx)}
                  className="p-1 rounded bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white transition"
                  title="Edit Card"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">{advisor.name}</h4>
                <p className="text-xs text-slate-400">{advisor.contact}</p>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/60">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{advisor.email}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{advisor.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{advisor.address}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic pt-1">{advisor.notes}</p>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT ADVISOR CARD MODAL */}
      {editingAdvisorIndex !== null && advisorEditForm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Edit {advisorEditForm.role} Card</h3>
              <button
                onClick={() => setEditingAdvisorIndex(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Name</label>
                <input
                  type="text"
                  value={advisorEditForm.name}
                  onChange={e => setAdvisorEditForm({ ...advisorEditForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Firm / Organization</label>
                <input
                  type="text"
                  value={advisorEditForm.contact}
                  onChange={e => setAdvisorEditForm({ ...advisorEditForm, contact: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={advisorEditForm.email}
                    onChange={e => setAdvisorEditForm({ ...advisorEditForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={advisorEditForm.phone}
                    onChange={e => setAdvisorEditForm({ ...advisorEditForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Address / Location</label>
                <input
                  type="text"
                  value={advisorEditForm.address}
                  onChange={e => setAdvisorEditForm({ ...advisorEditForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notes / Special Instructions</label>
                <textarea
                  rows={2}
                  value={advisorEditForm.notes}
                  onChange={e => setAdvisorEditForm({ ...advisorEditForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingAdvisorIndex(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdvisorEdit}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Card</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
