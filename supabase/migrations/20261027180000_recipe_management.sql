create or replace function public.sacuvaj_recept(
  p_proizvod_id uuid,
  p_sastojci jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_recept_id uuid;
begin
  if not exists (
    select 1 from public.proizvodi
    where id = p_proizvod_id and aktivan
  ) then
    raise exception 'Proizvod nije pronađen ili nije aktivan.';
  end if;
  if jsonb_typeof(p_sastojci) is distinct from 'array' then
    raise exception 'Sastojci recepta moraju biti lista.';
  end if;
  if jsonb_array_length(p_sastojci) > 50 then
    raise exception 'Recept ima previše sastojaka.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_sastojci) as sastojak(
      zaliha_id uuid, kolicina numeric
    )
    where sastojak.zaliha_id is null or sastojak.kolicina is null
      or sastojak.kolicina <= 0
  ) then
    raise exception 'Sastojci recepta nisu ispravni.';
  end if;

  insert into public.recepti(proizvod_id)
  values (p_proizvod_id)
  on conflict (proizvod_id) do update
  set izmijenjeno_at = now()
  returning id into v_recept_id;

  delete from public.sastojci_recepta where recept_id = v_recept_id;
  insert into public.sastojci_recepta(recept_id, zaliha_id, kolicina)
  select v_recept_id, sastojak.zaliha_id, sastojak.kolicina
  from jsonb_to_recordset(p_sastojci) as sastojak(
    zaliha_id uuid, kolicina numeric
  );
  return v_recept_id;
end;
$$;

revoke all on function public.sacuvaj_recept(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.sacuvaj_recept(uuid, jsonb)
  to service_role;
