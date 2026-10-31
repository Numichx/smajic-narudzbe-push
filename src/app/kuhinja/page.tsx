import { ZahtjevMesnici } from "@/components/ZahtjevMesnici";
import { RedStanice } from "@/components/RedStanice";

export default function KuhinjaPage() {
  return (
    <>
      <RedStanice stanica="kuhinja" naslov="Kuhinja" />
      <div id="zahtjevi" className="mx-auto -mt-2 mb-6 w-full max-w-6xl px-4">
        <ZahtjevMesnici />
      </div>
    </>
  );
}
