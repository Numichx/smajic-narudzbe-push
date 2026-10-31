import Link from "next/link";

export default function KonobarPage() {
  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium text-amber-700">Smajić · Konobar</p>
        <h1 className="mt-1 text-2xl font-bold">Početna</h1>
        <nav className="mt-5 grid gap-3 sm:grid-cols-2">
          {[["/konobar/stolovi", "Stolovi i narudžbe"], ["/konobar/racuni", "Otvoreni računi"], ["/konobar/rezervacije", "Rezervacije"], ["/konobar/statistika", "Moja statistika"]].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-xl border border-stone-200 bg-white p-5 font-semibold shadow-sm">{label}</Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
