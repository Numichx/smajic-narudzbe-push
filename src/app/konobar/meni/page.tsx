import Link from "next/link";

export default function MeniPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-medium text-amber-700">Smajić · Konobar</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">Meni</h1>
        <p className="mt-3 text-sm text-stone-600">
          Za unos narudžbe prvo odaberite sto.
        </p>
        <Link
          href="/konobar/stolovi"
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-500 px-5 font-semibold text-white hover:bg-amber-600"
        >
          Odaberi sto
        </Link>
      </section>
    </main>
  );
}
