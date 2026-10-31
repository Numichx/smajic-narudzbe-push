create or replace function public.registruj_uplatu_pecenjari(
  p_konobar_ime text,
  p_iznos numeric,
  p_akter_ime text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dug numeric(12, 2);
  v_smjena_id uuid;
  v_uplata_id uuid;
begin
  if p_konobar_ime is null or length(trim(p_konobar_ime)) < 2 then
    raise exception 'Ime konobara nije ispravno.';
  end if;
  if p_akter_ime is null or length(trim(p_akter_ime)) < 2 then
    raise exception 'Nedostaje ime osobe koja evidentira uplatu.';
  end if;
  if p_iznos is null or p_iznos <= 0 then
    raise exception 'Iznos uplate mora biti veći od nule.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(lower(trim(p_konobar_ime)), 1));
  select coalesce(sum(narudzba.cijena_pecenjari), 0)
    - coalesce((
      select sum(uplata.iznos)
      from public.uplate_pecenjari uplata
      where lower(uplata.konobar_ime) = lower(trim(p_konobar_ime))
    ), 0)
  into v_dug
  from public.narudzbe narudzba
  where narudzba.stanica = 'pecenjara'
    and narudzba.status = 'Izdato'
    and lower(narudzba.kreirao_ime) = lower(trim(p_konobar_ime));

  if p_iznos > greatest(v_dug, 0) then
    raise exception 'Uplata prelazi dug konobara (% KM).', greatest(v_dug, 0);
  end if;

  select id into v_smjena_id
  from public.smjene where status = 'otvorena'
  order by pocetak_at desc limit 1;

  insert into public.uplate_pecenjari (
    konobar_ime, smjena_id, iznos, evidentirao_ime
  )
  values (
    trim(p_konobar_ime), v_smjena_id, p_iznos, trim(p_akter_ime)
  )
  returning id into v_uplata_id;

  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  )
  values (
    trim(p_akter_ime), 'pecenjara', 'uplata pečenjari', 'uplata_pecenjari',
    v_uplata_id::text,
    jsonb_build_object('konobar', trim(p_konobar_ime), 'iznos', p_iznos, 'smjena_id', v_smjena_id)
  );

  return jsonb_build_object(
    'uplata_id', v_uplata_id, 'konobar_ime', trim(p_konobar_ime),
    'iznos', p_iznos, 'preostali_dug', round(v_dug - p_iznos, 2)
  );
end;
$$;

revoke all on function public.registruj_uplatu_pecenjari(text, numeric, text)
  from public, anon, authenticated;
grant execute on function public.registruj_uplatu_pecenjari(text, numeric, text)
  to service_role;
