import { AdministracijaPanel } from "@/components/AdministracijaPanel";
import { OsobljePanel } from "@/components/OsobljePanel";
import { DugoviGostiju } from "@/components/DugoviGostiju";

export default function AdministracijaPage() {
  return (
    <>
      <AdministracijaPanel />
      <div className="mx-auto -mt-2 w-full max-w-5xl px-4">
        <OsobljePanel />
        <DugoviGostiju />
      </div>
    </>
  );
}
