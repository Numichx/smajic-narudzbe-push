alter table public.racuni
  drop constraint racuni_status_check;

alter table public.racuni
  add constraint racuni_status_check
  check (status in ('otvoren', 'placen', 'na_dug', 'spojen'));

alter table public.racuni
  add column podijeljeno_na smallint check (podijeljeno_na is null or podijeljeno_na > 0);

create table public.racun_stolovi (
  racun_id uuid not null references public.racuni(id) on delete cascade,
  sto_id smallint not null references public.stolovi(id),
  primary key (racun_id, sto_id),
  unique (sto_id)
);

insert into public.racun_stolovi (racun_id, sto_id)
select id, sto_id from public.racuni
where status = 'otvoren'
on conflict (sto_id) do nothing;

create table public.dnevni_zakljucci (
  id uuid primary key default gen_random_uuid(),
  datum date not null unique,
  zakljucio_ime text not null,
  ukupno_naplaceno numeric(12, 2) not null default 0,
  broj_racuna integer not null default 0,
  detalji jsonb not null default '{}'::jsonb,
  kreirano_at timestamptz not null default now()
);

create table public.potrosnja_zaliha (
  id bigint generated always as identity primary key,
  narudzba_id uuid not null references public.narudzbe(id),
  stavka_id uuid not null references public.stavke_narudzbe(id),
  zaliha_id uuid not null references public.zaliha_artikli(id),
  kolicina numeric(12, 3) not null check (kolicina > 0),
  kreirano_at timestamptz not null default now(),
  unique (stavka_id, zaliha_id)
);

create index potrosnja_zaliha_narudzba_idx
  on public.potrosnja_zaliha (narudzba_id);

create or replace function public.osiguraj_racun_stol()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'otvoren' then
    insert into public.racun_stolovi (racun_id, sto_id)
    values (new.id, new.sto_id)
    on conflict (sto_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger racun_stolovi_novi_racun
  after insert on public.racuni
  for each row execute function public.osiguraj_racun_stol();

create or replace function public.ukupno_racuna(p_racun_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(sum(
    case when stavka.stornirano then 0 else
      stavka.kolicina * stavka.cijena
      + coalesce((
        select sum((prilog ->> 'cijena')::numeric)
        from jsonb_array_elements(stavka.prilozi) as prilog
      ), 0)
    end
  ), 0)
  from public.narudzbe narudzba
  join public.stavke_narudzbe stavka on stavka.narudzba_id = narudzba.id
  where narudzba.racun_id = p_racun_id;
$$;

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
    select 1 from public.narudzbe
    where racun_id = p_racun_id and status <> 'Izdato'
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

create or replace function public.storniraj_stavku(
  p_stavka_id uuid,
  p_razlog text,
  p_akter_ime text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_stavka public.stavke_narudzbe%rowtype;
  v_racun_id uuid;
begin
  select stavka.* into v_stavka
  from public.stavke_narudzbe stavka
  join public.narudzbe narudzba on narudzba.id = stavka.narudzba_id
  join public.racuni racun on racun.id = narudzba.racun_id
  where stavka.id = p_stavka_id and racun.status = 'otvoren'
  for update of stavka;

  if not found or v_stavka.stornirano then
    raise exception 'Stavka nije pronađena ili je već stornirana.';
  end if;

  if p_razlog not in ('Pogrešan unos', 'Gost odustao', 'Greška kuhinje', 'Drugo') then
    raise exception 'Nepoznat razlog storna.';
  end if;
  if p_akter_ime is null or length(trim(p_akter_ime)) < 2 then
    raise exception 'Nedostaje ime osobe koja stornira.';
  end if;

  select narudzba.racun_id into v_racun_id
  from public.narudzbe narudzba where narudzba.id = v_stavka.narudzba_id;

  update public.stavke_narudzbe
  set stornirano = true,
      storno_razlog = p_razlog,
      storno_vrijednost = round(v_stavka.cijena * v_stavka.kolicina, 2),
      stornirano_at = now(),
      cijena = 0
  where id = p_stavka_id;

  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  )
  values (
    trim(p_akter_ime), 'konobar', 'storno', 'stavka_narudzbe', p_stavka_id::text,
    jsonb_build_object(
      'razlog', p_razlog,
      'vrijednost', round(v_stavka.cijena * v_stavka.kolicina, 2),
      'racun_id', v_racun_id
    )
  );

  return jsonb_build_object(
    'stavka_id', p_stavka_id,
    'stornirano', true,
    'razlog', p_razlog
  );
end;
$$;

create or replace function public.premjesti_ili_spoji_sto(
  p_sto_iz smallint,
  p_sto_u smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_iz uuid;
  v_u uuid;
begin
  if p_sto_iz = p_sto_u then
    raise exception 'Izaberite dva različita stola.';
  end if;

  perform id from public.stolovi
  where id in (p_sto_iz, p_sto_u)
  order by id
  for update;

  select racun.id into v_iz
  from public.racuni racun
  join public.racun_stolovi rs on rs.racun_id = racun.id
  where rs.sto_id = p_sto_iz and racun.status = 'otvoren'
  for update of racun;

  if v_iz is null then
    raise exception 'Izvorni sto nema otvoren račun.';
  end if;

  select racun.id into v_u
  from public.racuni racun
  join public.racun_stolovi rs on rs.racun_id = racun.id
  where rs.sto_id = p_sto_u and racun.status = 'otvoren'
  for update of racun;

  if v_u is null then
    update public.racun_stolovi set sto_id = p_sto_u
    where racun_id = v_iz and sto_id = p_sto_iz;
    update public.racuni set sto_id = p_sto_u where id = v_iz;
    return jsonb_build_object('radnja', 'premjesteno', 'racun_id', v_iz);
  end if;

  if v_u = v_iz then
    raise exception 'Stolovi su već povezani s istim računom.';
  end if;

  update public.narudzbe set racun_id = v_u where racun_id = v_iz;
  update public.racun_stolovi set racun_id = v_u where racun_id = v_iz;
  update public.racuni
  set status = 'spojen', zatvoren_at = now()
  where id = v_iz;

  return jsonb_build_object('radnja', 'spojeno', 'racun_id', v_u);
end;
$$;

create or replace function public.dodaj_sto_na_racun(
  p_racun_id uuid,
  p_sto_id smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform id from public.stolovi where id = p_sto_id for update;
  if not found then raise exception 'Sto nije pronađen.'; end if;

  if not exists (
    select 1 from public.racuni where id = p_racun_id and status = 'otvoren'
  ) then
    raise exception 'Račun nije otvoren.';
  end if;

  if exists (
    select 1 from public.racun_stolovi where sto_id = p_sto_id
  ) then
    raise exception 'Sto već pripada otvorenom računu.';
  end if;

  insert into public.racun_stolovi (racun_id, sto_id)
  values (p_racun_id, p_sto_id);

  return jsonb_build_object('racun_id', p_racun_id, 'sto_id', p_sto_id);
end;
$$;

create or replace function public.kreiraj_rezervaciju(
  p_ime text,
  p_broj_gostiju smallint,
  p_rezervisano_za timestamptz,
  p_sto_id smallint,
  p_telefon text,
  p_napomena text,
  p_akter_ime text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if length(trim(p_ime)) not between 2 and 100 or p_broj_gostiju < 1 then
    raise exception 'Ime i broj gostiju nisu ispravni.';
  end if;
  if p_rezervisano_za <= now() then
    raise exception 'Vrijeme rezervacije mora biti u budućnosti.';
  end if;

  insert into public.rezervacije (
    ime, broj_gostiju, rezervisano_za, sto_id, telefon, napomena, kreirao_ime
  )
  values (
    trim(p_ime), p_broj_gostiju, p_rezervisano_za, p_sto_id,
    nullif(trim(p_telefon), ''), nullif(trim(p_napomena), ''), trim(p_akter_ime)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.kreiraj_zahtjev_mesnice(
  p_zaliha_id uuid,
  p_kolicina numeric,
  p_izvor text,
  p_narudzba_id uuid,
  p_akter_ime text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if p_izvor not in ('kuhinja', 'minimum') then
    raise exception 'Nepoznat izvor zahtjeva.';
  end if;
  if p_kolicina is not null and p_kolicina <= 0 then
    raise exception 'Količina mora biti veća od nule.';
  end if;

  insert into public.zahtjevi_mesnice (
    zaliha_id, kolicina, izvor, narudzba_id, kreirao_ime
  )
  values (p_zaliha_id, p_kolicina, p_izvor, p_narudzba_id, trim(p_akter_ime))
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.isporuci_zahtjev_mesnice(
  p_zahtjev_id uuid,
  p_kolicina numeric,
  p_akter_ime text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_zahtjev public.zahtjevi_mesnice%rowtype;
  v_artikal public.zaliha_artikli%rowtype;
  v_novo numeric(12, 3);
begin
  select * into v_zahtjev
  from public.zahtjevi_mesnice
  where id = p_zahtjev_id and status = 'nov'
  for update;
  if not found then raise exception 'Aktivan zahtjev nije pronađen.'; end if;
  if p_kolicina is null or p_kolicina <= 0 then
    raise exception 'Količina isporuke mora biti veća od nule.';
  end if;

  select * into v_artikal from public.zaliha_artikli
  where id = v_zahtjev.zaliha_id for update;
  v_novo := v_artikal.stanje + p_kolicina;
  if v_novo <= v_artikal.minimum then
    raise exception 'Stanje nakon isporuke mora biti iznad minimuma (%).',
      v_artikal.minimum;
  end if;

  update public.zaliha_artikli set stanje = v_novo where id = v_artikal.id;
  insert into public.prometi_zaliha (
    zaliha_id, promjena, razlog, evidentirao_ime
  )
  values (v_artikal.id, p_kolicina, 'Isporuka mesnice', trim(p_akter_ime));
  update public.zahtjevi_mesnice
  set status = 'isporucen', kolicina = p_kolicina,
      isporucio_ime = trim(p_akter_ime), zavrseno_at = now()
  where id = p_zahtjev_id;

  return jsonb_build_object('stanje', v_novo, 'zahtjev_id', p_zahtjev_id);
end;
$$;

create or replace function public.otvori_smjenu(
  p_oznaka text,
  p_preuzeo_ime text,
  p_popis_sanka jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if p_oznaka not in ('I', 'II') then raise exception 'Nepoznata smjena.'; end if;
  if exists (select 1 from public.smjene where status = 'otvorena') then
    raise exception 'Već postoji otvorena smjena.';
  end if;

  insert into public.smjene (
    oznaka, pocetak_at, preuzeo_ime, pocetni_popis_sanka
  )
  values (
    p_oznaka, now(), trim(p_preuzeo_ime), coalesce(p_popis_sanka, '{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.zatvori_smjenu(
  p_smjena_id uuid,
  p_popis_sanka jsonb,
  p_predani_pazar numeric,
  p_zatvorio_ime text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_smjena public.smjene%rowtype;
  v_iznos numeric(12, 2);
begin
  select * into v_smjena from public.smjene
  where id = p_smjena_id and status = 'otvorena'
  for update;
  if not found then raise exception 'Otvorena smjena nije pronađena.'; end if;

  select coalesce(sum(ukupno), 0) into v_iznos
  from public.naplate
  where kreirano_at >= v_smjena.pocetak_at and nacin <> 'dug';

  update public.smjene
  set status = 'zatvorena', zavrsni_popis_sanka = p_popis_sanka,
      predani_pazar = p_predani_pazar, zatvorio_ime = trim(p_zatvorio_ime),
      zatvoreno_at = now()
  where id = p_smjena_id;

  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  )
  values (
    trim(p_zatvorio_ime), 'sefica', 'zatvaranje smjene', 'smjena',
    p_smjena_id::text,
    jsonb_build_object('naplaceno', v_iznos, 'predani_pazar', p_predani_pazar)
  );

  return jsonb_build_object('smjena_id', p_smjena_id, 'naplaceno', v_iznos);
end;
$$;

create or replace function public.zatvori_dan(p_akter_ime text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_datum date := current_date;
  v_ukupno numeric(12, 2);
  v_broj integer;
begin
  if exists (select 1 from public.racuni where status = 'otvoren') then
    raise exception 'Dan se ne može zatvoriti dok postoje otvoreni računi.';
  end if;

  select coalesce(sum(ukupno), 0), count(*)
    into v_ukupno, v_broj
  from public.naplate
  where kreirano_at::date = v_datum and nacin <> 'dug';

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

create or replace function public.postavi_pin(
  p_kljuc text,
  p_pin text
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if p_kljuc not in ('osoblje', 'sefica', 'poseban_prilog')
    or p_pin !~ '^[0-9]{4,8}$'
  then
    raise exception 'PIN ili vrsta PIN-a nisu ispravni.';
  end if;

  insert into public.pin_postavke (kljuc, pin_hash)
  values (p_kljuc, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (kljuc) do update
  set pin_hash = excluded.pin_hash, izmijenjeno_at = now();
end;
$$;

create or replace function public.provjeri_pin(
  p_kljuc text,
  p_pin text
)
returns boolean
language sql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
  select exists (
    select 1 from public.pin_postavke
    where kljuc = p_kljuc
      and pin_hash = extensions.crypt(p_pin, pin_hash)
  );
$$;

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
    'naplaceno', coalesce(sum(naplata.ukupno) filter (
      where naplata.nacin <> 'dug'
    ), 0),
    'dug', coalesce(sum(naplata.ukupno) filter (
      where naplata.nacin = 'dug'
    ), 0),
    'racuni', count(*),
    'baksis', coalesce(sum(naplata.baksis), 0),
    'otvoreni_racuni', (
      select count(*) from public.racuni where status = 'otvoren'
    ),
    'po_konobaru', coalesce((
      select jsonb_agg(red) from (
        select naplatio_ime as ime,
          sum(ukupno) filter (where nacin <> 'dug') as naplaceno,
          sum(baksis) as baksis,
          count(*) as broj_racuna
        from public.naplate
        where kreirano_at >= p_od and kreirano_at < p_do
        group by naplatio_ime
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
        group by stavka.naziv
        order by sum(stavka.kolicina) desc
        limit 20
      ) red
    ), '[]'::jsonb)
  )
  from public.naplate naplata
  where naplata.kreirano_at >= p_od and naplata.kreirano_at < p_do;
$$;

revoke all on function public.plati_racun(uuid, numeric, numeric, text, text, text, smallint)
  from public, anon, authenticated;
grant execute on function public.plati_racun(uuid, numeric, numeric, text, text, text, smallint)
  to service_role;
revoke all on function public.storniraj_stavku(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.storniraj_stavku(uuid, text, text)
  to service_role;
revoke all on function public.premjesti_ili_spoji_sto(smallint, smallint)
  from public, anon, authenticated;
grant execute on function public.premjesti_ili_spoji_sto(smallint, smallint)
  to service_role;
revoke all on function public.dodaj_sto_na_racun(uuid, smallint)
  from public, anon, authenticated;
grant execute on function public.dodaj_sto_na_racun(uuid, smallint)
  to service_role;
revoke all on function public.kreiraj_rezervaciju(text, smallint, timestamptz, smallint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.kreiraj_rezervaciju(text, smallint, timestamptz, smallint, text, text, text)
  to service_role;
revoke all on function public.kreiraj_zahtjev_mesnice(uuid, numeric, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.kreiraj_zahtjev_mesnice(uuid, numeric, text, uuid, text)
  to service_role;
revoke all on function public.isporuci_zahtjev_mesnice(uuid, numeric, text)
  from public, anon, authenticated;
grant execute on function public.isporuci_zahtjev_mesnice(uuid, numeric, text)
  to service_role;
revoke all on function public.otvori_smjenu(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.otvori_smjenu(text, text, jsonb)
  to service_role;
revoke all on function public.zatvori_smjenu(uuid, jsonb, numeric, text)
  from public, anon, authenticated;
grant execute on function public.zatvori_smjenu(uuid, jsonb, numeric, text)
  to service_role;
revoke all on function public.zatvori_dan(text) from public, anon, authenticated;
grant execute on function public.zatvori_dan(text) to service_role;
revoke all on function public.postavi_pin(text, text) from public, anon, authenticated;
grant execute on function public.postavi_pin(text, text) to service_role;
revoke all on function public.provjeri_pin(text, text) from public, anon, authenticated;
grant execute on function public.provjeri_pin(text, text) to service_role;
revoke all on function public.izvjestaj_period(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.izvjestaj_period(timestamptz, timestamptz)
  to service_role;

alter table public.racun_stolovi enable row level security;
alter table public.dnevni_zakljucci enable row level security;
alter table public.potrosnja_zaliha enable row level security;
