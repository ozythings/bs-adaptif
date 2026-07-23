export interface Versioned {
  id: number;
  version?: number;
  updatedAt?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  currentVersion?: number;
  incomingVersion?: number;
  message: string;
}

export function detectConflict(
  existing: Versioned | undefined,
  incoming: Versioned
): ConflictResult {
  if (!existing) {
    return { hasConflict: false, message: '' };
  }

  const existingVer = existing.version ?? 0;
  const incomingVer = incoming.version ?? 0;

  if (incomingVer < existingVer) {
    return {
      hasConflict: true,
      currentVersion: existingVer,
      incomingVersion: incomingVer,
      message: 'Bu kayıt daha güncel bir versiyona sahip. Sayfayı yenileyin.'
    };
  }

  return { hasConflict: false, message: '' };
}

export function generateConflictError(result: ConflictResult): Error {
  return new Error(result.message);
}
