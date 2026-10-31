import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseRuntimeConfiguration } from "./config";

export function createSupabaseAdminClient() {
  const configuration = resolveSupabaseRuntimeConfiguration();

  if (configuration.mode === "demo") {
    return null;
  }

  if (configuration.mode === "misconfigured") {
    throw new Error(configuration.message);
  }

  return createClient(configuration.url, configuration.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
