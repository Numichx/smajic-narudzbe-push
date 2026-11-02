-- Ispravke nakon provjere cijele aplikacije.

-- 1) Stanje zalihe je stanje mesnice: mijenjaju ga isporuka kuhinji, prodaja i
--    popis. Narudžba ga više ne skida, jer je isto meso već skinuto pri isporuci.
--    Time narudžba ne može biti odbijena zbog netačnog stanja, a storno nema šta
--    da vraća. Recepti i dalje služe za prijedlog nabavke (prijedlog_nabavke).
drop trigger stavke_narudzbe_skidanje_zalihe on public.stavke_narudzbe;
drop function public.skini_zalihe_za_stavku();

-- 2) Potpuno stornirana narudžba ne smije blokirati naplatu ni čekati stanicu.
create or replace function public.plati_racun(
  p_racun_id uuid,
  p_gost_dao numeric,
  p_vraceni_kusur numeric,
  p_nacin text,
  p_naplatio_ime text,
  p_gost_duznik text default null,
  p_podijeljeno_na smallint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_racun public.racuni%rowtype;
  v_ukupno numeric(10, 2);
  v_baksis numeric(10, 2);
begin
  select * into v_racun
  from public.racuni
  where id = p_racun_id
  for update;

  if not found or v_racun.status <> 'otvoren' then
    raise exception 'Račun nije otvoren ili ne postoji.';
  end if;

  if exists (
    select 1 from public.narudzbe narudzba
    where narudzba.racun_id = p_racun_id
      and narudzba.status <> 'Izdato'
      and exists (
        select 1 from public.stavke_narudzbe stavka
        where stavka.narudzba_id = narudzba.id and not stavka.stornirano
      )
  ) then
    raise exception 'Račun se ne može naplatiti dok stanice ne izdaju sve narudžbe.';
  end if;

  v_ukupno := round(public.ukupno_racuna(p_racun_id), 2);

  if p_nacin not in ('gotovina', 'kartica', 'kombinovano', 'dug') then
    raise exception 'Nepoznat način naplate.';
  end if;

  if p_naplatio_ime is null or length(trim(p_naplatio_ime)) < 2 then
    raise exception 'Nedostaje ime osobe koja naplaćuje.';
  end if;

  if p_nacin = 'dug' then
    if p_gost_duznik is null or length(trim(p_gost_duznik)) < 2 then
      raise exception 'Za evidentiranje duga unesite ime gosta.';
    end if;
    if coalesce(p_gost_dao, 0) <> 0 or coalesce(p_vraceni_kusur, 0) <> 0 then
      raise exception 'Račun na dug ne prima gotovinsku uplatu.';
    end if;
    v_baksis := 0;
  else
    if p_gost_dao is null or p_gost_dao < v_ukupno then
      raise exception 'Gost nije dao dovoljno novca za račun.';
    end if;
    if p_vraceni_kusur is null or p_vraceni_kusur < 0
      or p_vraceni_kusur > p_gost_dao - v_ukupno
    then
      raise exception 'Vraćeni kusur nije ispravan.';
    end if;
    v_baksis := round(p_gost_dao - p_vraceni_kusur - v_ukupno, 2);
  end if;

  insert into public.naplate (
    racun_id, ukupno, gost_dao, kusur, baksis, nacin, gost_duznik, naplatio_ime
  )
  values (
    p_racun_id, v_ukupno, coalesce(p_gost_dao, 0),
    coalesce(p_vraceni_kusur, 0), v_baksis, p_nacin,
    nullif(trim(p_gost_duznik), ''), trim(p_naplatio_ime)
  );

  update public.racuni
  set status = case when p_nacin = 'dug' then 'na_dug' else 'placen' end,
      gost_duznik = nullif(trim(p_gost_duznik), ''),
      podijeljeno_na = p_podijeljeno_na,
      zatvoren_at = now()
  where id = p_racun_id;

  -- Preostale su samo potpuno stornirane narudžbe; sklanjaju se sa stanica.
  update public.narudzbe
  set status = 'Izdato'
  where racun_id = p_racun_id and status <> 'Izdato';

  delete from public.racun_stolovi where racun_id = p_racun_id;

  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  )
  values (
    trim(p_naplatio_ime), 'konobar', 'naplata', 'racun', p_racun_id::text,
    jsonb_build_object('ukupno', v_ukupno, 'nacin', p_nacin, 'baksis', v_baksis)
  );

  return jsonb_build_object(
    'racun_id', p_racun_id,
    'ukupno', v_ukupno,
    'kusur', coalesce(p_vraceni_kusur, 0),
    'baksis', v_baksis,
    'status', case when p_nacin = 'dug' then 'na_dug' else 'placen' end
  );
end;
$$;

-- Stanica potpuno storniranu narudžbu sklanja jednim potezom, bez cijene i težine.
create or replace function public.promijeni_status_narudzbe(
  p_narudzba_id uuid,
  p_uloga text,
  p_novi_status text,
  p_cijena_pecenjari numeric,
  p_akter_ime text,
  p_jagnjetina_kg numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_narudzba public.narudzbe%rowtype;
  v_do_statusa text;
  v_jagnjetina public.stavke_narudzbe%rowtype;
  v_ima_jagnjetine boolean;
begin
  select * into v_narudzba
  from public.narudzbe
  where id = p_narudzba_id
  for update;
  if not found then raise exception 'Narudžba nije pronađena.'; end if;

  if p_uloga <> v_narudzba.stanica then
    raise exception 'Ova stanica ne može mijenjati narudžbu.';
  end if;
  if p_akter_ime is null or length(trim(p_akter_ime)) < 2 then
    raise exception 'Nedostaje ime osobe koja mijenja status.';
  end if;

  v_do_statusa := case
    when p_uloga in ('kuhinja', 'sank') and v_narudzba.status = 'Novo'
      and p_novi_status = 'U pripremi' then p_novi_status
    when p_uloga in ('kuhinja', 'sank') and v_narudzba.status = 'U pripremi'
      and p_novi_status = 'Izdato' then p_novi_status
    when p_uloga = 'pecenjara' and v_narudzba.status = 'Novo'
      and p_novi_status = 'U pripremi' then p_novi_status
    when p_uloga = 'pecenjara' and v_narudzba.status = 'U pripremi'
      and p_novi_status = 'Gotovo' then p_novi_status
    when p_uloga = 'pecenjara' and v_narudzba.status = 'Gotovo'
      and p_novi_status = 'Izdato' then p_novi_status
    when p_novi_status = 'Izdato' and v_narudzba.status <> 'Izdato'
      and not exists (
        select 1 from public.stavke_narudzbe stavka
        where stavka.narudzba_id = p_narudzba_id and not stavka.stornirano
      ) then p_novi_status
    else null
  end;
  if v_do_statusa is null then
    raise exception 'Nije dozvoljen prelaz sa "%" na "%".',
      v_narudzba.status, p_novi_status;
  end if;

  if p_uloga = 'pecenjara' and v_do_statusa = 'Gotovo' then
    if p_cijena_pecenjari is null or p_cijena_pecenjari < 0 then
      raise exception 'Unesite cijenu koju konobar plaća pečenjari.';
    end if;
    select * into v_jagnjetina
    from public.stavke_narudzbe
    where narudzba_id = p_narudzba_id
      and jedinica = 'kg'
      and lower(naziv) like '%jagnjetina%'
      and not stornirano
    for update;
    v_ima_jagnjetine := found;
    if v_ima_jagnjetine then
      if p_jagnjetina_kg is null or p_jagnjetina_kg < 0 or p_jagnjetina_kg > 9999 then
        raise exception 'Unesite stvarnu količinu jagnjetine u kilogramima.';
      end if;
      insert into public.uskladjenja_jagnjetine (
        narudzba_id, stavka_id, naruceno_kg, dato_kg,
        cijena_po_kg, evidentirao_ime
      ) values (
        p_narudzba_id, v_jagnjetina.id, v_jagnjetina.kolicina,
        p_jagnjetina_kg, v_jagnjetina.cijena, trim(p_akter_ime)
      );
      update public.stavke_narudzbe
      set kolicina = p_jagnjetina_kg
      where id = v_jagnjetina.id;
    end if;
    update public.narudzbe
    set status = v_do_statusa, cijena_pecenjari = p_cijena_pecenjari
    where id = p_narudzba_id;
  else
    update public.narudzbe set status = v_do_statusa
    where id = p_narudzba_id;
  end if;

  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  )
  values (
    trim(p_akter_ime), p_uloga, 'promjena statusa', 'narudzba',
    p_narudzba_id::text,
    jsonb_build_object(
      'od', v_narudzba.status,
      'do', v_do_statusa,
      'cijena_pecenjari', case when v_do_statusa = 'Gotovo'
        then p_cijena_pecenjari else v_narudzba.cijena_pecenjari end,
      'jagnjetina_kg', case when v_ima_jagnjetine then p_jagnjetina_kg else null end
    )
  );

  return jsonb_build_object(
    'id', p_narudzba_id,
    'stanica', v_narudzba.stanica,
    'status', v_do_statusa,
    'cijena_pecenjari', case when v_do_statusa = 'Gotovo'
      then p_cijena_pecenjari else v_narudzba.cijena_pecenjari end,
    'jagnjetina_kg', case when v_ima_jagnjetine then p_jagnjetina_kg else null end
  );
end;
$$;

-- 3) Prilog uz jelo koje se naplaćuje po kilogramu je jedna porcija, a ne
--    0,3 porcije po cijeni od 30 %. Prilozi se upisuju samo na glavnu stavku.
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
  v_kolicina_priloga numeric;
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

    select kategorija_id, naziv, jedinica into v_proizvod
    from public.proizvodi
    where id = v_stavka.proizvod_id and aktivan;

    v_kolicina_priloga := case when v_proizvod.jedinica = 'kg' then 1
      else v_stavka.kolicina end;

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
          else round(v_prilog.cijena * v_kolicina_priloga, 2) end,
        'kolicina', v_kolicina_priloga,
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
        v_kolicina_priloga,
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
      and coalesce(napomena, '') not like 'Prilog uz %'
      and narudzba_id in (
        select id from public.narudzbe where grupa_id = v_grupa_id
      );
  end loop;

  return v_rezultat;
end;
$$;

-- 4) Poslovni dan se računa po vremenu restorana, a ne po UTC-u baze.
create or replace function public.zatvori_dan(p_akter_ime text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_datum date := (now() at time zone 'Europe/Sarajevo')::date;
  v_ukupno numeric(12, 2);
  v_broj integer;
begin
  if exists (select 1 from public.racuni where status = 'otvoren') then
    raise exception 'Dan se ne može zatvoriti dok postoje otvoreni računi.';
  end if;

  select coalesce(sum(ukupno), 0), count(*)
    into v_ukupno, v_broj
  from public.naplate
  where (kreirano_at at time zone 'Europe/Sarajevo')::date = v_datum
    and nacin <> 'dug';

  insert into public.dnevni_zakljucci (
    datum, zakljucio_ime, ukupno_naplaceno, broj_racuna
  )
  values (v_datum, trim(p_akter_ime), v_ukupno, v_broj)
  on conflict (datum) do update
  set zakljucio_ime = excluded.zakljucio_ime,
      ukupno_naplaceno = excluded.ukupno_naplaceno,
      broj_racuna = excluded.broj_racuna,
      kreirano_at = now();

  return jsonb_build_object(
    'datum', v_datum, 'ukupno_naplaceno', v_ukupno, 'broj_racuna', v_broj
  );
end;
$$;

-- 5) Ograničenje PIN pokušaja po poznatom uređaju. Uređaj koji se već uspješno
--    prijavio ima potpisani kolačić i zaključava samo sebe (5 neuspjeha), pa ni
--    greške drugih uređaja na istom ruteru ni pokušaji s interneta ne mogu
--    zaključati tablete restorana. Nepoznati uređaji i dalje imaju ograničenje
--    po IP adresi (5) i ukupno (30), a računaju se samo njihovi pokušaji.
alter table public.pin_pokusaji add column uredjaj text;

create index pin_pokusaji_uredjaj_vrijeme_idx
  on public.pin_pokusaji (uredjaj, kreirano_at)
  where uredjaj is not null;

drop function public.provjeri_ogranicenje_pina(text);
drop function public.zabiljezi_pin_pokusaj(text, boolean);

-- Vraća broj sekundi do otključavanja (0 = prijava je dozvoljena).
create function public.provjeri_ogranicenje_pina(
  p_ip text,
  p_uredjaj text default null
)
returns integer
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_prozor constant interval := interval '15 minutes';
  v_ip text := coalesce(p_ip, 'nepoznat');
  v_od timestamptz := now() - v_prozor;
  v_ip_od timestamptz;
  v_ip_broj integer;
  v_ip_najstariji timestamptz;
  v_svi_broj integer;
  v_svi_najstariji timestamptz;
  v_uredjaj_od timestamptz;
  v_uredjaj_broj integer;
  v_uredjaj_najstariji timestamptz;
  v_cekanje integer := 0;
begin
  if p_uredjaj is not null then
    select greatest(v_od, coalesce(max(kreirano_at), v_od)) into v_uredjaj_od
    from public.pin_pokusaji
    where uredjaj = p_uredjaj and uspjesan and kreirano_at > v_od;

    select count(*), min(kreirano_at) into v_uredjaj_broj, v_uredjaj_najstariji
    from public.pin_pokusaji
    where uredjaj = p_uredjaj and not uspjesan and kreirano_at > v_uredjaj_od;

    if v_uredjaj_broj >= 5 then
      v_cekanje := ceil(extract(epoch from (v_uredjaj_najstariji + v_prozor - now())))::integer;
    end if;
    return greatest(v_cekanje, 0);
  end if;

  select greatest(v_od, coalesce(max(kreirano_at), v_od)) into v_ip_od
  from public.pin_pokusaji
  where ip = v_ip and uspjesan and kreirano_at > v_od;

  select count(*), min(kreirano_at) into v_ip_broj, v_ip_najstariji
  from public.pin_pokusaji
  where ip = v_ip and not uspjesan and uredjaj is null and kreirano_at > v_ip_od;

  if v_ip_broj >= 5 then
    v_cekanje := greatest(v_cekanje,
      ceil(extract(epoch from (v_ip_najstariji + v_prozor - now())))::integer);
  end if;

  select count(*), min(kreirano_at) into v_svi_broj, v_svi_najstariji
  from public.pin_pokusaji
  where not uspjesan and uredjaj is null and kreirano_at > v_od;

  if v_svi_broj >= 30 then
    v_cekanje := greatest(v_cekanje,
      ceil(extract(epoch from (v_svi_najstariji + v_prozor - now())))::integer);
  end if;

  return greatest(v_cekanje, 0);
end;
$$;

create function public.zabiljezi_pin_pokusaj(
  p_ip text,
  p_uspjesan boolean,
  p_uredjaj text default null
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.pin_pokusaji (ip, uspjesan, uredjaj)
  values (coalesce(p_ip, 'nepoznat'), coalesce(p_uspjesan, false), p_uredjaj);
$$;

revoke all on function public.provjeri_ogranicenje_pina(text, text)
  from public, anon, authenticated;
grant execute on function public.provjeri_ogranicenje_pina(text, text) to service_role;

revoke all on function public.zabiljezi_pin_pokusaj(text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.zabiljezi_pin_pokusaj(text, boolean, text) to service_role;
