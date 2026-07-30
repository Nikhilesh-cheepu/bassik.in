import { del, list } from "@vercel/blob";

/** Handoff creatives for Amit — auto-delete from Blob after this many days. */
export const TEAM_HANDOFF_BLOB_TTL_DAYS = 7;

const HANDOFF_PREFIX = "team/handoff/";

export type TeamHandoffBlobDto = {
  url: string;
  pathname: string;
  uploadedAt: string;
  size: number;
  expired: boolean;
};

function cutoffMs(ttlDays = TEAM_HANDOFF_BLOB_TTL_DAYS): number {
  return Date.now() - ttlDays * 24 * 60 * 60 * 1000;
}

/** List handoff blobs (optionally only expired). Admin purge UI. */
export async function listTeamHandoffBlobs(opts?: {
  expiredOnly?: boolean;
  ttlDays?: number;
}): Promise<TeamHandoffBlobDto[]> {
  const ttlDays = opts?.ttlDays ?? TEAM_HANDOFF_BLOB_TTL_DAYS;
  const cutoff = cutoffMs(ttlDays);
  const expiredOnly = opts?.expiredOnly !== false;
  let cursor: string | undefined;
  const out: TeamHandoffBlobDto[] = [];

  do {
    const page = await list({
      prefix: HANDOFF_PREFIX,
      cursor,
      limit: 500,
    });

    for (const blob of page.blobs) {
      const uploadedMs = new Date(blob.uploadedAt).getTime();
      const expired = Number.isFinite(uploadedMs) && uploadedMs <= cutoff;
      if (expiredOnly && !expired) continue;
      out.push({
        url: blob.url,
        pathname: blob.pathname,
        uploadedAt: new Date(blob.uploadedAt).toISOString(),
        size: blob.size,
        expired,
      });
    }

    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  out.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  return out;
}

export async function deleteTeamHandoffBlobs(urls: string[]): Promise<{
  deleted: number;
  errors: number;
}> {
  let deleted = 0;
  let errors = 0;
  for (const url of urls) {
    if (typeof url !== "string" || !url.includes("/team/handoff/")) {
      errors += 1;
      continue;
    }
    try {
      await del(url);
      deleted += 1;
    } catch {
      errors += 1;
    }
  }
  return { deleted, errors };
}

/**
 * Vercel Blob has no native TTL. Cron lists handoff uploads and deletes
 * anything older than TEAM_HANDOFF_BLOB_TTL_DAYS so storage stays free.
 */
export async function purgeExpiredTeamHandoffBlobs(): Promise<{
  deleted: number;
  errors: number;
  scanned: number;
}> {
  const expired = await listTeamHandoffBlobs({ expiredOnly: true });
  let deleted = 0;
  let errors = 0;
  for (const blob of expired) {
    try {
      await del(blob.url);
      deleted += 1;
    } catch {
      errors += 1;
    }
  }
  return { deleted, errors, scanned: expired.length };
}
