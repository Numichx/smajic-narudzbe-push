-- Popust na cijeli račun (uključuje častimo i obrok osoblja kao 100 %).
-- Čuva se procenat, ne iznos, pa stavke dodane ili stornirane nakon popusta
-- ostaju ispravno obračunate. Odobrava ga šefica PIN-om; API provjerava PIN.
alter table public.racuni
  add column popust_procenat numeric(5, 2) not null default 0
    check (popust_procenat between 0 and 100),
  add column popust_razlog text,
  add column popust_odobrio text,
  add constraint racuni_popust_razlog_check
    check (popust_procenat = 0 or nullif(trim(popust_razlog), '') is not null);

-- Naplata čuva bruto i popust da Z-izvještaj kasnije može pokazati popuste.
alter table public.naplate
  add column popust numeric(10, 2) not null default 0 check (popust >= 0);

-- Bruto bez popusta; ukupno_racuna ostaje iznos za naplatu (koristi ga plati_racun).
create or replace function public.bruto_racuna(p_racun_id uuid)
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

create or replace function public.ukupno_racuna(p_racun_id uuid)
returns numeric
language sql
stable
set search_path = public
as $$
  select round(public.bruto_racuna(p_racun_id) * (1 - racun.popust_procenat / 100), 2)
  from public.racuni racun
  where racun.id = p_racun_id;
$$;

create or replace function public.odobri_popust(
  p_racun_id uuid,
  p_procenat numeric,
  p_razlog text,
  p_akter_ime text,
  p_odobrio_ime text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_racun public.racuni%rowtype;
  v_bruto numeric(10, 2);
begin
  select * into v_racun from public.racuni where id = p_racun_id for update;
  if not found or v_racun.status <> 'otvoren' then
    raise exception 'Račun nije otvoren ili ne postoji.';
  end if;
  if p_procenat is null or p_procenat < 0 or p_procenat > 100 then
    raise exception 'Popust mora biti između 0 i 100 %%.';
  end if;
  if p_procenat > 0 and (p_razlog is null or length(trim(p_razlog)) < 2) then
    raise exception 'Unesite razlog popusta.';
  end if;
  if p_akter_ime is null or length(trim(p_akter_ime)) < 2 then
    raise exception 'Nedostaje ime konobara.';
  end if;

  update public.racuni
  set popust_procenat = p_procenat,
      popust_razlog = case when p_procenat = 0 then null else trim(p_razlog) end,
      popust_odobrio = case when p_procenat = 0 then null else trim(p_odobrio_ime) end
  where id = p_racun_id;

  v_bruto := round(public.bruto_racuna(p_racun_id), 2);

  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  ) values (
    trim(p_akter_ime), 'konobar', 'popust', 'racun', p_racun_id::text,
    jsonb_build_object(
      'procenat', p_procenat, 'razlog', trim(p_razlog),
      'odobrio', trim(p_odobrio_ime), 'bruto', v_bruto,
      'prethodni_procenat', v_racun.popust_procenat
    )
  );

  return jsonb_build_object(
    'racun_id', p_racun_id,
    'procenat', p_procenat,
    'ukupno', public.ukupno_racuna(p_racun_id)
  );
end;
$$;

-- Naplata upisuje iznos popusta. Okidač ne dira plati_racun.
create or replace function public.naplata_upisi_popust()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.popust := greatest(round(public.bruto_racuna(new.racun_id), 2) - new.ukupno, 0);
  return new;
end;
$$;

create trigger naplate_upisi_popust
  before insert on public.naplate
  for each row execute function public.naplata_upisi_popust();

revoke all on function public.bruto_racuna(uuid) from public, anon, authenticated;
revoke all on function public.naplata_upisi_popust() from public, anon, authenticated;
revoke all on function public.odobri_popust(uuid, numeric, text, text, text)
  from public, anon, authenticated;
grant execute on function public.odobri_popust(uuid, numeric, text, text, text)
  to service_role;
