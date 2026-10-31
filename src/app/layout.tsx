import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { OfflineStatus } from "@/components/OfflineStatus";
import { DemoStatus } from "@/components/DemoStatus";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Smajić | Narudžbe",
  description: "Sistem za narudžbe restorana Smajić",
};

// Tema se postavlja prije prvog prikaza da ne bljesne pogrešna boja.
const POSTAVI_TEMU = `(function(){try{var t=localStorage.getItem('smajic-theme');if(!t)t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bs" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: POSTAVI_TEMU }} />
      </head>
      <body className="screen">
        <DemoStatus />
        {children}
        <OfflineStatus />
      </body>
    </html>
  );
}
