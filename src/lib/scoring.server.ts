// Supabase-based scoring pipeline removed.
// AI scoring is now applied locally in applications.functions.ts on submission.
// This file is kept as a stub to avoid import errors.
export async function scoreApplicationInternal(_applicationId: string): Promise<void> {
  // No-op: scoring happens inline in submitApplication (applications.functions.ts)
  return;
}
