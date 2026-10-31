import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import {
  isUlogaZaposlenika,
  type UlogaZaposlenika,
} from "@/lib/auth/session";

export default function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginPageContent({
  searchParams,
}: {
  searchParams: Promise<{ uloga?: string | string[] }>;
}) {
  const { uloga } = await searchParams;

  if (!isUlogaZaposlenika(uloga)) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-100 px-4 py-8">
        <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-stone-900">Odaberite ulogu</h1>
          <p className="mt-2 text-sm text-stone-600">
            Za prijavu prvo odaberite svoju ulogu.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-500 px-5 font-semibold text-white hover:bg-amber-600"
          >
            Odaberi ulogu
          </Link>
        </section>
      </main>
    );
  }

  const naziviUloga: Record<UlogaZaposlenika, string> = {
    konobar: "Konobar",
    kuhinja: "Kuhinja",
    pecenjara: "Pečenjara",
    sank: "Šank",
    mesnica: "Mesnica",
    sefica: "Šefica",
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-stone-600 hover:text-stone-900">
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500 font-bold text-white">S</span>
          <span>Smajić POS</span>
        </Link>
        <div className="mt-8">
          <p className="text-sm font-semibold text-amber-700">Prijava · Smajić POS</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">{naziviUloga[uloga]}</h1>
          <p className="mt-1 text-sm text-stone-500">Unesite ime i PIN za početak smjene.</p>
        </div>
        <LoginForm uloga={uloga satisfies UlogaZaposlenika} />
        <Link href="/" className="mt-5 block text-center text-sm font-semibold text-stone-500 hover:text-stone-800">
          Promijeni ulogu
        </Link>
      </section>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 px-4 py-8">
      <p className="text-sm text-stone-600">Učitavanje prijave...</p>
    </main>
  );
}
