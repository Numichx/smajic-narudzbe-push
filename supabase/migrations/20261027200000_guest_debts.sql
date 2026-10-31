create or replace function public.naplati_dug_gosta(
  p_racun_id uuid,
  p_nacin text,
  p_akter_ime text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_racun public.racuni%rowtype;
  v_naplata public.naplate%rowtype;
begin
  if p_nacin not in ('gotovina', 'kartica') then
    raise exception 'Način naplate duga nije ispravan.';
  end if;
  if length(trim(coalesce(p_akter_ime, ''))) < 2 then
    raise exception 'Nedostaje ime osobe koja naplaćuje dug.';
  end if;

  select * into v_racun
  from public.racuni
  where id = p_racun_id and status = 'na_dug'
  for update;
  if not found then raise exception 'Otvoreni dug nije pronađen.'; end if;

  select * into v_naplata
  from public.naplate
  where racun_id = p_racun_id and nacin = 'dug'
  order by kreirano_at desc
  limit 1
  for update;
  if not found then raise exception 'Evidencija duga nije pronađena.'; end if;

  update public.naplate
  set nacin = p_nacin,
      gost_dao = ukupno,
      kusur = 0,
      baksis = 0,
      naplatio_ime = trim(p_akter_ime),
      kreirano_at = now()
  where id = v_naplata.id;

  update public.racuni
  set status = 'placen', zatvoren_at = now()
  where id = p_racun_id;

  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  )
  values (
    trim(p_akter_ime), 'sefica', 'naplaćen dug', 'racun', p_racun_id::text,
    jsonb_build_object(
      'duznik', v_racun.gost_duznik, 'iznos', v_naplata.ukupno,
      'nacin', p_nacin
    )
  );

  return jsonb_build_object(
    'racun_id', p_racun_id, 'duznik', v_racun.gost_duznik,
    'iznos', v_naplata.ukupno, 'status', 'placen'
  );
end;
$$;

revoke all on function public.naplati_dug_gosta(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.naplati_dug_gosta(uuid, text, text)
  to service_role;
