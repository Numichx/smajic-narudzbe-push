create or replace function public.izvjestaj_period(
  p_od timestamptz,
  p_do timestamptz
)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'naplaceno', coalesce((
      select sum(naplata.ukupno) from public.naplate naplata
      where naplata.kreirano_at >= p_od and naplata.kreirano_at < p_do
        and naplata.nacin <> 'dug'
    ), 0),
    'naruceno', coalesce((
      select sum(stavka.kolicina * stavka.cijena + coalesce((
        select sum((prilog ->> 'cijena')::numeric)
        from jsonb_array_elements(stavka.prilozi) as prilog
      ), 0))
      from public.narudzbe narudzba
      join public.stavke_narudzbe stavka on stavka.narudzba_id = narudzba.id
      where narudzba.kreirano_at >= p_od and narudzba.kreirano_at < p_do
        and not stavka.stornirano
        and not coalesce(stavka.napomena, '') like 'Prilog uz %'
    ), 0),
    'dug', coalesce((
      select sum(naplata.ukupno) from public.naplate naplata
      where naplata.kreirano_at >= p_od and naplata.kreirano_at < p_do
        and naplata.nacin = 'dug'
    ), 0),
    'racuni', (
      select count(*) from public.naplate naplata
      where naplata.kreirano_at >= p_od and naplata.kreirano_at < p_do
    ),
    'prosjecan_racun', coalesce((
      select avg(naplata.ukupno) from public.naplate naplata
      where naplata.kreirano_at >= p_od and naplata.kreirano_at < p_do
        and naplata.nacin <> 'dug'
    ), 0),
    'baksis', coalesce((
      select sum(naplata.baksis) from public.naplate naplata
      where naplata.kreirano_at >= p_od and naplata.kreirano_at < p_do
    ), 0),
    'otvoreni_racuni', (
      select count(*) from public.racuni where status = 'otvoren'
    ),
    'hrana', coalesce((
      select sum(stavka.kolicina * stavka.cijena + coalesce((
        select sum((prilog ->> 'cijena')::numeric)
        from jsonb_array_elements(stavka.prilozi) as prilog
      ), 0))
      from public.narudzbe narudzba
      join public.stavke_narudzbe stavka on stavka.narudzba_id = narudzba.id
      join public.proizvodi proizvod on proizvod.id = stavka.proizvod_id
      where narudzba.kreirano_at >= p_od and narudzba.kreirano_at < p_do
        and proizvod.stanica <> 'sank' and not stavka.stornirano
    ), 0),
    'pice', coalesce((
      select sum(stavka.kolicina * stavka.cijena + coalesce((
        select sum((prilog ->> 'cijena')::numeric)
        from jsonb_array_elements(stavka.prilozi) as prilog
      ), 0))
      from public.narudzbe narudzba
      join public.stavke_narudzbe stavka on stavka.narudzba_id = narudzba.id
      join public.proizvodi proizvod on proizvod.id = stavka.proizvod_id
      where narudzba.kreirano_at >= p_od and narudzba.kreirano_at < p_do
        and proizvod.stanica = 'sank' and not stavka.stornirano
    ), 0),
    'prilozi_ukupno', coalesce((
      select sum((prilog ->> 'cijena')::numeric)
      from public.narudzbe narudzba
      join public.stavke_narudzbe stavka on stavka.narudzba_id = narudzba.id
      cross join lateral jsonb_array_elements(stavka.prilozi) as prilog
      where narudzba.kreirano_at >= p_od and narudzba.kreirano_at < p_do
        and not stavka.stornirano
    ), 0),
    'prosjek_vrijeme_izdavanja_minuta', coalesce((
      select avg(extract(epoch from (narudzba.izmijenjeno_at - narudzba.kreirano_at)) / 60)
      from public.narudzbe narudzba
      where narudzba.kreirano_at >= p_od and narudzba.kreirano_at < p_do
        and narudzba.status = 'Izdato'
    ), 0),
    'marza_pecenjare',
      coalesce((
        select sum(stavka.kolicina * stavka.cijena)
        from public.narudzbe narudzba
        join public.stavke_narudzbe stavka on stavka.narudzba_id = narudzba.id
        where narudzba.stanica = 'pecenjara'
          and narudzba.status = 'Izdato'
          and narudzba.kreirano_at >= p_od and narudzba.kreirano_at < p_do
          and not stavka.stornirano
          and not coalesce(stavka.napomena, '') like 'Prilog uz %'
      ), 0)
      - coalesce((
        select sum(narudzba.cijena_pecenjari)
        from public.narudzbe narudzba
        where narudzba.stanica = 'pecenjara'
          and narudzba.status = 'Izdato'
          and narudzba.kreirano_at >= p_od and narudzba.kreirano_at < p_do
      ), 0)
      - coalesce((
        select sum(stavka.kolicina)
        from public.narudzbe narudzba
        join public.stavke_narudzbe stavka on stavka.narudzba_id = narudzba.id
        where narudzba.stanica = 'pecenjara'
          and narudzba.status = 'Izdato'
          and narudzba.kreirano_at >= p_od and narudzba.kreirano_at < p_do
          and not stavka.stornirano
          and stavka.naziv ilike 'Porcija jagnjetine%'
      ), 0),
    'po_konobaru', coalesce((
      select jsonb_agg(red) from (
        select naplatio_ime as ime,
          sum(ukupno) filter (where nacin <> 'dug') as naplaceno,
          sum(ukupno) filter (where nacin = 'dug') as dug,
          sum(baksis) as baksis,
          count(*) as broj_racuna
        from public.naplate
        where kreirano_at >= p_od and kreirano_at < p_do
        group by naplatio_ime
        order by naplaceno desc nulls last
      ) red
    ), '[]'::jsonb),
    'po_proizvodu', coalesce((
      select jsonb_agg(red) from (
        select stavka.naziv, sum(stavka.kolicina) as kolicina,
          sum(stavka.kolicina * stavka.cijena) as promet
        from public.narudzbe narudzba
        join public.stavke_narudzbe stavka on stavka.narudzba_id = narudzba.id
        where narudzba.kreirano_at >= p_od and narudzba.kreirano_at < p_do
          and not stavka.stornirano
          and not coalesce(stavka.napomena, '') like 'Prilog uz %'
        group by stavka.naziv
        order by sum(stavka.kolicina) desc
        limit 20
      ) red
    ), '[]'::jsonb),
    'po_smjeni', coalesce((
      select jsonb_agg(red) from (
        select smjena.id, smjena.oznaka, smjena.preuzeo_ime,
          smjena.pocetak_at, smjena.zatvoreno_at, smjena.predani_pazar,
          coalesce((
            select sum(naplata.ukupno)
            from public.naplate naplata
            where naplata.kreirano_at >= smjena.pocetak_at
              and naplata.kreirano_at < coalesce(smjena.zatvoreno_at, now())
              and naplata.nacin <> 'dug'
          ), 0) as naplaceno
        from public.smjene smjena
        where smjena.pocetak_at >= p_od and smjena.pocetak_at < p_do
        order by smjena.pocetak_at
      ) red
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.izvjestaj_period(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.izvjestaj_period(timestamptz, timestamptz)
  to service_role;
