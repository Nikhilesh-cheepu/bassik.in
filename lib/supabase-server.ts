import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseServer() {
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Storage bucket for offer posters. Create in Supabase Dashboard: Storage → New bucket → name "offers", set Public. */
export const OFFERS_BUCKET = "offers";
