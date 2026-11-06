import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { ArrowLeft, Plus, Edit2, Trash2, UploadCloud, Save, X, ChevronDown, CheckCircle2, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import { uploadImage } from '../lib/upload';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DepositMethod {
  id: string;
  type: string;
  name: string;
  account_number: string;
  logo_url: string;
  min_deposit: number;
  is_active: boolean;
}

const methodNames: Record<string, string> = {
  cbe: 'Commercial Bank of Ethiopia',
  boa: 'Bank of Abyssinia',
  telebirr: 'Telebirr',
  mpesa: 'M-Pesa',
  cbebirr: 'CBE Birr',
  ebirr: 'E-Birr',
  awash: 'Awash Bank',
  dashen: 'Dashen Bank',
  amhara: 'Amhara Bank',
  coop: 'Cooperative Bank of Oromia',
  amole: 'Amole Wallet',
  hello_cash: 'HelloCash',
  nib: 'Nib International Bank',
  wegagen: 'Wegagen Bank',
  zemen: 'Zemen Bank',
  oromia: 'Oromia Bank',
  hibret: 'Hibret Bank',
};

const methodColors: Record<string, string> = {
  cbe: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  boa: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  telebirr: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60',
  mpesa: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  cbebirr: 'bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800/60',
  ebirr: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60',
  awash: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  dashen: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
  amhara: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60',
  coop: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
  amole: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
  hello_cash: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  nib: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800',
  wegagen: 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  zemen: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  oromia: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-800',
  hibret: 'bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800',
};

export default function AdminDepositMethods() {
  const { user } = useGameStore();
  const [methods, setMethods] = useState<DepositMethod[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    type: 'cbe',
    name: '',
    account_number: '',
    min_deposit: 10,
    is_active: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMethods();
  }, []);

  const getHeaders = () => {
    const initData = typeof WebApp !== 'undefined' ? WebApp.initData : '';
    return {
      'Content-Type': 'application/json',
      'x-telegram-init-data': initData,
    };
  };

  const fetchMethods = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/deposit-methods`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMethods(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ type: 'cbe', name: '', account_number: '', min_deposit: 10, is_active: true });
    setFile(null);
    setExistingLogoUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (method: DepositMethod) => {
    setEditingId(method.id);
    setFormData({
      type: method.type,
      name: method.name,
      account_number: method.account_number,
      min_deposit: method.min_deposit,
      is_active: method.is_active !== false,
    });
    setFile(null);
    setExistingLogoUrl(method.logo_url || '');
    setIsModalOpen(true);
  };

  const handleToggleActive = async (method: DepositMethod) => {
    const nextActive = !method.is_active;

    // Optimistic UI update: if activating, deactivate other methods of the same category
    setMethods(prev =>
      prev.map(m => {
        if (m.id === method.id) return { ...m, is_active: nextActive };
        if (nextActive && m.type === method.type) return { ...m, is_active: false };
        return m;
      })
    );

    try {
      const toggleRes = await fetch(`${API_URL}/admin/deposit-methods/${method.id}/toggle`, {
        method: 'PATCH',
        headers: getHeaders(),
      });

      if (!toggleRes.ok) {
        await fetch(`${API_URL}/admin/deposit-methods/${method.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({
            ...method,
            is_active: nextActive,
          }),
        });
      }

      fetchMethods();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      fetchMethods();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deposit method?')) return;
    try {
      const res = await fetch(`${API_URL}/admin/deposit-methods/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) fetchMethods();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let finalLogoUrl = existingLogoUrl;
      
      // Process image directly (locally compressed data URL - zero network failure)
      if (file) {
        finalLogoUrl = await uploadImage(file);
      }
      
      const payload = {
        ...formData,
        logo_url: finalLogoUrl,
        is_active: formData.is_active,
      };
      
      const url = editingId 
        ? `${API_URL}/admin/deposit-methods/${editingId}`
        : `${API_URL}/admin/deposit-methods`;
        
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        fetchMethods();
      } else {
        const err = await res.json().catch(() => ({}));
        alert('API Error: ' + (err.error || 'Failed to save method'));
      }
    } catch (err: any) {
      console.error(err);
      alert(`Save failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user?.role !== 'admin') {
    return <div className="p-10 text-center font-bold text-slate-600">Admin only!</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-100 transition-colors duration-200 pb-20">
      {/* ── MOBILE-FIRST STICKY HEADER ── */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3.5 rounded-b-2xl shadow-sm border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between sticky top-0 z-20 transition-colors">
        <Link to="/admin" className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div className="text-center px-2 min-w-0">
          <h1 className="font-black text-slate-800 dark:text-white text-base tracking-tight truncate">Deposit Methods</h1>
          <p className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold truncate">1 active method per category</p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white p-2.5 rounded-xl shadow-md flex items-center justify-center transition-all shrink-0"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* ── METHODS LIST (MOBILE-FIRST CARDS) ── */}
      <div className="p-4 space-y-3.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3 shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
            <p className="text-slate-400 font-bold text-sm">Loading methods...</p>
          </div>
        ) : methods.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-900/90 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Landmark size={32} />
            </div>
            <h3 className="font-black text-slate-700 dark:text-slate-200 text-base">No Deposit Methods Added</h3>
            <p className="text-slate-400 text-xs mt-1 mb-4">Tap the + button above to add your first deposit banking method.</p>
            <button
              onClick={openNewModal}
              className="bg-amber-500 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md active:scale-95 transition-all"
            >
              Add First Method
            </button>
          </div>
        ) : (
          methods.map((method) => {
            const isActive = method.is_active !== false;
            const badgeColor = methodColors[method.type] || 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';

            return (
              <div
                key={method.id}
                className={`bg-white dark:bg-slate-900/95 p-4 rounded-3xl shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_6px_20px_rgba(0,0,0,0.4)] border transition-all ${
                  isActive
                    ? 'border-emerald-300 dark:border-emerald-500/40 ring-1 ring-emerald-400/20'
                    : 'border-slate-200/80 dark:border-slate-800 opacity-80'
                }`}
              >
                {/* 1. TOP ROW: Category Badge + Status + 3D Toggle */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80 mb-3 gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${badgeColor} truncate max-w-[170px]`}>
                      {methodNames[method.type] || method.type.toUpperCase()}
                    </span>
                    {isActive ? (
                      <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ACTIVE
                      </span>
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
                        INACTIVE
                      </span>
                    )}
                  </div>

                  {/* 3D Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(method)}
                    title={isActive ? 'Click to deactivate' : 'Click to activate'}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isActive ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isActive ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. MIDDLE ROW: Squircle Logo Box (Strictly 56x56) + Details */}
                <div className="flex items-center gap-3.5 mb-3">
                  <div className="w-14 h-14 min-w-[56px] max-w-[56px] h-[56px] max-h-[56px] rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    {method.logo_url ? (
                      <img
                        src={method.logo_url}
                        alt="Logo"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <span className="text-2xl">🏦</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 dark:text-white text-base leading-snug truncate">{method.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md truncate max-w-[190px]">
                        {method.account_number}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 mt-1">
                      Min Deposit: <span className="text-amber-600 dark:text-amber-400 font-black">{method.min_deposit} ETB</span>
                    </p>
                  </div>
                </div>

                {/* 3. BOTTOM ROW: Mobile Action Buttons */}
                <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => openEditModal(method)}
                    className="flex-1 py-2 px-3 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 active:scale-95 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-blue-100 dark:border-blue-900/50 shadow-sm"
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(method.id)}
                    className="py-2 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 active:scale-95 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-rose-100 dark:border-rose-900/50 shadow-sm"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── MAIN MODAL (MOBILE-FIRST) ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
              <h2 className="font-black text-slate-800 dark:text-white text-base">{editingId ? 'Edit Method' : 'Add New Method'}</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-white dark:bg-slate-800 p-2 rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 dark:border-slate-700"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              
              {/* Method Type Dropdown */}
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">METHOD CATEGORY</label>
                <button
                  type="button"
                  onClick={() => setShowTypeSelect(!showTypeSelect)}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center text-left"
                >
                  <span className="truncate mr-2">{methodNames[formData.type] || formData.type.toUpperCase()}</span>
                  <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${showTypeSelect ? 'rotate-180' : ''}`} />
                </button>

                {showTypeSelect && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-y-auto max-h-56">
                    <div className="flex flex-col">
                      {Object.entries(methodNames).map(([key, name]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, type: key });
                            setShowTypeSelect(false);
                          }}
                          className={`w-full text-left px-4 py-3 font-bold text-xs flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 last:border-0 ${
                            formData.type === key 
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' 
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className="truncate mr-2">{name}</span>
                          {formData.type === key && <CheckCircle2 size={16} className="text-amber-500 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Account Name */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">ACCOUNT NAME</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Abebe Kebede"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-amber-400"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">ACCOUNT / PHONE NUMBER</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 1000123456789 or 0912345678"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-amber-400"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                />
              </div>

              {/* Min Deposit */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">MIN DEPOSIT (ETB)</label>
                <input 
                  type="number" 
                  required
                  min={1}
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-amber-400"
                  value={formData.min_deposit}
                  onChange={(e) => setFormData({ ...formData, min_deposit: Number(e.target.value) })}
                />
              </div>

              {/* Active / Inactive Toggle Switch */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-white">Active Status</p>
                  <p className="text-[10px] text-slate-400 font-medium">Deactivates any other method of this type</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    formData.is_active ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      formData.is_active ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Logo Upload Section with Strict 56x56 Squircle Box */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">LOGO IMAGE (OPTIONAL)</label>
                <div className="flex items-center space-x-3">
                  <label className="flex-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-4 py-3 rounded-2xl font-black text-xs cursor-pointer border border-amber-200 dark:border-amber-800/60 flex justify-center items-center space-x-2 hover:bg-amber-100 transition-colors">
                    <UploadCloud size={16} />
                    <span>Choose Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {(file || existingLogoUrl) && (
                    <div className="w-14 h-14 min-w-[56px] max-w-[56px] h-[56px] max-h-[56px] rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-center p-1 shadow-inner relative group overflow-hidden">
                      <img
                        src={file ? URL.createObjectURL(file) : existingLogoUrl}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => { setFile(null); setExistingLogoUrl(''); }}
                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 shadow-md active:scale-90"
                        title="Remove image"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25 active:translate-y-0.5 transition-all flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save size={18} />
                    <span>{editingId ? 'Update Method' : 'Save Method'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
