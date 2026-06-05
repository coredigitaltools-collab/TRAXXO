import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Users, Lock, Building2, User, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { LoginCredentials } from '../types';
import { Spinner } from './ui/Common';

type Tab = 'owner' | 'staff';

export function LoginPage() {
  const { login, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('owner');

  const [ownerForm, setOwnerForm] = useState({ businessName: '', pin: '', secretWord: '' });
  const [showOwnerPin, setShowOwnerPin] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const [staffForm, setStaffForm] = useState({ businessName: '', staffName: '', staffPin: '' });
  const [showStaffPin, setShowStaffPin] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  const clearErrors = () => { setErrors({}); setServerError(''); };

  const setOwner = (k: keyof typeof ownerForm, v: string) => {
    setOwnerForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
    setServerError('');
  };

  const setStaff = (k: keyof typeof staffForm, v: string) => {
    setStaffForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
    setServerError('');
  };

  const switchTab = (t: Tab) => { setTab(t); clearErrors(); };

  const validateOwner = (): boolean => {
    const errs: Record<string, string> = {};
    if (!ownerForm.businessName.trim()) errs.businessName = 'Business name is required';
    if (!ownerForm.pin.trim()) errs.pin = 'Owner PIN is required';
    else if (ownerForm.pin.trim().length < 4) errs.pin = 'PIN must be at least 4 characters';
    if (!ownerForm.secretWord.trim()) errs.secretWord = 'Secret word is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStaff = (): boolean => {
    const errs: Record<string, string> = {};
    if (!staffForm.businessName.trim()) errs.businessName = 'Business name is required';
    if (!staffForm.staffName.trim()) errs.staffName = 'Your name is required';
    if (!staffForm.staffPin.trim()) errs.staffPin = 'Staff PIN is required';
    else if (staffForm.staffPin.trim().length < 4) errs.staffPin = 'PIN must be at least 4 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateOwner()) return;
    const creds: LoginCredentials = {
      businessName: ownerForm.businessName,
      pin: ownerForm.pin,
      secretWord: ownerForm.secretWord,
      role: 'owner',
    };
    const result = await login(creds);
    if (result.error) setServerError(result.error);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStaff()) return;
    const creds: LoginCredentials = {
      businessName: staffForm.businessName,
      pin: '',
      secretWord: '',
      role: 'staff',
      staffName: staffForm.staffName,
      staffPin: staffForm.staffPin,
    };
    const result = await login(creds);
    if (result.error) setServerError(result.error);
  };

  const inputCls = (err?: string) =>
    `w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-white/10 border ${err ? 'border-red-500' : 'border-white/10'} text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl shadow-xl mb-4 overflow-hidden bg-white">
            <img src="/Bright_logo.png" alt="TRΛXXO" className="w-20 h-20 object-cover" onError={e => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              const parent = e.currentTarget.parentElement as HTMLElement;
              parent.classList.add('bg-blue-600');
            }} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TR<span className="font-black">Λ</span>XXO</h1>
          <p className="text-blue-300/70 text-sm mt-1">Business Management System</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <div className="flex bg-white/5 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => switchTab('owner')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'owner' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Shield size={14} /> Owner Login
            </button>
            <button
              type="button"
              onClick={() => switchTab('staff')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === 'staff' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              <Users size={14} /> Staff Login
            </button>
          </div>

          {tab === 'owner' && (
            <form onSubmit={handleOwnerSubmit} className="space-y-4">
              <p className="text-xs text-blue-300/60 text-center mb-2">Full system access · Secret word required</p>

              <div>
                <label className="block text-xs font-semibold text-blue-300/70 uppercase tracking-wide mb-1">Business Name</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="text" value={ownerForm.businessName} onChange={e => setOwner('businessName', e.target.value)} placeholder="Your business name" className={inputCls(errors.businessName)} />
                </div>
                {errors.businessName && <p className="text-xs text-red-400 mt-1">{errors.businessName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-300/70 uppercase tracking-wide mb-1">Owner PIN</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type={showOwnerPin ? 'text' : 'password'} value={ownerForm.pin} onChange={e => setOwner('pin', e.target.value)} placeholder="Your secure PIN" className={`${inputCls(errors.pin)} pr-10`} />
                  <button type="button" onClick={() => setShowOwnerPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {showOwnerPin ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.pin && <p className="text-xs text-red-400 mt-1">{errors.pin}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-300/70 uppercase tracking-wide mb-1">Secret Word</label>
                <div className="relative">
                  <Shield size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type={showSecret ? 'text' : 'password'} value={ownerForm.secretWord} onChange={e => setOwner('secretWord', e.target.value)} placeholder="Your secret word" className={`${inputCls(errors.secretWord)} pr-10`} />
                  <button type="button" onClick={() => setShowSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.secretWord && <p className="text-xs text-red-400 mt-1">{errors.secretWord}</p>}
              </div>

              {serverError && <ErrorBox msg={serverError} />}
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                {loading ? <><Spinner size="sm" /> Verifying…</> : 'Access Dashboard'}
              </button>
            </form>
          )}

          {tab === 'staff' && (
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <p className="text-xs text-blue-300/60 text-center mb-2">Use your own staff name and PIN — no secret word needed</p>

              <div>
                <label className="block text-xs font-semibold text-blue-300/70 uppercase tracking-wide mb-1">Business Name</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="text" value={staffForm.businessName} onChange={e => setStaff('businessName', e.target.value)} placeholder="Your business name" className={inputCls(errors.businessName)} />
                </div>
                {errors.businessName && <p className="text-xs text-red-400 mt-1">{errors.businessName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-300/70 uppercase tracking-wide mb-1">Your Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type="text" value={staffForm.staffName} onChange={e => setStaff('staffName', e.target.value)} placeholder="Enter your name" className={inputCls(errors.staffName)} />
                </div>
                {errors.staffName && <p className="text-xs text-red-400 mt-1">{errors.staffName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-300/70 uppercase tracking-wide mb-1">Staff PIN</label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input type={showStaffPin ? 'text' : 'password'} value={staffForm.staffPin} onChange={e => setStaff('staffPin', e.target.value)} placeholder="Your staff PIN" className={`${inputCls(errors.staffPin)} pr-10`} />
                  <button type="button" onClick={() => setShowStaffPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {showStaffPin ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.staffPin && <p className="text-xs text-red-400 mt-1">{errors.staffPin}</p>}
              </div>

              {serverError && <ErrorBox msg={serverError} />}
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                {loading ? <><Spinner size="sm" /> Verifying…</> : 'Access POS'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Owner credentials are private and never shared with staff.
        </p>
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
      {msg}
    </div>
  );
}
