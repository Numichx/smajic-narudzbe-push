export type SupabaseEnvironment = {
  NODE_ENV?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export type SupabaseRuntimeConfiguration =
  | { mode: "demo" }
  | {
      mode: "supabase";
      url: string;
      publishableKey: string;
      serviceRoleKey: string;
    }
  | { mode: "misconfigured"; message: string };

function vrijednost(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function resolveSupabaseRuntimeConfiguration(
  environment: SupabaseEnvironment = process.env,
): SupabaseRuntimeConfiguration {
  const url = vrijednost(environment.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey =
    vrijednost(environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    vrijednost(environment.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  // SUPABASE_SECRET_KEY (sb_secret_...) postavlja Vercel–Supabase integracija
  // i ima prednost; SUPABASE_SERVICE_ROLE_KEY ostaje kao rezerva.
  const serviceRoleKey =
    vrijednost(environment.SUPABASE_SECRET_KEY) ||
    vrijednost(environment.SUPABASE_SERVICE_ROLE_KEY);

  if (url && publishableKey && serviceRoleKey) {
    return { mode: "supabase", url, publishableKey, serviceRoleKey };
  }

  if (
    environment.NODE_ENV === "development" &&
    !url &&
    !publishableKey &&
    !serviceRoleKey
  ) {
    return { mode: "demo" };
  }

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !publishableKey &&
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)",
    !serviceRoleKey && "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)",
  ].filter((name): name is string => Boolean(name));

  return {
    mode: "misconfigured",
    message: `Nedostaje ili je nepotpuna Supabase konfiguracija: ${missing.join(", ")}.`,
  };
}
