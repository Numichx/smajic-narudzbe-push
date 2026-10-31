create table public.uskladjenja_jagnjetine (
  id uuid primary key default gen_random_uuid(),
  narudzba_id uuid not null references public.narudzbe(id),
  stavka_id uuid not null references public.stavke_narudzbe(id),
  naruceno_kg numeric(10, 3) not null check (naruceno_kg > 0),
  dato_kg numeric(10, 3) not null check (dato_kg >= 0),
  cijena_po_kg numeric(10, 2) not null check (cijena_po_kg >= 0),
  evidentirao_ime text not null,
  kreirano_at timestamptz not null default now()
);

alter table public.uskladjenja_jagnjetine enable row level security;

drop function if exists public.promijeni_status_narudzbe(uuid, text, text, numeric, text);

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

revoke all on function public.promijeni_status_narudzbe(uuid, text, text, numeric, text, numeric)
  from public, anon, authenticated;
grant execute on function public.promijeni_status_narudzbe(uuid, text, text, numeric, text, numeric)
  to service_role;
