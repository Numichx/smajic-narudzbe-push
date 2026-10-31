"use client";

import { useCallback, useEffect, useState } from "react";
import { brojOfflineAkcija } from "@/lib/offline/queue";
import { sinhronizujNarudzbe } from "@/lib/offline/sync";

export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [naCekanju, setNaCekanju] = useState(0);
  const [poruka, setPoruka] = useState("");

  const osvjeziBroj = useCallback(async () => {
    setNaCekanju(await brojOfflineAkcija());
  }, []);

  const sinhronizuj = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const broj = await sinhronizujNarudzbe();
      if (broj > 0) setPoruka(`Sinhronizovano narudžbi: ${broj}.`);
    } catch (error) {
      setPoruka(error instanceof Error ? error.message : "Offline red nije sinhronizovan.");
    } finally {
      await osvjeziBroj();
    }
  }, [osvjeziBroj]);

  useEffect(() => {
    function updateStatus() {
      setOnline(navigator.onLine);
      if (navigator.onLine) void sinhronizuj();
    }
    const timer = window.setTimeout(() => {
      updateStatus();
      void osvjeziBroj();
    }, 0);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    const interval = window.setInterval(() => {
      if (navigator.onLine) void sinhronizuj();
      else void osvjeziBroj();
    }, 15_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, [osvjeziBroj, sinhronizuj]);

  if (online && naCekanju === 0 && !poruka) return null;
  return (
    <aside className="fixed bottom-3 right-3 z-50 max-w-sm rounded-xl border border-stone-300 bg-white p-3 text-sm shadow-lg" aria-live="polite">
      <p className="font-semibold">{online ? "Veza je aktivna" : "Offline način"}</p>
      {naCekanju > 0 && <p>{naCekanju} narudžbi čeka sinhronizaciju.</p>}
      {poruka && <p className="mt-1 text-stone-600">{poruka}</p>}
      {online && naCekanju > 0 && <button type="button" onClick={() => void sinhronizuj()} className="mt-2 underline">Sinhronizuj sada</button>}
    </aside>
  );
}
