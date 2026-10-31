import Link from "next/link";
import { PopisPecenjare } from "@/components/PopisPecenjare";
import { SmjenePanel } from "@/components/SmjenePanel";

export default function SeficaPage() {
  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-amber-700">Smajić · Upravljanje</p>
        <h1 className="mt-1 text-2xl font-bold">Šefica</h1>
        <nav className="my-5 flex flex-wrap gap-2">
          {[["/sefica/izvjestaj", "Izvještaji"], ["/sefica/zaliha", "Zaliha i nabavka"], ["/sefica/administracija", "Administracija"]].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-medium">{label}</Link>
          ))}
        </nav>
        <div className="mt-4">
          <PopisPecenjare />
        </div>
        <div className="mt-4">
          <SmjenePanel />
        </div>
      </div>
    </main>
  );
}
