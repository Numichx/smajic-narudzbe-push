create table public.pecenjara_popisi_smjena (
  smjena_id uuid primary key references public.smjene(id) on delete cascade,
  pocetne_koke_pecene integer not null check (pocetne_koke_pecene >= 0),
  pocetne_koke_sirove integer not null check (pocetne_koke_sirove >= 0),
  pocetna_janjetina_kg numeric(10, 3) not null check (pocetna_janjetina_kg >= 0),
  dodatne_koke integer not null default 0 check (dodatne_koke >= 0),
  dodatna_janjetina_kg numeric(10, 3) not null default 0 check (dodatna_janjetina_kg >= 0),
  preostale_koke integer check (preostale_koke >= 0),
  preostala_janjetina_kg numeric(10, 3) check (preostala_janjetina_kg >= 0),
  prodane_koke integer check (prodane_koke >= 0),
  prodana_janjetina_kg numeric(10, 3) check (prodana_janjetina_kg >= 0),
  pazar_po_popisu numeric(12, 2) check (pazar_po_popisu >= 0),
  predani_pazar numeric(12, 2) check (predani_pazar >= 0),
  razlika numeric(12, 2),
  evidentirao_ime text not null check (length(trim(evidentirao_ime)) between 2 and 80),
  kreirano_at timestamptz not null default now(),
  zatvoreno_at timestamptz,
  check (
    (zatvoreno_at is null
      and preostale_koke is null
      and preostala_janjetina_kg is null
      and prodane_koke is null
      and prodana_janjetina_kg is null
      and pazar_po_popisu is null
      and predani_pazar is null
      and razlika is null)
    or
    (zatvoreno_at is not null
      and preostale_koke is not null
      and preostala_janjetina_kg is not null
      and prodane_koke is not null
      and prodana_janjetina_kg is not null
      and pazar_po_popisu is not null
      and predani_pazar is not null
      and razlika is not null)
  )
);

create index pecenjara_popisi_kreirano_idx
  on public.pecenjara_popisi_smjena (kreirano_at desc);

create or replace function public.zahtijevaj_zatvoren_popis_pecenjare()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.status = 'otvorena' and new.status = 'zatvorena'
    and not exists (
      select 1
      from public.pecenjara_popisi_smjena
      where smjena_id = old.id and zatvoreno_at is not null
    ) then
    raise exception 'Prvo zaključite popis pečenjare za ovu smjenu.';
  end if;
  return new;
end;
$$;

create trigger smjene_zahtijevaj_popis_pecenjare
  before update of status on public.smjene
  for each row
  execute function public.zahtijevaj_zatvoren_popis_pecenjare();

revoke all on function public.zahtijevaj_zatvoren_popis_pecenjare()
  from public, anon, authenticated;

alter table public.pecenjara_popisi_smjena enable row level security;
revoke all on table public.pecenjara_popisi_smjena from public, anon, authenticated;
grant select, insert, update on table public.pecenjara_popisi_smjena to service_role;

create or replace function public.otvori_popis_pecenjare(
  p_smjena_id uuid,
  p_pocetne_koke_pecene integer,
  p_pocetne_koke_sirove integer,
  p_pocetna_janjetina_kg numeric,
  p_evidentirao_uloga text,
  p_evidentirao_ime text
)
returns public.pecenjara_popisi_smjena
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_smjena public.smjene%rowtype;
  v_popis public.pecenjara_popisi_smjena%rowtype;
begin
  if p_pocetne_koke_pecene is null or p_pocetne_koke_pecene < 0
    or p_pocetne_koke_sirove is null or p_pocetne_koke_sirove < 0
    or p_pocetna_janjetina_kg is null or p_pocetna_janjetina_kg < 0
    or coalesce(p_evidentirao_uloga, '') not in ('pecenjara', 'sefica')
    or length(trim(coalesce(p_evidentirao_ime, ''))) not between 2 and 80 then
    raise exception 'Početni popis pečenjare nije ispravan.';
  end if;

  select * into v_smjena
  from public.smjene
  where id = p_smjena_id and status = 'otvorena'
  for update;
  if not found then raise exception 'Aktivna smjena nije pronađena.'; end if;

  insert into public.pecenjara_popisi_smjena (
    smjena_id, pocetne_koke_pecene, pocetne_koke_sirove,
    pocetna_janjetina_kg, evidentirao_ime
  ) values (
    p_smjena_id, p_pocetne_koke_pecene, p_pocetne_koke_sirove,
    round(p_pocetna_janjetina_kg, 3), trim(p_evidentirao_ime)
  )
  returning * into v_popis;

  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  ) values (
    trim(p_evidentirao_ime), p_evidentirao_uloga, 'početni popis pečenjare',
    'pecenjara_popis_smjene', p_smjena_id::text,
    jsonb_build_object(
      'pocetne_koke_pecene', p_pocetne_koke_pecene,
      'pocetne_koke_sirove', p_pocetne_koke_sirove,
      'pocetna_janjetina_kg', round(p_pocetna_janjetina_kg, 3)
    )
  );
  return v_popis;
end;
$$;

create or replace function public.zatvori_popis_pecenjare(
  p_smjena_id uuid,
  p_dodatne_koke integer,
  p_dodatna_janjetina_kg numeric,
  p_preostale_koke integer,
  p_preostala_janjetina_kg numeric,
  p_predani_pazar numeric,
  p_evidentirao_uloga text,
  p_evidentirao_ime text
)
returns public.pecenjara_popisi_smjena
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_popis public.pecenjara_popisi_smjena%rowtype;
  v_prodane_koke integer;
  v_prodana_janjetina numeric(10, 3);
  v_pazar numeric(12, 2);
begin
  if p_dodatne_koke is null or p_dodatne_koke < 0
    or p_dodatna_janjetina_kg is null or p_dodatna_janjetina_kg < 0
    or p_preostale_koke is null or p_preostale_koke < 0
    or p_preostala_janjetina_kg is null or p_preostala_janjetina_kg < 0
    or p_predani_pazar is null or p_predani_pazar < 0
    or coalesce(p_evidentirao_uloga, '') not in ('pecenjara', 'sefica')
    or length(trim(coalesce(p_evidentirao_ime, ''))) not between 2 and 80 then
    raise exception 'Završni popis pečenjare nije ispravan.';
  end if;

  select popis.* into v_popis
  from public.pecenjara_popisi_smjena popis
  join public.smjene smjena on smjena.id = popis.smjena_id
  where popis.smjena_id = p_smjena_id
    and popis.zatvoreno_at is null
    and smjena.status = 'otvorena'
  for update of popis, smjena;
  if not found then raise exception 'Otvoren popis pečenjare nije pronađen.'; end if;

  v_prodane_koke := v_popis.pocetne_koke_pecene
    + v_popis.pocetne_koke_sirove + p_dodatne_koke - p_preostale_koke;
  v_prodana_janjetina := round(
    v_popis.pocetna_janjetina_kg + p_dodatna_janjetina_kg
      - p_preostala_janjetina_kg,
    3
  );
  if v_prodane_koke < 0 or v_prodana_janjetina < 0 then
    raise exception 'Završno stanje ne može biti veće od raspoložive količine.';
  end if;
  v_pazar := round(v_prodane_koke * 14 + v_prodana_janjetina * 50, 2);

  update public.pecenjara_popisi_smjena
  set dodatne_koke = p_dodatne_koke,
      dodatna_janjetina_kg = round(p_dodatna_janjetina_kg, 3),
      preostale_koke = p_preostale_koke,
      preostala_janjetina_kg = round(p_preostala_janjetina_kg, 3),
      prodane_koke = v_prodane_koke,
      prodana_janjetina_kg = v_prodana_janjetina,
      pazar_po_popisu = v_pazar,
      predani_pazar = round(p_predani_pazar, 2),
      razlika = round(round(p_predani_pazar, 2) - v_pazar, 2),
      evidentirao_ime = trim(p_evidentirao_ime),
      zatvoreno_at = now()
  where smjena_id = p_smjena_id
  returning * into v_popis;

  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  ) values (
    trim(p_evidentirao_ime), p_evidentirao_uloga, 'zatvaranje popisa pečenjare',
    'pecenjara_popis_smjene', p_smjena_id::text,
    jsonb_build_object(
      'prodane_koke', v_prodane_koke,
      'prodana_janjetina_kg', v_prodana_janjetina,
      'pazar_po_popisu', v_pazar,
      'predani_pazar', round(p_predani_pazar, 2),
      'razlika', round(round(p_predani_pazar, 2) - v_pazar, 2)
    )
  );
  return v_popis;
end;
$$;

revoke all on function public.otvori_popis_pecenjare(uuid, integer, integer, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.otvori_popis_pecenjare(uuid, integer, integer, numeric, text, text)
  to service_role;
grant execute on function public.zahtijevaj_zatvoren_popis_pecenjare()
  to service_role;
revoke all on function public.zatvori_popis_pecenjare(uuid, integer, numeric, integer, numeric, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.zatvori_popis_pecenjare(uuid, integer, numeric, integer, numeric, numeric, text, text)
  to service_role;