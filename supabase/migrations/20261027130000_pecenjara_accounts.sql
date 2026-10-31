alter table public.narudzbe
  add column cijena_pecenjari numeric(10, 2)
    check (cijena_pecenjari is null or cijena_pecenjari >= 0);

create or replace function public.promijeni_status_narudzbe(
  p_narudzba_id uuid,
  p_uloga text,
  p_novi_status text,
  p_cijena_pecenjari numeric,
  p_akter_ime text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_narudzba public.narudzbe%rowtype;
  v_do_statusa text;
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
        then p_cijena_pecenjari else v_narudzba.cijena_pecenjari end
    )
  );

  return jsonb_build_object(
    'id', p_narudzba_id,
    'stanica', v_narudzba.stanica,
    'status', v_do_statusa,
    'cijena_pecenjari', case when v_do_statusa = 'Gotovo'
      then p_cijena_pecenjari else v_narudzba.cijena_pecenjari end
  );
end;
$$;

revoke all on function public.promijeni_status_narudzbe(uuid, text, text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.promijeni_status_narudzbe(uuid, text, text, numeric, text)
  to service_role;
