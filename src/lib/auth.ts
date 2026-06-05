// Credential hashing utilities for business workspace identity

async function sha256(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Credential hash identifies the business workspace (all 3 fields must match) */
export async function makeCredentialHash(
  businessName: string,
  pin: string,
  secretWord: string
): Promise<string> {
  const normalized = `${businessName.trim().toLowerCase()}|${pin.trim()}|${secretWord.trim().toLowerCase()}`;
  return sha256(normalized);
}

/** Owner hash validates owner-level access (same inputs, different separator) */
export async function makeOwnerHash(
  businessName: string,
  pin: string,
  secretWord: string
): Promise<string> {
  const normalized = `owner::${businessName.trim().toLowerCase()}|${pin.trim()}|${secretWord.trim().toLowerCase()}`;
  return sha256(normalized);
}

/** Staff PIN hash — scoped to businessId so PINs are isolated per workspace */
export async function makeStaffPinHash(businessId: string, staffName: string, pin: string): Promise<string> {
  const normalized = `staff::${businessId}|${staffName.trim().toLowerCase()}|${pin.trim()}`;
  return sha256(normalized);
}

