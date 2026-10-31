import { RedStanice } from "@/components/RedStanice";
import { SankDopune } from "@/components/SankDopune";
import { SmjenePanel } from "@/components/SmjenePanel";

export default function SankPage() {
  return (
    <>
      <div id="narudzbe"><RedStanice stanica="sank" naslov="Šank" /></div>
      <div className="stack mt-6">
        <div id="smjena"><SmjenePanel naslov="Preuzimanje i zatvaranje smjene" zatvaranjeDana={false} /></div>
        <div id="dopune"><SankDopune /></div>
      </div>
    </>
  );
}
