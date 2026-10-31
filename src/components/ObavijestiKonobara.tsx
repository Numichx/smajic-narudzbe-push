"use client";

import { useEffect, useRef, useState } from "react";

type Obavijest = { id: string; broj: string; stanica: string; izmijenjeno_at: string };

export function ObavijestiKonobara() {
  const [obavijest, setObavijest] = useState("");
  const [dozvola, setDozvola] = useState<NotificationPermission | "unsupported">("unsupported");
  const posljednjeVrijeme = useRef("");
  const vidjene = useRef(new Set<string>());

  useEffect(() => {
    posljednjeVrijeme.current = new Date(Date.now() - 10_000).toISOString();
    const dozvolaTimer = window.setTimeout(() => {
      setDozvola("Notification" in window ? Notification.permission : "unsupported");
    }, 0);
    let active = true;

    async function provjeri() {
      try {
        const url = new URL("/api/konobar/obavijesti", window.location.origin);
        url.searchParams.set("od", posljednjeVrijeme.current);
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return;
        const body = await response.json() as { obavijesti: Obavijest[] };
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
            oscillator.start();
            oscillator.stop(audio.currentTime + 0.18);
            void audio.close();
          } catch (error) {
            console.warn("Zvuk obavijesti nije dostupan:", error);
          }
        }
        const latest = nove.reduce((latestAt, item) =>
          item.izmijenjeno_at > latestAt ? item.izmijenjeno_at : latestAt,
        posljednjeVrijeme.current);
        posljednjeVrijeme.current = latest;
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

  async function dozvoliObavijesti() {
    if (!("Notification" in window)) {
      setDozvola("unsupported");
      return;
    }
    setDozvola(await Notification.requestPermission());
  }

  return (
    <aside className="fixed left-3 top-3 z-40 max-w-sm rounded-xl border border-stone-300 bg-white p-3 text-sm shadow-lg" aria-live="polite">
      {obavijest && <p className="font-semibold">{obavijest}</p>}
      {dozvola !== "granted" && dozvola !== "unsupported" && (
        <button type="button" onClick={() => void dozvoliObavijesti()} className="underline">
          Uključi obavijesti
        </button>
      )}
    </aside>
  );
}
