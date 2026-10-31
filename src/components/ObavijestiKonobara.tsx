"use client";

import { useEffect, useRef, useState } from "react";

type Obavijest = { id: string; broj: string; stanica: string; izmijenjeno_at: string };

export function ObavijestiKonobara() {
  const [obavijest, setObavijest] = useState("");
  const [dozvola, setDozvola] = useState<NotificationPermission | "unsupported">("unsupported");
  const posljednjeVrijeme = useRef("");
  const vidjene = useRef(new Set<string>());

  useEffect(() => {
    const dozvolaTimer = window.setTimeout(() => {
      setDozvola("Notification" in window ? Notification.permission : "unsupported");
    }, 0);
    let active = true;

    async function provjeri() {
      try {
        const url = new URL("/api/konobar/obavijesti", window.location.origin);
        if (posljednjeVrijeme.current) url.searchParams.set("od", posljednjeVrijeme.current);
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { obavijesti: Obavijest[]; sada: string };
        // Preklapanje od 15 s pokriva narudžbe izdate dok je upit trajao;
        // duplikate uklanja skup već viđenih.
        posljednjeVrijeme.current = new Date(Date.parse(body.sada) - 15_000).toISOString();
        const nove = body.obavijesti.filter((item) => !vidjene.current.has(item.id));
        if (!active || nove.length === 0) return;

        for (const item of nove) {
          vidjene.current.add(item.id);
          setObavijest(`${item.broj} je izdata iz stanice ${item.stanica}.`);
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Narudžba je izdata", {
              body: `${item.broj} · ${item.stanica}`,
              tag: `narudzba-${item.id}`,
            });
          }
          try {
            const audio = new AudioContext();
            const oscillator = audio.createOscillator();
            const gain = audio.createGain();
            oscillator.frequency.value = 880;
            gain.gain.value = 0.1;
            oscillator.connect(gain);
            gain.connect(audio.destination);
            oscillator.onended = () => void audio.close();
            oscillator.start();
            oscillator.stop(audio.currentTime + 0.18);
          } catch (error) {
            console.warn("Zvuk obavijesti nije dostupan:", error);
          }
        }
      } catch {
        // Polling is retried on the next interval; the order remains available on the table.
      }
    }

    void provjeri();
    const interval = window.setInterval(() => void provjeri(), 10_000);
    return () => {
      active = false;
      window.clearTimeout(dozvolaTimer);
      window.clearInterval(interval);
    };
  }, []);

  // Obavijest nestaje sama da ne prekriva ekran.
  useEffect(() => {
    if (!obavijest) return;
    const timer = window.setTimeout(() => setObavijest(""), 10_000);
    return () => window.clearTimeout(timer);
  }, [obavijest]);

  async function dozvoliObavijesti() {
    if (!("Notification" in window)) {
      setDozvola("unsupported");
      return;
    }
    setDozvola(await Notification.requestPermission());
  }

  const traziDozvolu = dozvola !== "granted" && dozvola !== "unsupported";
  if (!obavijest && !traziDozvolu) return null;
  return (
    <aside className="alert alert-ok" style={{ position: "fixed", left: 12, bottom: 88, zIndex: 40, maxWidth: 360, flexDirection: "column", boxShadow: "var(--sh-2)" }} aria-live="polite">
      {obavijest && <b>{obavijest}</b>}
      {traziDozvolu && (
        <button type="button" onClick={() => void dozvoliObavijesti()} className="btn-link" style={{ textAlign: "left" }}>
          Uključi obavijesti
        </button>
      )}
    </aside>
  );
}
