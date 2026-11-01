import path from "node:path";
import type { NextConfig } from "next";

// Sigurnosna zaglavlja za svaki odgovor (stranice i API).
// - HSTS: preglednik uvijek koristi HTTPS (Vercel ionako preusmjerava HTTP).
// - Aplikacija se ne smije otvarati u tuđem <iframe> (zaštita od clickjackinga).
// - Kamera, mikrofon, lokacija i plaćanje iz preglednika nisu potrebni.
//   Wake Lock (ekran stanice ostaje upaljen) ostaje dozvoljen za ovu stranicu.
const SIGURNOSNA_ZAGLAVLJA = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers() {
    return [{ source: "/:path*", headers: SIGURNOSNA_ZAGLAVLJA }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
