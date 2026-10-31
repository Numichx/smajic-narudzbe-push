import { izracunajNaplatu } from "@/lib/domain/naplata";

type NaplataProps = {
  ukupno: number;
  placeno: number;
};

export function Naplata({ ukupno, placeno }: NaplataProps) {
  const rezultat = izracunajNaplatu(ukupno, placeno);

  return (
    <dl className="grid grid-cols-2 gap-2 text-sm">
      <dt className="text-stone-600">Za naplatu</dt>
      <dd className="text-right font-medium">{ukupno.toFixed(2)} KM</dd>
      <dt className="text-stone-600">Preostalo</dt>
      <dd className="text-right font-medium">{rezultat.preostalo.toFixed(2)} KM</dd>
      <dt className="text-stone-600">Kusur</dt>
      <dd className="text-right font-medium">{rezultat.kusur.toFixed(2)} KM</dd>
    </dl>
  );
}
