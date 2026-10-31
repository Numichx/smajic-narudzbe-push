import { PopisPecenjare } from "@/components/PopisPecenjare";
import { SmjenePanel } from "@/components/SmjenePanel";

export default function SeficaPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Smjena i zatvaranje dana</h1>
          <p>Preuzimanje smjene, popis šanka i pečenjare, zatvaranje dana.</p>
        </div>
      </div>
      <div className="split-even">
        <SmjenePanel />
        <PopisPecenjare />
      </div>
    </>
  );
}
