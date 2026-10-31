create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create sequence if not exists public.broj_slanja_seq;

create or replace function public.postavi_vrijeme_izmjene()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.izmijenjeno_at = now();
  return new;
end;
$$;

create table public.stolovi (
  id smallint primary key check (id between 1 and 20),
  naziv text not null unique,
  aktivan boolean not null default true,
  kreirano_at timestamptz not null default now()
);

create table public.zaposlenici (
  id uuid primary key default gen_random_uuid(),
  ime text not null check (length(trim(ime)) between 2 and 80),
  uloga text not null check (
    uloga in ('konobar', 'kuhinja', 'pecenjara', 'sank', 'mesnica', 'sefica')
  ),
  pin_hash text,
  aktivan boolean not null default true,
  kreirano_at timestamptz not null default now(),
  izmijenjeno_at timestamptz not null default now(),
  check (uloga = 'konobar' or pin_hash is not null)
);

create unique index zaposlenici_aktivno_ime_uloga_idx
  on public.zaposlenici (lower(ime), uloga)
  where aktivan;

create table public.pin_postavke (
  kljuc text primary key check (
    kljuc in ('osoblje', 'sefica', 'poseban_prilog')
  ),
  pin_hash text not null,
  izmijenjeno_at timestamptz not null default now()
);

create table public.kategorije_menija (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  naziv text not null unique,
  redoslijed smallint not null unique check (redoslijed > 0),
  aktivna boolean not null default true
);

create table public.proizvodi (
  id uuid primary key default gen_random_uuid(),
  kategorija_id text not null references public.kategorije_menija(id),
  naziv text not null,
  cijena numeric(10, 2) check (cijena is null or cijena >= 0),
  jedinica text not null default 'porcija'
    check (jedinica in ('kom', 'porcija', 'kg', 'l')),
  stanica text not null
    check (stanica in ('kuhinja', 'pecenjara', 'sank')),
  aktivan boolean not null default true,
  napomena_cijene text,
  redoslijed smallint not null default 1 check (redoslijed > 0),
  kreirano_at timestamptz not null default now(),
  izmijenjeno_at timestamptz not null default now(),
  unique (kategorija_id, naziv)
);

create index proizvodi_aktivna_kategorija_idx
  on public.proizvodi (kategorija_id, redoslijed)
  where aktivan;

create table public.recepti (
  id uuid primary key default gen_random_uuid(),
  proizvod_id uuid not null unique references public.proizvodi(id) on delete cascade,
  izmijenjeno_at timestamptz not null default now()
);

create table public.zaliha_artikli (
  id uuid primary key default gen_random_uuid(),
  naziv text not null unique,
  jedinica text not null check (jedinica in ('kom', 'kg', 'l')),
  stanje numeric(12, 3) not null default 0 check (stanje >= 0),
  minimum numeric(12, 3) not null default 0 check (minimum >= 0),
  nabavna_cijena numeric(10, 2) check (
    nabavna_cijena is null or nabavna_cijena >= 0
  ),
  aktivan boolean not null default true,
  izmijenjeno_at timestamptz not null default now()
);

create table public.prometi_zaliha (
  id bigint generated always as identity primary key,
  zaliha_id uuid not null references public.zaliha_artikli(id),
  promjena numeric(12, 3) not null check (promjena <> 0),
  razlog text not null,
  povezana_narudzba_id uuid,
  evidentirao_ime text not null,
  kreirano_at timestamptz not null default now()
);

create index prometi_zaliha_artikal_idx
  on public.prometi_zaliha (zaliha_id, kreirano_at desc);

create table public.sastojci_recepta (
  recept_id uuid not null references public.recepti(id) on delete cascade,
  zaliha_id uuid not null references public.zaliha_artikli(id),
  kolicina numeric(12, 3) not null check (kolicina > 0),
  primary key (recept_id, zaliha_id)
);

create table public.racuni (
  id uuid primary key default gen_random_uuid(),
  broj bigint generated always as identity unique,
  sto_id smallint not null references public.stolovi(id),
  konobar_id uuid references public.zaposlenici(id) on delete set null,
  konobar_ime text not null check (length(trim(konobar_ime)) between 2 and 80),
  status text not null default 'otvoren'
    check (status in ('otvoren', 'placen', 'na_dug')),
  gost_duznik text,
  otvoren_at timestamptz not null default now(),
  zatvoren_at timestamptz,
  izmijenjeno_at timestamptz not null default now(),
  check (status <> 'na_dug' or nullif(trim(gost_duznik), '') is not null),
  check (
    (status = 'otvoren' and zatvoren_at is null)
    or (status <> 'otvoren' and zatvoren_at is not null)
  )
);

create unique index racuni_jedan_otvoren_po_stolu_idx
  on public.racuni (sto_id)
  where status = 'otvoren';

create index racuni_status_otvoren_idx
  on public.racuni (otvoren_at desc)
  where status = 'otvoren';

create table public.narudzbe (
  id uuid primary key default gen_random_uuid(),
  grupa_id uuid not null,
  broj text not null,
  racun_id uuid not null references public.racuni(id),
  stanica text not null check (
    stanica in ('kuhinja', 'pecenjara', 'sank')
  ),
  status text not null default 'Novo'
    check (status in ('Novo', 'U pripremi', 'Gotovo', 'Izdato')),
  kreirao_ime text not null,
  kreirano_at timestamptz not null default now(),
  izmijenjeno_at timestamptz not null default now(),
  unique (broj, stanica)
);

create index narudzbe_stanica_status_idx
  on public.narudzbe (stanica, status, kreirano_at);

create index narudzbe_racun_idx
  on public.narudzbe (racun_id, kreirano_at);

alter table public.prometi_zaliha
  add constraint prometi_zaliha_narudzba_fk
  foreign key (povezana_narudzba_id)
  references public.narudzbe(id)
  on delete set null;

create table public.stavke_narudzbe (
  id uuid primary key default gen_random_uuid(),
  narudzba_id uuid not null references public.narudzbe(id) on delete cascade,
  proizvod_id uuid references public.proizvodi(id) on delete set null,
  naziv text not null,
  jedinica text not null check (jedinica in ('kom', 'porcija', 'kg', 'l')),
  kolicina numeric(10, 3) not null check (kolicina > 0),
  cijena numeric(10, 2) not null check (cijena >= 0),
  napomena text,
  prilozi jsonb not null default '[]'::jsonb
    check (jsonb_typeof(prilozi) = 'array'),
  stornirano boolean not null default false,
  storno_razlog text check (
    storno_razlog is null or storno_razlog in (
      'Pogrešan unos', 'Gost odustao', 'Greška kuhinje', 'Drugo'
    )
  ),
  storno_vrijednost numeric(10, 2) check (
    storno_vrijednost is null or storno_vrijednost >= 0
  ),
  stornirano_at timestamptz,
  kreirano_at timestamptz not null default now(),
  check (
    (stornirano = false and storno_razlog is null and storno_vrijednost is null)
    or (stornirano = true and storno_razlog is not null and storno_vrijednost is not null)
  )
);

create index stavke_narudzbe_parent_idx
  on public.stavke_narudzbe (narudzba_id, kreirano_at);

create table public.naplate (
  id uuid primary key default gen_random_uuid(),
  racun_id uuid not null references public.racuni(id),
  ukupno numeric(10, 2) not null check (ukupno >= 0),
  gost_dao numeric(10, 2) not null check (gost_dao >= 0),
  kusur numeric(10, 2) not null default 0 check (kusur >= 0),
  baksis numeric(10, 2) not null default 0 check (baksis >= 0),
  nacin text not null check (
    nacin in ('gotovina', 'kartica', 'kombinovano', 'dug')
  ),
  gost_duznik text,
  naplatio_ime text not null,
  kreirano_at timestamptz not null default now(),
  check (nacin = 'dug' or gost_dao >= ukupno),
  check (kusur <= greatest(gost_dao - ukupno, 0)),
  check (
    (nacin = 'dug' and nullif(trim(gost_duznik), '') is not null)
    or nacin <> 'dug'
  )
);

create index naplate_racun_idx on public.naplate (racun_id, kreirano_at);

create table public.rezervacije (
  id uuid primary key default gen_random_uuid(),
  ime text not null check (length(trim(ime)) between 2 and 100),
  broj_gostiju smallint not null check (broj_gostiju > 0),
  rezervisano_za timestamptz not null,
  sto_id smallint references public.stolovi(id) on delete set null,
  telefon text,
  napomena text,
  status text not null default 'aktivna'
    check (status in ('aktivna', 'realizovana', 'otkazana')),
  kreirao_ime text not null,
  kreirano_at timestamptz not null default now()
);

create index rezervacije_vrijeme_idx
  on public.rezervacije (rezervisano_za)
  where status = 'aktivna';

create table public.zahtjevi_mesnice (
  id uuid primary key default gen_random_uuid(),
  zaliha_id uuid not null references public.zaliha_artikli(id),
  kolicina numeric(12, 3) check (kolicina is null or kolicina > 0),
  izvor text not null check (izvor in ('kuhinja', 'minimum')),
  status text not null default 'nov'
    check (status in ('nov', 'isporucen', 'nema_na_stanju', 'otkazan')),
  narudzba_id uuid references public.narudzbe(id) on delete set null,
  kreirao_ime text not null,
  isporucio_ime text,
  kreirano_at timestamptz not null default now(),
  zavrseno_at timestamptz
);

create index zahtjevi_mesnice_status_idx
  on public.zahtjevi_mesnice (status, kreirano_at desc);

create table public.smjene (
  id uuid primary key default gen_random_uuid(),
  oznaka text not null check (oznaka in ('I', 'II')),
  pocetak_at timestamptz not null,
  preuzeo_ime text not null,
  status text not null default 'otvorena'
    check (status in ('otvorena', 'zatvorena')),
  pocetni_popis_sanka jsonb not null default '{}'::jsonb,
  zavrsni_popis_sanka jsonb,
  predani_pazar numeric(10, 2) check (
    predani_pazar is null or predani_pazar >= 0
  ),
  zatvorio_ime text,
  zatvoreno_at timestamptz,
  kreirano_at timestamptz not null default now(),
  check (
    (status = 'otvorena' and zatvoreno_at is null)
    or (status = 'zatvorena' and zatvoreno_at is not null)
  )
);

create table public.uplate_pecenjari (
  id uuid primary key default gen_random_uuid(),
  konobar_ime text not null,
  smjena_id uuid references public.smjene(id) on delete set null,
  iznos numeric(10, 2) not null check (iznos > 0),
  evidentirao_ime text not null,
  kreirano_at timestamptz not null default now()
);

create table public.dnevnik_radnji (
  id bigint generated always as identity primary key,
  akter_ime text not null,
  akter_uloga text not null,
  radnja text not null,
  entitet text not null,
  entitet_id text,
  detalji jsonb not null default '{}'::jsonb,
  kreirano_at timestamptz not null default now()
);

create index dnevnik_radnji_kreirano_idx
  on public.dnevnik_radnji (kreirano_at desc);

create trigger zaposlenici_izmijenjeno_at
  before update on public.zaposlenici
  for each row execute function public.postavi_vrijeme_izmjene();

create trigger proizvodi_izmijenjeno_at
  before update on public.proizvodi
  for each row execute function public.postavi_vrijeme_izmjene();

create trigger racuni_izmijenjeno_at
  before update on public.racuni
  for each row execute function public.postavi_vrijeme_izmjene();

create trigger narudzbe_izmijenjeno_at
  before update on public.narudzbe
  for each row execute function public.postavi_vrijeme_izmjene();

create trigger zaliha_izmijenjeno_at
  before update on public.zaliha_artikli
  for each row execute function public.postavi_vrijeme_izmjene();

create trigger recepti_izmijenjeno_at
  before update on public.recepti
  for each row execute function public.postavi_vrijeme_izmjene();

create or replace function public.posalji_narudzbu(
  p_sto_id smallint,
  p_konobar_ime text,
  p_stavke jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_racun_id uuid;
  v_grupa_id uuid := gen_random_uuid();
  v_broj text := '#' || lpad(nextval('public.broj_slanja_seq')::text, 4, '0');
  v_narudzba_id uuid;
  v_stanica text;
  v_stavka record;
  v_narudzbe uuid[] := '{}';
begin
  if p_konobar_ime is null or length(trim(p_konobar_ime)) not between 2 and 80 then
    raise exception 'Ime konobara nije ispravno.';
  end if;

  if p_stavke is null or jsonb_typeof(p_stavke) <> 'array' then
    raise exception 'Narudžba mora sadržavati listu stavki.';
  end if;

  if jsonb_array_length(p_stavke) = 0 then
    raise exception 'Narudžba mora sadržavati najmanje jednu stavku.';
  end if;

  perform 1
  from public.stolovi
  where id = p_sto_id and aktivan
  for update;

  if not found then
    raise exception 'Sto ne postoji ili nije aktivan.';
  end if;

  for v_stavka in
    select stavka.proizvod_id, stavka.kolicina
    from jsonb_to_recordset(p_stavke) as stavka(
      proizvod_id uuid,
      kolicina numeric
    )
  loop
    if v_stavka.kolicina is null or v_stavka.kolicina <= 0 then
      raise exception 'Količina svake stavke mora biti veća od nule.';
    end if;

    if not exists (
      select 1
      from public.proizvodi
      where id = v_stavka.proizvod_id
        and aktivan
        and cijena is not null
    ) then
      raise exception 'Proizvod ne postoji, nije aktivan ili nema podešenu cijenu.';
    end if;
  end loop;

  select id into v_racun_id
  from public.racuni
  where sto_id = p_sto_id and status = 'otvoren'
  for update;

  if v_racun_id is null then
    insert into public.racuni (sto_id, konobar_ime)
    values (p_sto_id, trim(p_konobar_ime))
    returning id into v_racun_id;
  end if;

  for v_stanica in
    select distinct p.stanica
    from jsonb_to_recordset(p_stavke) as stavka(
      proizvod_id uuid,
      kolicina numeric
    )
    join public.proizvodi p on p.id = stavka.proizvod_id
    order by p.stanica
  loop
    insert into public.narudzbe (
      grupa_id, broj, racun_id, stanica, kreirao_ime
    )
    values (
      v_grupa_id, v_broj, v_racun_id, v_stanica, trim(p_konobar_ime)
    )
    returning id into v_narudzba_id;

    v_narudzbe := array_append(v_narudzbe, v_narudzba_id);

    insert into public.stavke_narudzbe (
      narudzba_id, proizvod_id, naziv, jedinica, kolicina, cijena, napomena
    )
    select
      v_narudzba_id,
      p.id,
      p.naziv,
      p.jedinica,
      stavka.kolicina,
      p.cijena,
      nullif(trim(stavka.napomena), '')
    from jsonb_to_recordset(p_stavke) as stavka(
      proizvod_id uuid,
      kolicina numeric,
      napomena text
    )
    join public.proizvodi p
      on p.id = stavka.proizvod_id
      and p.stanica = v_stanica
      and p.aktivan
      and p.cijena is not null;
  end loop;

  return jsonb_build_object(
    'racun_id', v_racun_id,
    'grupa_id', v_grupa_id,
    'broj', v_broj,
    'narudzbe', to_jsonb(v_narudzbe)
  );
end;
$$;

create or replace function public.promijeni_status_narudzbe(
  p_narudzba_id uuid,
  p_uloga text,
  p_novi_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_stanica text;
  v_stari_status text;
  v_do_statusa text;
begin
  select stanica, status
    into v_stanica, v_stari_status
  from public.narudzbe
  where id = p_narudzba_id
  for update;

  if not found then
    raise exception 'Narudžba nije pronađena.';
  end if;

  if p_uloga <> v_stanica then
    raise exception 'Ova stanica ne može mijenjati narudžbu.';
  end if;

  v_do_statusa := case
    when p_uloga in ('kuhinja', 'sank') and v_stari_status = 'Novo'
      and p_novi_status = 'U pripremi' then p_novi_status
    when p_uloga in ('kuhinja', 'sank') and v_stari_status = 'U pripremi'
      and p_novi_status = 'Izdato' then p_novi_status
    when p_uloga = 'pecenjara' and v_stari_status = 'Novo'
      and p_novi_status = 'U pripremi' then p_novi_status
    when p_uloga = 'pecenjara' and v_stari_status = 'U pripremi'
      and p_novi_status = 'Gotovo' then p_novi_status
    when p_uloga = 'pecenjara' and v_stari_status = 'Gotovo'
      and p_novi_status = 'Izdato' then p_novi_status
    else null
  end;

  if v_do_statusa is null then
    raise exception 'Nije dozvoljen prelaz sa "%" na "%".',
      v_stari_status, p_novi_status;
  end if;

  update public.narudzbe
  set status = v_do_statusa
  where id = p_narudzba_id;

  return jsonb_build_object(
    'id', p_narudzba_id,
    'stanica', v_stanica,
    'status', v_do_statusa
  );
end;
$$;

revoke all on function public.posalji_narudzbu(smallint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.posalji_narudzbu(smallint, text, jsonb)
  to service_role;
revoke all on function public.promijeni_status_narudzbe(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.promijeni_status_narudzbe(uuid, text, text)
  to service_role;

alter table public.stolovi enable row level security;
alter table public.zaposlenici enable row level security;
alter table public.pin_postavke enable row level security;
alter table public.kategorije_menija enable row level security;
alter table public.proizvodi enable row level security;
alter table public.recepti enable row level security;
alter table public.zaliha_artikli enable row level security;
alter table public.prometi_zaliha enable row level security;
alter table public.sastojci_recepta enable row level security;
alter table public.racuni enable row level security;
alter table public.narudzbe enable row level security;
alter table public.stavke_narudzbe enable row level security;
alter table public.naplate enable row level security;
alter table public.rezervacije enable row level security;
alter table public.zahtjevi_mesnice enable row level security;
alter table public.smjene enable row level security;
alter table public.uplate_pecenjari enable row level security;
alter table public.dnevnik_radnji enable row level security;
