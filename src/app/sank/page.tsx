import { RedStanice } from "@/components/RedStanice";
import { SankDopune } from "@/components/SankDopune";
import { SmjenePanel } from "@/components/SmjenePanel";

export default function SankPage() {
  return (
    <div className="space-y-4">
      <div id="narudzbe"><RedStanice stanica="sank" naslov="Šank" /></div>
      <div className="mx-auto max-w-6xl space-y-4 px-4 pb-8">
        <div id="smjena"><SmjenePanel naslov="Preuzimanje i zatvaranje smjene" zatvaranjeDana={false} /></div>
        <div id="dopune"><SankDopune /></div>
      </div>
    </div>
  );
}
