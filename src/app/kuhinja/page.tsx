import { ZahtjevMesnici } from "@/components/ZahtjevMesnici";
import { RedStanice } from "@/components/RedStanice";

export default function KuhinjaPage() {
  return (
    <>
      <RedStanice stanica="kuhinja" naslov="Kuhinja" />
      <div id="zahtjevi" className="mt-6">
        <ZahtjevMesnici />
      </div>
    </>
  );
}
