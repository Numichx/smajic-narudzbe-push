-- Novi jelovnik (mesomix.pages.dev) koristi nazive "Miješano povrće",
-- "Pire krompir" i "Porcija pečene jagnjetine". Funkcije su kopije posljednjih
-- verzija (20261027100000, 20261027190000) s dopunjenim nazivima; stari nazivi
-- ostaju prihvaćeni radi postojećih podataka. Ista pravila priloga su u
-- src/lib/domain/besplatniPrilozi.ts.

create or replace function public.posalji_narudzbu(
  p_sto_id smallint,
  p_konobar_ime text,
  p_stavke jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sto_id smallint := p_sto_id;
  v_racun_sto_id smallint;
  v_rezultat jsonb;
  v_grupa_id uuid;
  v_stavka record;
  v_proizvod record;
  v_odabrani record;
  v_prilog record;
  v_prilozi jsonb;
  v_besplatan boolean;
  v_dozvoljeni text[];
  v_kitchen_narudzba_id uuid;
  v_broj text;
  v_source_stavka_id uuid;
  v_prilog_stavka_id uuid;
begin
  select racun.sto_id into v_racun_sto_id
  from public.racun_stolovi povezani
  join public.racuni racun on racun.id = povezani.racun_id
  where povezani.sto_id = p_sto_id
    and racun.status = 'otvoren'
  for update of racun;

  if found then
    v_sto_id := v_racun_sto_id;
  end if;

  v_rezultat := public.posalji_narudzbu_singletable(
    v_sto_id, p_konobar_ime, p_stavke
  );
  v_grupa_id := (v_rezultat ->> 'grupa_id')::uuid;
  v_broj := v_rezultat ->> 'broj';

  for v_stavka in
    select proizvod_id, kolicina, coalesce(prilozi, '[]'::jsonb) as prilozi,
      poseban_pin
    from jsonb_to_recordset(p_stavke) as stavke(
      proizvod_id uuid,
      kolicina numeric,
      prilozi jsonb,
      poseban_pin text
    )
  loop
    if jsonb_typeof(v_stavka.prilozi) is distinct from 'array' then
      raise exception 'Izbor priloga nije ispravan.';
    end if;
    if jsonb_array_length(v_stavka.prilozi) > 4 then
      raise exception 'Izbor priloga sadrži previše stavki.';
    end if;

    select kategorija_id, naziv into v_proizvod
    from public.proizvodi
    where id = v_stavka.proizvod_id and aktivan;

    v_prilozi := '[]'::jsonb;
    for v_odabrani in
      select odabrani.proizvod_id, odabrani.standard, odabrani.poseban
      from jsonb_to_recordset(v_stavka.prilozi) as odabrani(
        proizvod_id uuid,
        standard boolean,
        poseban boolean
      )
    loop
      select naziv, cijena, kategorija_id into v_prilog
      from public.proizvodi
      where id = v_odabrani.proizvod_id
        and aktivan
        and kategorija_id in ('prilozi', 'salate')
        and cijena is not null;
      if not found then
        raise exception 'Odabrani prilog ne postoji ili nema cijenu.';
      end if;

      v_dozvoljeni := array[]::text[];
      if v_proizvod.kategorija_id in ('jela-po-narudzbi', 'piletina')
        and v_proizvod.naziv not ilike '%mućkalica%'
      then
        v_dozvoljeni := array['Pomfrit'];
      elsif v_proizvod.kategorija_id = 'kuhana-jela'
        and v_proizvod.naziv ilike 'Lešo teletina%'
      then
        v_dozvoljeni := array['Miješano povrće', 'Povrće'];
      elsif v_proizvod.kategorija_id = 'kuhana-jela'
        and v_proizvod.naziv ilike 'Gulaš%'
      then
        v_dozvoljeni := array['Pire krompir', 'Pire', 'Riža', 'Makaroni'];
      elsif v_proizvod.kategorija_id = 'riba'
      then
        v_dozvoljeni := array['Pomfrit', 'Krompir salata'];
      elsif v_proizvod.kategorija_id = 'pecenja'
        and v_proizvod.naziv ilike '%teletina ispod sača%'
      then
        v_dozvoljeni := array['Pekarski krompir', 'Pomfrit'];
      elsif v_proizvod.kategorija_id = 'rostilj'
        and v_proizvod.naziv not ilike '%ćevap%'
        and v_proizvod.naziv not ilike '%sudžuk%'
      then
        v_dozvoljeni := array['Pomfrit'];
      end if;

      v_besplatan := coalesce(v_odabrani.standard, false);
      if v_besplatan and not (v_prilog.naziv = any(v_dozvoljeni)) then
        raise exception 'Ovaj prilog nije besplatan uz izabrano jelo.';
      end if;
      if coalesce(v_odabrani.poseban, false) then
        if v_besplatan then
          raise exception 'Poseban prilog ne može biti označen kao standardni.';
        end if;
        if v_stavka.poseban_pin is null
          or not public.provjeri_pin('poseban_prilog', v_stavka.poseban_pin)
        then
          raise exception 'PIN za poseban prilog nije ispravan.';
        end if;
      end if;

      v_prilozi := v_prilozi || jsonb_build_array(jsonb_build_object(
        'naziv', v_prilog.naziv,
        'cijena', case when v_besplatan then 0
          else round(v_prilog.cijena * v_stavka.kolicina, 2) end,
        'kolicina', v_stavka.kolicina,
        'poseban', coalesce(v_odabrani.poseban, false)
      ));

      v_kitchen_narudzba_id := null;
      select id into v_kitchen_narudzba_id
      from public.narudzbe
      where grupa_id = v_grupa_id and stanica = 'kuhinja';

      if v_kitchen_narudzba_id is null then
        insert into public.narudzbe (
          grupa_id, broj, racun_id, stanica, kreirao_ime
        )
        values (
          v_grupa_id,
          v_broj,
          (v_rezultat ->> 'racun_id')::uuid,
          'kuhinja',
          p_konobar_ime
        )
        returning id into v_kitchen_narudzba_id;
      end if;

      select stavka.id into v_source_stavka_id
      from public.stavke_narudzbe stavka
      join public.narudzbe narudzba on narudzba.id = stavka.narudzba_id
      where narudzba.grupa_id = v_grupa_id
        and stavka.proizvod_id = v_stavka.proizvod_id
        and coalesce(stavka.napomena, '') not like 'Prilog uz %'
      order by stavka.kreirano_at
      limit 1;

      insert into public.stavke_narudzbe (
        narudzba_id, proizvod_id, naziv, jedinica, kolicina, cijena, napomena
      )
      select
        v_kitchen_narudzba_id,
        proizvod.id,
        proizvod.naziv,
        proizvod.jedinica,
        v_stavka.kolicina,
        0,
        'Prilog uz ' || v_proizvod.naziv
      from public.proizvodi proizvod
      where proizvod.id = v_odabrani.proizvod_id
      returning id into v_prilog_stavka_id;

      insert into public.stavke_prilozi_veza (
        osnovna_stavka_id, prilog_stavka_id
      )
      values (v_source_stavka_id, v_prilog_stavka_id);
    end loop;

    update public.stavke_narudzbe
    set prilozi = v_prilozi
    where proizvod_id = v_stavka.proizvod_id
      and narudzba_id in (
        select id from public.narudzbe where grupa_id = v_grupa_id
      );
  end loop;

  return v_rezultat;
end;
$$;

revoke all on function public.posalji_narudzbu(smallint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.posalji_narudzbu(smallint, text, jsonb)
  to service_role;

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
          and (stavka.naziv ilike 'Porcija jagnjetine%'
            or stavka.naziv ilike 'Porcija pečene jagnjetine%')
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
