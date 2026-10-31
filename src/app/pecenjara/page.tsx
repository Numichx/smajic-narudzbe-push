import { DugPecenjare } from "@/components/DugPecenjare";
import { PopisPecenjare } from "@/components/PopisPecenjare";
import { RedStanice } from "@/components/RedStanice";

export default function PecenjaraPage() {
  return (
    <>
      <div id="narudzbe"><RedStanice stanica="pecenjara" naslov="Pečenjara" /></div>
      <div className="split-even mt-6">
        <div id="smjena"><PopisPecenjare /></div>
        <div id="dug"><DugPecenjare /></div>
      </div>
    </>
  );
}
