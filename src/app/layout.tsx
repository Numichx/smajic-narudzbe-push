import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { OfflineStatus } from "@/components/OfflineStatus";
import { DemoStatus } from "@/components/DemoStatus";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smajić | Narudžbe",
  description: "Sistem za narudžbe restorana Smajić",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bs"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <DemoStatus />
        {children}
        <OfflineStatus />
      </body>
    </html>
  );
}
