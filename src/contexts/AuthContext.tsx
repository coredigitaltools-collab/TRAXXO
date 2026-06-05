import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthSession, LoginCredentials } from '../types';
import { makeCredentialHash, makeOwnerHash, makeStaffPinHash } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { ls } from '../lib/storage';

interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  login: (creds: LoginCredentials) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => ls.get<AuthSession>('session'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) ls.set('session', session);
    else ls.remove('session');
  }, [session]);

  const login = async (creds: LoginCredentials): Promise<{ error?: string }> => {
    setLoading(true);
    try {
      if (creds.role === 'owner') {
        const credHash = await makeCredentialHash(creds.businessName, creds.pin, creds.secretWord);
        const ownerHash = await makeOwnerHash(creds.businessName, creds.pin, creds.secretWord);

        const { data: existing } = await supabase
          .from('businesses')
          .select('id, name, owner_hash')
          .eq('credential_hash', credHash)
          .maybeSingle();

        if (!existing) {
          const { data: created, error } = await supabase
            .from('businesses')
            .insert({ name: creds.businessName.trim(), credential_hash: credHash, owner_hash: ownerHash })
            .select('id, name')
            .single();
          if (error) return { error: 'Failed to create workspace. Check your connection.' };
          setSession({ businessId: created.id, businessName: created.name, role: 'owner' });
          return {};
        }

        if (existing.owner_hash !== ownerHash) {
          return { error: 'Invalid credentials. Please check your PIN and Secret Word.' };
        }
        setSession({ businessId: existing.id, businessName: existing.name, role: 'owner' });
        return {};

      } else {
        const staffName = creds.staffName?.trim() ?? '';
        const staffPin = creds.staffPin?.trim() ?? '';

        if (!staffName) return { error: 'Staff name is required.' };
        if (!staffPin) return { error: 'Staff PIN is required.' };

        const { data: business } = await supabase
          .from('businesses')
          .select('id, name')
          .ilike('name', creds.businessName.trim())
          .maybeSingle();

        if (!business) {
          return { error: 'Business not found. Ask the owner to set up the workspace first.' };
        }

        const pinHash = await makeStaffPinHash(business.id, staffName, staffPin);

        const { data: staff } = await supabase
          .from('staff_members')
          .select('id, name, role, status')
          .eq('business_id', business.id)
          .eq('pin_hash', pinHash)
          .maybeSingle();

        if (!staff) {
          return { error: 'Invalid credentials. Check your name and PIN, or contact the owner.' };
        }
        if (staff.status !== 'active') {
          return { error: 'Your account has been deactivated. Contact the business owner.' };
        }

        setSession({
          businessId: business.id,
          businessName: business.name,
          role: 'staff',
          staffName: staff.name,
          staffId: staff.id,
          staffRole: staff.role,
        });
        return {};
      }
    } catch {
      const stored = ls.get<{ credHash: string; businessId: string; businessName: string }>('offline_business');
      if (stored && creds.role === 'owner') {
        const credHash = await makeCredentialHash(creds.businessName, creds.pin, creds.secretWord);
        if (stored.credHash === credHash) {
          setSession({ businessId: stored.businessId, businessName: stored.businessName, role: 'owner' });
          return {};
        }
      }
      return { error: 'Connection failed. Please check your internet connection.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setSession(null);
    ls.remove('session');
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
