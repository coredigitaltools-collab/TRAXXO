import { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, UserCog, ChevronRight, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { BusinessSettings } from '../types';
import { CURRENCIES } from '../types';
import { PageLayout } from '../components/layout/PageLayout';
import { FormField, Select, Spinner } from '../components/ui/Common';

interface SettingsPageProps {
  onBack: () => void;
  onNavigateToStaff?: () => void;
}

const EMPTY_SETTINGS: Omit<BusinessSettings, 'id' | 'business_id' | 'created_at' | 'updated_at'> = {
  logo_url: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  tax_number: '',
  currency: 'UGX',
  date_format: 'DD/MM/YYYY',
  time_format: 'HH:mm',
  receipt_header: '',
  receipt_footer: 'Thank you for your business!',
  thank_you_message: 'Thank you for shopping with us',
};

export function SettingsPage({ onBack, onNavigateToStaff }: SettingsPageProps) {
  const { session } = useAuth();
  const [settings, setSettings] = useState({ ...EMPTY_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (session?.businessId) loadSettings();
  }, [session?.businessId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('business_id', session?.businessId)
        .maybeSingle();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (e) {
      console.error('Failed to load settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string, v: string) => {
    setSettings(s => ({ ...s, [k]: v }));
    setErrors(er => ({ ...er, [k]: '' }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...settings,
        business_id: session?.businessId,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('business_settings')
        .upsert(payload, { onConflict: 'business_id' });

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setErrors({ _: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLayout title="Settings" onBack={onBack}><Spinner /></PageLayout>;

  const dateFormatOptions = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map(f => ({ value: f, label: f }));
  const timeFormatOptions = ['HH:mm', 'hh:mm A'].map(f => ({ value: f, label: f }));

  return (
    <PageLayout title="Settings" onBack={onBack} description="Manage business information and preferences">
      <div className="space-y-5">
        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl p-4 text-sm">
            Settings saved successfully!
          </div>
        )}

        {errors._ && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-4 text-sm">
            {errors._}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Owner-only: Staff Management */}
          {session?.role === 'owner' && (
            <div className="card p-5 lg:col-span-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Shield size={18} className="text-blue-600" /> Owner Controls
              </h3>
              <button
                onClick={onNavigateToStaff}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left group w-full sm:w-auto"
              >
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                  <UserCog size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Staff Management</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Add staff, set roles, reset PINs, view activity</div>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
              </button>
            </div>
          )}

          {/* Business Information */}
          <div className="card p-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <SettingsIcon size={18} /> Business Information
            </h3>
            <div className="space-y-4">
              <FormField label="Address">
                <textarea
                  value={settings.address}
                  onChange={e => set('address', e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Business address"
                />
              </FormField>
              <FormField label="Phone">
                <input type="tel" value={settings.phone} onChange={e => set('phone', e.target.value)} className="input" placeholder="Phone number" />
              </FormField>
              <FormField label="Email">
                <input type="email" value={settings.email} onChange={e => set('email', e.target.value)} className="input" placeholder="Email address" />
              </FormField>
              <FormField label="Website">
                <input type="url" value={settings.website} onChange={e => set('website', e.target.value)} className="input" placeholder="https://example.com" />
              </FormField>
              <FormField label="Tax Number">
                <input type="text" value={settings.tax_number} onChange={e => set('tax_number', e.target.value)} className="input" placeholder="Tax ID or number" />
              </FormField>
            </div>
          </div>

          {/* Display & Localization */}
          <div className="card p-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">Display & Localization</h3>
            <div className="space-y-4">
              <FormField label="Currency">
                <Select
                  value={settings.currency}
                  onChange={e => set('currency', e.target.value)}
                  options={CURRENCIES.map(c => ({ value: c.value, label: c.label }))}
                />
              </FormField>
              <FormField label="Date Format">
                <Select value={settings.date_format} onChange={e => set('date_format', e.target.value)} options={dateFormatOptions} />
              </FormField>
              <FormField label="Time Format">
                <Select value={settings.time_format} onChange={e => set('time_format', e.target.value)} options={timeFormatOptions} />
              </FormField>
            </div>
          </div>

          {/* Receipt Settings */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">Receipt Settings</h3>
            <div className="space-y-4">
              <FormField label="Receipt Header">
                <textarea
                  value={settings.receipt_header}
                  onChange={e => set('receipt_header', e.target.value)}
                  rows={2}
                  className="input resize-none"
                  placeholder="Header text to appear on receipts"
                />
              </FormField>
              <FormField label="Receipt Footer">
                <textarea
                  value={settings.receipt_footer}
                  onChange={e => set('receipt_footer', e.target.value)}
                  rows={2}
                  className="input resize-none"
                  placeholder="Footer text for receipts"
                />
              </FormField>
              <FormField label="Thank You Message">
                <input
                  type="text"
                  value={settings.thank_you_message}
                  onChange={e => set('thank_you_message', e.target.value)}
                  className="input"
                  placeholder="Message to display on receipts"
                />
              </FormField>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onBack} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? <><Spinner size="sm" /> Saving…</> : <><Save size={14} /> Save Settings</>}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
