type StranicaUPripremiProps = {
  naslov: string;
  opis?: string;
};

export function StranicaUPripremi({
  naslov,
  opis = "Ovaj dio aplikacije je pripremljen za dalju implementaciju.",
}: StranicaUPripremiProps) {
  return (
    <main className="contents">
      <div className="card card-pad">
        <p className="section-sub">Smajić · Narudžbe</p>
        <h1 className="page-title mt-2">{naslov}</h1>
        <p className="small muted mt-3">{opis}</p>
      </div>
    </main>
  );
}
