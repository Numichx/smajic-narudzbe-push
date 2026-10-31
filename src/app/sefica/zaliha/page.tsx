import { ZalihaPanel } from "@/components/ZalihaPanel";
import { ReceptiPanel } from "@/components/ReceptiPanel";

export default function ZalihaPage() {
  return (
    <>
      <ZalihaPanel uloga="sefica" />
      <div className="mx-auto -mt-2 mb-6 w-full max-w-5xl px-4">
        <ReceptiPanel />
      </div>
    </>
  );
}
