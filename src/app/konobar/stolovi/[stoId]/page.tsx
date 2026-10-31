import { Suspense } from "react";
import { StranicaUPripremi } from "@/components/StranicaUPripremi";
import { NarudzbaEditor } from "@/components/NarudzbaEditor";

export default function StoPage({
  params,
}: PageProps<"/konobar/stolovi/[stoId]">) {
  return (
    <Suspense fallback={<StranicaUPripremi naslov="Učitavanje stola..." />}>
      <StoDetalji params={params} />
    </Suspense>
  );
}

async function StoDetalji({
  params,
}: {
  params: Promise<{ stoId: string }>;
}) {
  const { stoId } = await params;
  const id = Number(stoId);

  if (!Number.isInteger(id) || id < 1 || id > 20) {
    return <StranicaUPripremi naslov="Nepoznat sto" opis="Odaberite sto od 1 do 20." />;
  }

  return <NarudzbaEditor stoId={id} />;
}
