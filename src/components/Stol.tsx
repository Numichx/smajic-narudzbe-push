import Link from "next/link";

type StolProps = {
  id: number;
  zauzet?: boolean;
};

export function Stol({ id, zauzet = false }: StolProps) {
  return (
    <Link
      href={`/konobar/stolovi/${id}`}
      className="flex min-h-24 flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition hover:border-amber-400"
    >
      <span className="font-semibold text-stone-900">Sto {id}</span>
      <span className="text-sm text-stone-600">
        {zauzet ? "Zauzet" : "Slobodan"}
      </span>
    </Link>
  );
}
