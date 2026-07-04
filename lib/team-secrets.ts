/** Shared secret for team JWT sessions and vault password encryption. */
const DEV_FALLBACK = "dev-team-secret-change-in-production";

export function teamSecretMaterial(): string {
  return (
    process.env.VAULT_ENCRYPTION_KEY?.trim() ||
    process.env.TEAM_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    DEV_FALLBACK
  );
}

export function teamSecretConfigured(): boolean {
  return !!(
    process.env.VAULT_ENCRYPTION_KEY?.trim() ||
    process.env.TEAM_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim()
  );
}

export function teamSecretForJwt(): Uint8Array {
  return new TextEncoder().encode(teamSecretMaterial());
}
