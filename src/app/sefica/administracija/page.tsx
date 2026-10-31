import { AdministracijaPanel } from "@/components/AdministracijaPanel";
import { OsobljePanel } from "@/components/OsobljePanel";
import { DugoviGostiju } from "@/components/DugoviGostiju";

export default function AdministracijaPage() {
  return (
    <>
      <AdministracijaPanel />
      <OsobljePanel />
      <DugoviGostiju />
    </>
  );
}
