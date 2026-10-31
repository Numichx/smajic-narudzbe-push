-- 1) Isporuka mesnice kuhinji: roba izlazi iz mesnice, pa se stanje SMANJUJE
--    (ranije se povećavalo, kao da mesnica prima robu).
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
  v_novo := v_artikal.stanje - p_kolicina;
  if v_novo < 0 then
    raise exception 'Nema dovoljno na stanju. Trenutno stanje: % %.',
      v_artikal.stanje, v_artikal.jedinica;
  end if;

  update public.zaliha_artikli set stanje = v_novo where id = v_artikal.id;
  insert into public.prometi_zaliha (
    zaliha_id, promjena, razlog, evidentirao_ime
  )
  values (v_artikal.id, -p_kolicina, 'Isporuka kuhinji', trim(p_akter_ime));
  update public.zahtjevi_mesnice
  set status = 'isporucen', kolicina = p_kolicina,
      isporucio_ime = trim(p_akter_ime), zavrseno_at = now()
  where id = p_zahtjev_id;

  return jsonb_build_object('stanje', v_novo, 'zahtjev_id', p_zahtjev_id);
end;
$$;

revoke all on function public.isporuci_zahtjev_mesnice(uuid, numeric, text)
  from public, anon, authenticated;
grant execute on function public.isporuci_zahtjev_mesnice(uuid, numeric, text)
  to service_role;

-- 2) Promjena zalihe bilježi stvarnu ulogu (mesnica ili šefica) u dnevniku
--    radnji umjesto uvijek 'sefica'. Nova verzija ima 5 parametara (bez
--    zadane vrijednosti, da poziv sa 4 parametra ostane jednoznačan); stara
--    verzija sa 4 parametra prosljeđuje na novu s ulogom 'sefica'.
create or replace function public.evidentiraj_promjenu_zalihe(
  p_zaliha_id uuid,
  p_promjena numeric,
  p_razlog text,
  p_akter_ime text,
  p_akter_uloga text
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
  if coalesce(p_akter_uloga, '') not in ('sefica', 'mesnica') then
    raise exception 'Ova uloga ne može mijenjati stanje zalihe.';
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
    trim(p_akter_ime), p_akter_uloga, 'promjena zalihe', 'zaliha_artikli',
    p_zaliha_id::text,
    jsonb_build_object(
      'artikal', v_artikal.naziv, 'promjena', p_promjena,
      'stanje_novo', v_novo, 'razlog', trim(p_razlog)
    )
  );
  return jsonb_build_object('stanje', v_novo);
end;
$$;

revoke all on function public.evidentiraj_promjenu_zalihe(uuid, numeric, text, text, text)
  from public, anon, authenticated;
grant execute on function public.evidentiraj_promjenu_zalihe(uuid, numeric, text, text, text)
  to service_role;

create or replace function public.evidentiraj_promjenu_zalihe(
  p_zaliha_id uuid,
  p_promjena numeric,
  p_razlog text,
  p_akter_ime text
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.evidentiraj_promjenu_zalihe(
    p_zaliha_id, p_promjena, p_razlog, p_akter_ime, 'sefica'
  );
$$;

revoke all on function public.evidentiraj_promjenu_zalihe(uuid, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.evidentiraj_promjenu_zalihe(uuid, numeric, text, text)
  to service_role;
