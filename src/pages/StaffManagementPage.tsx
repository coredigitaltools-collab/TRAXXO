import { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Pencil, Trash2, UserX, UserCheck, KeyRound,
  Eye, EyeOff, Users, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { makeStaffPinHash } from '../lib/auth';
import type { StaffMember, ActivityLog } from '../types';
import { STAFF_ROLE_OPTIONS, ROLE_LABELS } from '../lib/permissions';
import { PageLayout } from '../components/layout/PageLayout';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { FormField, Select, EmptyState, Spinner } from '../components/ui/Common';

interface Props { onBack: () => void }

const EMPTY_FORM = { name: '', pin: '', confirmPin: '', role: 'cashier' as StaffMember['role'] };

function RoleBadge({ role }: { role: StaffMember['role'] }) {
  const colors: Record<StaffMember['role'], string> = {
    cashier: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    store_manager: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    administrator: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: StaffMember['status'] }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
      status === 'active'
        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
    }`}>
      {status === 'active' ? 'Active' : 'Inactive'}
    </span>
  );
}

export function StaffManagementPage({ onBack }: Props) {
  const { session } = useAuth();
  const businessId = session?.businessId ?? '';

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'staff' | 'activity'>('staff');

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [toggleTarget, setToggleTarget] = useState<StaffMember | null>(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [showPin, setShowPin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const [{ data: staffData }, { data: activityData }] = await Promise.all([
      supabase.from('staff_members').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('activity_log').select('*').eq('business_id', businessId).order('created_at', { ascending: false }).limit(100),
    ]);
    setStaff((staffData ?? []) as StaffMember[]);
    setActivity((activityData ?? []) as ActivityLog[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setServerError('');
    setShowForm(true);
  };

  const openEdit = (s: StaffMember) => {
    setEditTarget(s);
    setForm({ name: s.name, pin: '', confirmPin: '', role: s.role });
    setFormErrors({});
    setServerError('');
    setShowForm(true);
  };

  const setF = (k: keyof typeof EMPTY_FORM, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setFormErrors(e => ({ ...e, [k]: '' }));
    setServerError('');
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!editTarget) {
      if (!form.pin.trim()) errs.pin = 'PIN is required';
      else if (form.pin.trim().length < 4) errs.pin = 'PIN must be at least 4 characters';
      if (form.pin !== form.confirmPin) errs.confirmPin = 'PINs do not match';
    } else if (form.pin) {
      if (form.pin.trim().length < 4) errs.pin = 'PIN must be at least 4 characters';
      if (form.pin !== form.confirmPin) errs.confirmPin = 'PINs do not match';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setServerError('');
    try {
      if (editTarget) {
        const updates: Record<string, unknown> = {
          role: form.role,
          updated_at: new Date().toISOString(),
        };
        if (form.pin.trim()) {
          updates.pin_hash = await makeStaffPinHash(businessId, editTarget.name, form.pin.trim());
        }
        const { error } = await supabase.from('staff_members').update(updates).eq('id', editTarget.id);
        if (error) throw error;
        await supabase.from('activity_log').insert({
          business_id: businessId, staff_name: 'Owner', staff_role: 'owner',
          action: `Updated staff member: ${editTarget.name}`, entity_type: 'staff_member', entity_id: editTarget.id,
        });
      } else {
        const pinHash = await makeStaffPinHash(businessId, form.name.trim(), form.pin.trim());
        const { error } = await supabase.from('staff_members').insert({
          business_id: businessId, name: form.name.trim(), pin_hash: pinHash, role: form.role, status: 'active',
        });
        if (error) throw error;
        await supabase.from('activity_log').insert({
          business_id: businessId, staff_name: 'Owner', staff_role: 'owner',
          action: `Added staff member: ${form.name.trim()} (${form.role})`, entity_type: 'staff_member',
        });
      }
      setShowForm(false);
      await load();
    } catch (e) {
      setServerError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from('staff_members').delete().eq('id', deleteTarget.id);
    await supabase.from('activity_log').insert({
      business_id: businessId, staff_name: 'Owner', staff_role: 'owner',
      action: `Deleted staff member: ${deleteTarget.name}`, entity_type: 'staff_member', entity_id: deleteTarget.id,
    });
    setDeleteTarget(null);
    await load();
  };

  const handleToggleStatus = async () => {
    if (!toggleTarget) return;
    const newStatus = toggleTarget.status === 'active' ? 'inactive' : 'active';
    await supabase.from('staff_members').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', toggleTarget.id);
    await supabase.from('activity_log').insert({
      business_id: businessId, staff_name: 'Owner', staff_role: 'owner',
      action: `${newStatus === 'active' ? 'Activated' : 'Deactivated'} staff member: ${toggleTarget.name}`,
      entity_type: 'staff_member', entity_id: toggleTarget.id,
    });
    setToggleTarget(null);
    await load();
  };

  const handleResetPin = async (newPin: string) => {
    if (!resetTarget || newPin.trim().length < 4) return;
    const pinHash = await makeStaffPinHash(businessId, resetTarget.name, newPin.trim());
    await supabase.from('staff_members').update({ pin_hash: pinHash, updated_at: new Date().toISOString() }).eq('id', resetTarget.id);
    await supabase.from('activity_log').insert({
      business_id: businessId, staff_name: 'Owner', staff_role: 'owner',
      action: `Reset PIN for: ${resetTarget.name}`, entity_type: 'staff_member', entity_id: resetTarget.id,
    });
    setResetTarget(null);
    await load();
  };

  if (loading) return <PageLayout title="Staff Management" onBack={onBack}><div className="flex justify-center py-20"><Spinner /></div></PageLayout>;

  return (
    <PageLayout title="Staff Management" onBack={onBack} description="Manage staff accounts and monitor activity">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Staff', value: staff.length, color: 'text-blue-600' },
            { label: 'Active', value: staff.filter(s => s.status === 'active').length, color: 'text-emerald-600' },
            { label: 'Inactive', value: staff.filter(s => s.status !== 'active').length, color: 'text-gray-400' },
            { label: 'Actions Logged', value: activity.length, color: 'text-amber-600' },
          ].map(stat => (
            <div key={stat.label} className="card p-4">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 gap-4">
          {(['staff', 'activity'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`pb-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                activeTab === t
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t === 'staff' ? 'Staff Members' : 'Activity Log'}
            </button>
          ))}
        </div>

        {/* Staff list */}
        {activeTab === 'staff' && (
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Staff Members</h3>
              <button onClick={openAdd} className="btn btn-primary btn-sm flex items-center gap-1.5">
                <UserPlus size={14} /> Add Staff
              </button>
            </div>

            {staff.length === 0 ? (
              <EmptyState
                icon={<Users size={28} />}
                title="No staff members yet"
                description="Add your first staff member so they can log in with their own credentials."
                action={<button onClick={openAdd} className="btn btn-primary">Add First Staff Member</button>}
              />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {staff.map(member => (
                  <div key={member.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{member.name}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <RoleBadge role={member.role} />
                        <StatusBadge status={member.status} />
                        <span className="text-xs text-gray-400">Added {new Date(member.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setResetTarget(member)} className="btn-icon btn-secondary" title="Reset PIN">
                        <KeyRound size={15} />
                      </button>
                      <button onClick={() => openEdit(member)} className="btn-icon btn-secondary" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setToggleTarget(member)}
                        className={`btn-icon ${member.status === 'active' ? 'btn-secondary text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'btn-secondary text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                        title={member.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        {member.status === 'active' ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                      <button onClick={() => setDeleteTarget(member)} className="btn-icon btn-secondary text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity log */}
        {activeTab === 'activity' && (
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Recent Activity</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Last 100 actions across all staff</p>
            </div>
            {activity.length === 0 ? (
              <EmptyState icon={<Clock size={24} />} title="No activity yet" description="Actions performed by staff will appear here." />
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {activity.map(log => (
                  <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                        {log.staff_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200">{log.action}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{log.staff_name}</span>
                        <span className="text-xs text-gray-400">&middot;</span>
                        <span className="text-xs text-gray-400 capitalize">
                          {ROLE_LABELS[log.staff_role as keyof typeof ROLE_LABELS] ?? log.staff_role}
                        </span>
                        <span className="text-xs text-gray-400">&middot;</span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editTarget ? `Edit ${editTarget.name}` : 'Add Staff Member'} maxWidth="max-w-md">
          <div className="space-y-4">
            <FormField label="Full Name" error={formErrors.name} required>
              <input
                type="text"
                value={form.name}
                onChange={e => setF('name', e.target.value)}
                className="input"
                placeholder="Staff member's full name"
                disabled={!!editTarget}
              />
            </FormField>

            <FormField label="Role" error={formErrors.role}>
              <Select value={form.role} onChange={e => setF('role', e.target.value)} options={STAFF_ROLE_OPTIONS} />
            </FormField>

            <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {editTarget ? 'Leave PIN blank to keep the existing PIN.' : 'Set a PIN the staff member will use to log in.'}
              </p>
              <div className="space-y-3">
                <FormField label={editTarget ? 'New PIN (optional)' : 'Staff PIN'} error={formErrors.pin} required={!editTarget}>
                  <div className="relative">
                    <input type={showPin ? 'text' : 'password'} value={form.pin} onChange={e => setF('pin', e.target.value)} className="input pr-10" placeholder="Min. 4 characters" />
                    <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </FormField>
                {(form.pin || !editTarget) && (
                  <FormField label="Confirm PIN" error={formErrors.confirmPin} required={!editTarget}>
                    <div className="relative">
                      <input type={showConfirm ? 'text' : 'password'} value={form.confirmPin} onChange={e => setF('confirmPin', e.target.value)} className="input pr-10" placeholder="Repeat PIN" />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </FormField>
                )}
              </div>
            </div>

            {serverError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm">
                {serverError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
                {saving ? <><Spinner size="sm" /> Saving…</> : editTarget ? 'Save Changes' : 'Add Staff Member'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Staff Member"
          message={`Remove ${deleteTarget.name} from staff? They will no longer be able to log in. This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {toggleTarget && (
        <ConfirmModal
          title={toggleTarget.status === 'active' ? 'Deactivate Staff' : 'Activate Staff'}
          message={
            toggleTarget.status === 'active'
              ? `Deactivate ${toggleTarget.name}? They will not be able to log in until reactivated.`
              : `Reactivate ${toggleTarget.name}? They will be able to log in again.`
          }
          confirmLabel={toggleTarget.status === 'active' ? 'Deactivate' : 'Activate'}
          variant={toggleTarget.status === 'active' ? 'danger' : 'warning'}
          onConfirm={handleToggleStatus}
          onCancel={() => setToggleTarget(null)}
        />
      )}

      {resetTarget && (
        <ResetPinModal
          staffName={resetTarget.name}
          onClose={() => setResetTarget(null)}
          onSave={handleResetPin}
        />
      )}
    </PageLayout>
  );
}

function ResetPinModal({ staffName, onClose, onSave }: { staffName: string; onClose: () => void; onSave: (pin: string) => Promise<void> }) {
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (pin.trim().length < 4) { setError('PIN must be at least 4 characters'); return; }
    if (pin !== confirm) { setError('PINs do not match'); return; }
    setSaving(true);
    await onSave(pin.trim());
    setSaving(false);
  };

  return (
    <Modal onClose={onClose} title={`Reset PIN — ${staffName}`} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">Enter a new PIN for {staffName}. Share it with them directly.</p>
        <FormField label="New PIN" required>
          <div className="relative">
            <input type={showPin ? 'text' : 'password'} value={pin} onChange={e => { setPin(e.target.value); setError(''); }} className="input pr-10" placeholder="Min. 4 characters" />
            <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </FormField>
        <FormField label="Confirm New PIN" required>
          <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }} className="input" placeholder="Repeat PIN" />
        </FormField>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
            {saving ? <><Spinner size="sm" /> Saving…</> : 'Reset PIN'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
