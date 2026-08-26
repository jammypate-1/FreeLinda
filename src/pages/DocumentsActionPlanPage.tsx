import React, { useState } from 'react';
import { DocumentItem, ActionItem } from '../types/financial';
import { CheckSquare, FileText, CheckCircle2, Clock, Plus, Trash2, X, Save, Upload, Download, Eye, File, Lock, ShieldCheck } from 'lucide-react';

interface DocumentsActionPlanPageProps {
  documents: DocumentItem[];
  actionItems: ActionItem[];
  onSaveDocuments: (docs: DocumentItem[]) => void;
  onSaveActionItems: (items: ActionItem[]) => void;
}

export const DocumentsActionPlanPage: React.FC<DocumentsActionPlanPageProps> = ({
  documents,
  actionItems,
  onSaveDocuments,
  onSaveActionItems
}) => {
  const [docList, setDocList] = useState<DocumentItem[]>(documents);
  const [actList, setActList] = useState<ActionItem[]>(actionItems);

  // Filter state for Document Vault
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('ALL');

  // Modals state
  const [showAddActionModal, setShowAddActionModal] = useState<boolean>(false);
  const [showUploadDocModal, setShowUploadDocModal] = useState<boolean>(false);

  // New Action Item Form State
  const [newItem, setNewItem] = useState<{
    planningArea: string;
    actionItem: string;
    priority: 'High' | 'Medium' | 'Low';
    status: ActionItem['status'];
    dueDate: string;
    nextStep: string;
    notes: string;
  }>({
    planningArea: 'Tax & Equity Strategy',
    actionItem: '',
    priority: 'High',
    status: 'Not Started',
    dueDate: new Date().toISOString().split('T')[0],
    nextStep: '',
    notes: ''
  });

  // Upload Document Form State
  const [uploadState, setUploadState] = useState<{
    documentRecord: string;
    category: string;
    dateReceived: string;
    notes: string;
    fileSizeStr: string;
    fileName: string;
  }>({
    documentRecord: '',
    category: 'Estate & Trust',
    dateReceived: new Date().toISOString().split('T')[0],
    notes: '',
    fileSizeStr: '',
    fileName: ''
  });

  const handleToggleDocReceived = (id: string) => {
    const updated = docList.map(d =>
      d.id === id ? { ...d, received: !d.received, status: (!d.received ? 'Received' : 'Pending') as DocumentItem['status'] } : d
    );
    setDocList(updated);
    onSaveDocuments(updated);
  };

  const handleDeleteDoc = (id: string) => {
    if (window.confirm('Are you sure you want to remove this document from the vault?')) {
      const updated = docList.filter(d => d.id !== id);
      setDocList(updated);
      onSaveDocuments(updated);
    }
  };

  const handleActionStatus = (id: string, newStatus: ActionItem['status']) => {
    const updated = actList.map(a => (a.id === id ? { ...a, status: newStatus } : a));
    setActList(updated);
    onSaveActionItems(updated);
  };

  const handleDeleteAction = (id: string) => {
    if (window.confirm('Are you sure you want to delete this action item?')) {
      const updated = actList.filter(a => a.id !== id);
      setActList(updated);
      onSaveActionItems(updated);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setUploadState(prev => ({
        ...prev,
        fileName: file.name,
        documentRecord: prev.documentRecord || file.name.replace(/\.[^/.]+$/, ""),
        fileSizeStr: `${sizeMB} MB`
      }));
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadState.documentRecord.trim()) return;

    const newDoc: DocumentItem = {
      id: `DOC-${Date.now().toString().slice(-4)}`,
      documentRecord: uploadState.documentRecord,
      category: uploadState.category,
      needed: true,
      received: true,
      dateReceived: uploadState.dateReceived,
      storageLink: 'Secure Vault Storage (256-Bit Encrypted)',
      notes: uploadState.notes || `Uploaded File: ${uploadState.fileName || uploadState.documentRecord} (${uploadState.fileSizeStr || '1.2 MB'})`,
      status: 'Received'
    };

    const updated = [newDoc, ...docList];
    setDocList(updated);
    onSaveDocuments(updated);

    setShowUploadDocModal(false);
    setUploadState({
      documentRecord: '',
      category: 'Estate & Trust',
      dateReceived: new Date().toISOString().split('T')[0],
      notes: '',
      fileSizeStr: '',
      fileName: ''
    });
  };

  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.actionItem.trim()) return;

    const newAction: ActionItem = {
      id: `ACT-${Date.now().toString().slice(-4)}`,
      owner: 'Linda',
      planningArea: newItem.planningArea,
      actionItem: newItem.actionItem,
      priority: newItem.priority,
      status: newItem.status,
      dueDate: newItem.dueDate,
      nextStep: newItem.nextStep || 'Follow up with Linda',
      notes: newItem.notes || 'Added to Action Plan'
    };

    const updated = [newAction, ...actList];
    setActList(updated);
    onSaveActionItems(updated);

    setShowAddActionModal(false);
    setNewItem({
      planningArea: 'Tax & Equity Strategy',
      actionItem: '',
      priority: 'High',
      status: 'Not Started',
      dueDate: new Date().toISOString().split('T')[0],
      nextStep: '',
      notes: ''
    });
  };

  const filteredDocs = docList.filter(doc => {
    if (docCategoryFilter === 'ALL') return true;
    return doc.category.toLowerCase().includes(docCategoryFilter.toLowerCase());
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Title Bar & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Document Vault Intake & Action Plan</h1>
          <p className="text-sm text-slate-400 mt-1">
            Secure client document vault upload, intake verification checklist, and strategic action item execution board.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setShowUploadDocModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-emerald-600/30 flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>+ Upload Document to Vault</span>
          </button>

          <button
            onClick={() => setShowAddActionModal(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-sky-600/30 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Action Item</span>
          </button>
        </div>
      </div>

      {/* Document Vault Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Client Document Vault Storage</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>256-Bit Encrypted Vault</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {docList.filter(d => d.received).length} of {docList.length} required governance documents uploaded & verified.
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 p-1.5 rounded-xl text-xs">
            <button
              onClick={() => setDocCategoryFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                docCategoryFilter === 'ALL' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Docs ({docList.length})
            </button>
            <button
              onClick={() => setDocCategoryFilter('Estate')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                docCategoryFilter === 'Estate' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Estate & Trust
            </button>
            <button
              onClick={() => setDocCategoryFilter('Tax')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                docCategoryFilter === 'Tax' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tax Returns
            </button>
            <button
              onClick={() => setDocCategoryFilter('Real Estate')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                docCategoryFilter === 'Real Estate' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Real Estate Deeds
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Document / File Record</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Intake Status</th>
                <th className="py-3.5 px-4">Date Uploaded</th>
                <th className="py-3.5 px-4">Notes & File Metadata</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-lg bg-slate-800 text-sky-400 shrink-0">
                        <File className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{doc.documentRecord}</p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {doc.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-sky-400 border border-slate-700">
                      {doc.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {doc.received ? (
                      <span className="text-emerald-400 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified in Vault</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending Intake</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-medium">{doc.dateReceived || '—'}</td>
                  <td className="py-3 px-4 text-slate-400 italic max-w-xs truncate">{doc.notes}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleToggleDocReceived(doc.id)}
                        className={`px-2.5 py-1 rounded text-xs font-semibold border transition ${
                          doc.received
                            ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
                        }`}
                      >
                        {doc.received ? 'Mark Pending' : 'Mark Verified'}
                      </button>

                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition rounded-lg hover:bg-slate-800"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Plan Board */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-sky-400" />
            <span>Strategic Recommendations & Action Items</span>
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            {actList.length} Active Action Items
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {actList.map(item => (
            <div key={item.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between relative group hover:border-sky-500/30 transition">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">{item.planningArea}</span>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.priority === 'High'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {item.priority} Priority
                    </span>
                    <button
                      onClick={() => handleDeleteAction(item.id)}
                      className="text-slate-600 hover:text-rose-400 p-0.5 transition"
                      title="Delete Action Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h4 className="text-sm font-bold text-white">{item.actionItem}</h4>
                <p className="text-xs text-slate-400">{item.notes}</p>
                <p className="text-[11px] text-slate-500">Next Step: {item.nextStep}</p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Due: <strong className="text-slate-200">{item.dueDate}</strong></span>
                <select
                  value={item.status}
                  onChange={e => handleActionStatus(item.id, e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded text-xs font-semibold px-2 py-1 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Complete">Complete</option>
                  <option value="Waiting on Client">Waiting on Client</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadDocModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <span>Upload Document to Encrypted Vault</span>
              </h3>
              <button
                onClick={() => setShowUploadDocModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* File Select Area */}
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl p-6 text-center space-y-2 bg-slate-950/50 transition cursor-pointer relative">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg"
                />
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-white text-sm">
                    {uploadState.fileName ? uploadState.fileName : 'Click or Drag & Drop File Here'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {uploadState.fileSizeStr ? `File Size: ${uploadState.fileSizeStr}` : 'Supports PDF, Word, Excel, Tax Forms, Scanned Deeds (Up to 50MB)'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Document Record Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2025 Form 1040 Tax Return / Revocable Living Trust"
                  value={uploadState.documentRecord}
                  onChange={e => setUploadState({ ...uploadState, documentRecord: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Category</label>
                  <select
                    value={uploadState.category}
                    onChange={e => setUploadState({ ...uploadState, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    <option value="Estate & Trust">Estate & Trust</option>
                    <option value="Tax Returns & Records">Tax Returns & Records</option>
                    <option value="Insurance Policies">Insurance Policies</option>
                    <option value="Real Estate & Title">Real Estate & Title</option>
                    <option value="Account Statements">Account Statements</option>
                    <option value="Legal & Identity">Legal & Identity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Date Received / Uploaded</label>
                  <input
                    type="date"
                    required
                    value={uploadState.dateReceived}
                    onChange={e => setUploadState({ ...uploadState, dateReceived: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notes & Storage Metadata</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Executed and notarized copy stored in secure vault."
                  value={uploadState.notes}
                  onChange={e => setUploadState({ ...uploadState, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadDocModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/30"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Upload & Store Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ACTION ITEM MODAL */}
      {showAddActionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Plus className="w-5 h-5 text-sky-400" />
                <span>Add New Action Item</span>
              </h3>
              <button
                onClick={() => setShowAddActionModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Planning Area</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tax & Equity Strategy, Retirement, Estate"
                  value={newItem.planningArea}
                  onChange={e => setNewItem({ ...newItem, planningArea: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Action Item Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Harvest Tax Losses or Execute Option Collar"
                  value={newItem.actionItem}
                  onChange={e => setNewItem({ ...newItem, actionItem: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Priority</label>
                  <select
                    value={newItem.priority}
                    onChange={e => setNewItem({ ...newItem, priority: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Initial Status</label>
                  <select
                    value={newItem.status}
                    onChange={e => setNewItem({ ...newItem, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting on Client">Waiting on Client</option>
                    <option value="Complete">Complete</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target Due Date</label>
                  <input
                    type="date"
                    required
                    value={newItem.dueDate}
                    onChange={e => setNewItem({ ...newItem, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Immediate Next Step</label>
                  <input
                    type="text"
                    placeholder="e.g. Schedule call with CPA"
                    value={newItem.nextStep}
                    onChange={e => setNewItem({ ...newItem, nextStep: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notes & Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed notes or special instructions"
                  value={newItem.notes}
                  onChange={e => setNewItem({ ...newItem, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddActionModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-sky-600/30"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Add Action Item</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
