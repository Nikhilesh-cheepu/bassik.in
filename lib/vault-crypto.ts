import crypto from "crypto";
import { teamSecretMaterial } from "@/lib/team-secrets";

function vaultKey(): Buffer {
  return crypto.createHash("sha256").update(teamSecretMaterial()).digest();
}

export function encryptVaultSecret(plaintext: string): string {
  const key = vaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptVaultSecret(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, "base64");
  if (buf.length < 29) throw new Error("Invalid vault ciphertext");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const key = vaultKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
