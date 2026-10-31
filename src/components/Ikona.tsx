import type { ReactNode } from "react";

// Ikone iz dizajn sistema Smajić POS (24×24, linijske; boja i debljina iz CSS-a).
const PUTANJE = {
  stolovi: <path d="M3 10h18M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M6 10v9M18 10v9" />,
  narudzba: <><path d="M9 5h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><path d="M9 3h6v4H9zM9 12h6M9 16h4" /></>,
  racuni: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></>,
  rezervacije: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 11h18" /></>,
  statistika: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  narudzbe: <path d="M4 4h16v6H4zM4 14h16v6H4z" />,
  zbirno: <path d="M4 6h16M4 12h16M4 18h10" />,
  mesnica: <path d="M4 20 20 4M9 4h11v11" />,
  smjena: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  dug: <path d="M12 3v18M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />,
  stanje: <><path d="M3 8l9-5 9 5v8l-9 5-9-5V8Z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
  prodaja: <><path d="M12 3v18M7 21h10M5 8h14" /><path d="M5 8 2 15h6L5 8ZM19 8l-3 7h6l-3-7Z" /></>,
  administracija: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  zatvaranje: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></>,
  recepti: <><path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4V4Z" /><path d="M20 4h-3a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h4V4Z" /></>,
  prebaci: <path d="M4 8h13l-3-3M20 16H7l3 3" />,
  stampa: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="7" rx="1" /></>,
  storno: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
  offline: <><path d="M2 8.5a16 16 0 0 1 20 0M5.5 12a11 11 0 0 1 13 0M9 15.5a6 6 0 0 1 6 0" /><circle cx="12" cy="19" r="1" /></>,
  odjava: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  upozorenje: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  osvjezi: <path d="M20 11a8 8 0 0 0-14.9-4M4 4v4h4M4 13a8 8 0 0 0 14.9 4M20 20v-4h-4" />,
  konobar: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  kuhinja: <><path d="M6 13h12v7H6z" /><path d="M6 13a4 4 0 1 1 2.5-7.1A4 4 0 0 1 16 6a3.5 3.5 0 1 1 2 7" /></>,
  pecenjara: <path d="M12 3c-3 4-5 6-5 10a5 5 0 0 0 10 0c0-2-1-4-3-6 0 3-2 4-2 4s1-4 0-8z" />,
  sank: <><path d="M6 3h9v18H6z" /><path d="M15 8h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" /></>,
  sefica: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  mjesec: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
  sunce: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></>,
} satisfies Record<string, ReactNode>;

export type NazivIkone = keyof typeof PUTANJE;

export function Ikona({ naziv, className }: { naziv: NazivIkone; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {PUTANJE[naziv]}
    </svg>
  );
}
