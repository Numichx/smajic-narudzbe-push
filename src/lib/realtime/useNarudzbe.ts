"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function useNarudzbe(onPromjena: () => void): void {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const kanal = supabase
      .channel("narudzbe-promjene")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "narudzbe" },
        onPromjena,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(kanal);
    };
  }, [onPromjena]);
}
