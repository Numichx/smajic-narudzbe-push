create or replace function public.evidentiraj_promjenu_zalihe(
  p_zaliha_id uuid,
  p_promjena numeric,
  p_razlog text,
  p_akter_ime text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_artikal public.zaliha_artikli%rowtype;
  v_novo numeric(12, 3);
begin
  if p_promjena is null or p_promjena = 0 then
    raise exception 'Promjena zalihe ne može biti nula.';
  end if;
  if length(trim(coalesce(p_razlog, ''))) not between 3 and 200 then
    raise exception 'Unesite razlog promjene zalihe.';
  end if;
  if length(trim(coalesce(p_akter_ime, ''))) < 2 then
    raise exception 'Nedostaje ime osobe koja evidentira promjenu.';
  end if;

  select * into v_artikal
  from public.zaliha_artikli
  where id = p_zaliha_id and aktivan
  for update;
  if not found then raise exception 'Artikal zalihe nije pronađen.'; end if;

  v_novo := v_artikal.stanje + p_promjena;
  if v_novo < 0 then raise exception 'Stanje zalihe ne može biti negativno.'; end if;

  update public.zaliha_artikli set stanje = v_novo where id = p_zaliha_id;
  insert into public.prometi_zaliha (
    zaliha_id, promjena, razlog, evidentirao_ime
  ) values (p_zaliha_id, p_promjena, trim(p_razlog), trim(p_akter_ime));
  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  ) values (
    trim(p_akter_ime), 'sefica', 'promjena zalihe', 'zaliha_artikli',
    p_zaliha_id::text,
    jsonb_build_object(
      'artikal', v_artikal.naziv, 'promjena', p_promjena,
      'stanje_novo', v_novo, 'razlog', trim(p_razlog)
    )
  );
  return jsonb_build_object('stanje', v_novo);
end;
$$;

revoke all on function public.evidentiraj_promjenu_zalihe(uuid, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.evidentiraj_promjenu_zalihe(uuid, numeric, text, text)
  to service_role;
