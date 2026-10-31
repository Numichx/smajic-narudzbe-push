alter table public.smjene
  add column bar_pazar numeric(12, 2),
  add column kuhinja_pecenjara_pazar numeric(12, 2),
  add column ocekivani_pazar numeric(12, 2),
  add column razlika_pazara numeric(12, 2);

create table public.dopune_sanka (
  id uuid primary key default gen_random_uuid(),
  smjena_id uuid not null references public.smjene(id) on delete cascade,
  proizvod_id uuid not null references public.proizvodi(id),
  kolicina numeric(12, 3) not null check (kolicina > 0),
  evidentirao_ime text not null,
  kreirano_at timestamptz not null default now()
);

alter table public.dopune_sanka enable row level security;

create or replace function public.evidentiraj_dopunu_sanka(
  p_proizvod_id uuid,
  p_kolicina numeric,
  p_akter_ime text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_smjena_id uuid;
  v_id uuid;
begin
  if p_kolicina is null or p_kolicina <= 0 then
    raise exception 'Količina dopune mora biti veća od nule.';
  end if;
  if length(trim(coalesce(p_akter_ime, ''))) < 2 then
    raise exception 'Nedostaje ime osobe koja evidentira dopunu.';
  end if;
  if not exists (
    select 1 from public.proizvodi
    where id = p_proizvod_id and stanica = 'sank' and aktivan
      and cijena is not null
  ) then
    raise exception 'Piće nije pronađeno ili nema cijenu.';
  end if;
  select id into v_smjena_id from public.smjene
  where status = 'otvorena' order by pocetak_at desc limit 1
  for update;
  if not found then raise exception 'Prvo otvorite smjenu.'; end if;

  insert into public.dopune_sanka (
    smjena_id, proizvod_id, kolicina, evidentirao_ime
  ) values (v_smjena_id, p_proizvod_id, p_kolicina, trim(p_akter_ime))
  returning id into v_id;
  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  ) values (
    trim(p_akter_ime), 'sank', 'dopuna šanka', 'dopuna_sanka', v_id::text,
    jsonb_build_object('smjena_id', v_smjena_id, 'proizvod_id', p_proizvod_id, 'kolicina', p_kolicina)
  );
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
  v_bar_pazar numeric(12, 2);
  v_kuhinja_pecenjara numeric(12, 2);
  v_ocekivano numeric(12, 2);
  v_naplaceno numeric(12, 2);
  v_razlika numeric(12, 2);
begin
  select * into v_smjena
  from public.smjene
  where id = p_smjena_id and status = 'otvorena'
  for update;
  if not found then raise exception 'Otvorena smjena nije pronađena.'; end if;
  if jsonb_typeof(p_popis_sanka) is distinct from 'object' then
    raise exception 'Završni popis šanka nije ispravan.';
  end if;
  if p_predani_pazar is null or p_predani_pazar < 0 then
    raise exception 'Predani pazar nije ispravan.';
  end if;

  select coalesce(sum(
    (
      coalesce(nullif(v_smjena.pocetni_popis_sanka ->> proizvod.naziv, '')::numeric, 0)
      + coalesce(dopuna.kolicina, 0)
      - coalesce(nullif(p_popis_sanka ->> proizvod.naziv, '')::numeric, 0)
    ) * proizvod.cijena
  ), 0)
  into v_bar_pazar
  from public.proizvodi proizvod
  left join lateral (
    select sum(item.kolicina) as kolicina
    from public.dopune_sanka item
    where item.smjena_id = p_smjena_id
      and item.proizvod_id = proizvod.id
  ) dopuna on true
  where proizvod.stanica = 'sank' and proizvod.aktivan and proizvod.cijena is not null;

  select coalesce(sum(stavka.kolicina * stavka.cijena + coalesce((
    select sum((prilog ->> 'cijena')::numeric)
    from jsonb_array_elements(stavka.prilozi) as prilog
  ), 0)), 0)
  into v_kuhinja_pecenjara
  from public.narudzbe narudzba
  join public.stavke_narudzbe stavka on stavka.narudzba_id = narudzba.id
  where narudzba.stanica in ('kuhinja', 'pecenjara')
    and narudzba.status = 'Izdato'
    and narudzba.kreirano_at >= v_smjena.pocetak_at
    and narudzba.kreirano_at < now()
    and not stavka.stornirano
    and not coalesce(stavka.napomena, '') like 'Prilog uz %';

  v_ocekivano := round(v_bar_pazar + v_kuhinja_pecenjara, 2);
  v_razlika := round(p_predani_pazar - v_ocekivano, 2);
  select coalesce(sum(ukupno), 0) into v_naplaceno
  from public.naplate
  where kreirano_at >= v_smjena.pocetak_at and kreirano_at < now()
    and nacin <> 'dug';

  update public.smjene
  set status = 'zatvorena',
      zavrsni_popis_sanka = p_popis_sanka,
      predani_pazar = p_predani_pazar,
      bar_pazar = round(v_bar_pazar, 2),
      kuhinja_pecenjara_pazar = round(v_kuhinja_pecenjara, 2),
      ocekivani_pazar = v_ocekivano,
      razlika_pazara = v_razlika,
      zatvorio_ime = trim(p_zatvorio_ime),
      zatvoreno_at = now()
  where id = p_smjena_id;

  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  )
  values (
    trim(p_zatvorio_ime), 'sefica', 'zatvaranje smjene', 'smjena',
    p_smjena_id::text,
    jsonb_build_object(
      'bar_pazar', v_bar_pazar,
      'kuhinja_pecenjara_pazar', v_kuhinja_pecenjara,
      'ocekivani_pazar', v_ocekivano,
      'predani_pazar', p_predani_pazar,
      'razlika', v_razlika,
      'naplaceno', v_naplaceno
    )
  );

  return jsonb_build_object(
    'smjena_id', p_smjena_id,
    'bar_pazar', round(v_bar_pazar, 2),
    'kuhinja_pecenjara_pazar', round(v_kuhinja_pecenjara, 2),
    'ocekivani_pazar', v_ocekivano,
    'predani_pazar', p_predani_pazar,
    'razlika', v_razlika,
    'naplaceno', v_naplaceno
  );
end;
$$;

revoke all on function public.evidentiraj_dopunu_sanka(uuid, numeric, text)
  from public, anon, authenticated;
grant execute on function public.evidentiraj_dopunu_sanka(uuid, numeric, text)
  to service_role;
revoke all on function public.zatvori_smjenu(uuid, jsonb, numeric, text)
  from public, anon, authenticated;
grant execute on function public.zatvori_smjenu(uuid, jsonb, numeric, text)
  to service_role;
