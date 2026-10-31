type StranicaUPripremiProps = {
  naslov: string;
  opis?: string;
};

export function StranicaUPripremi({
  naslov,
  opis = "Ovaj dio aplikacije je pripremljen za dalju implementaciju.",
}: StranicaUPripremiProps) {
  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-8 text-stone-900">
      <div className="mx-auto max-w-3xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-amber-700">Smajić · Narudžbe</p>
        <h1 className="mt-2 text-2xl font-bold">{naslov}</h1>
        <p className="mt-3 text-sm text-stone-600">{opis}</p>
      </div>
    </main>
  );
}
