import type { NarudzbaStatus } from "@/lib/domain/narudzba";

type KarticaNarudzbeProps = {
  broj: string;
  status: NarudzbaStatus;
  stavke: string[];
};

export function KarticaNarudzbe({
  broj,
  status,
  stavke,
}: KarticaNarudzbeProps) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-stone-900">Narudžba {broj}</h2>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
          {status}
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-stone-600">
        {stavke.map((stavka, index) => (
          <li key={`${stavka}-${index}`}>{stavka}</li>
        ))}
      </ul>
    </article>
  );
}
