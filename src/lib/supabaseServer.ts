import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE;

if (!url || !serviceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE env vars");
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
  db: { schema: "public" },
});
