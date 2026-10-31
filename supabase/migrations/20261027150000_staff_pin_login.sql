create or replace function public.autentificiraj_konobara(
  p_ime text,
  p_pin text
)
returns jsonb
language sql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
  select case
    when zaposlenik.id is null then null
    when zaposlenik.pin_hash = extensions.crypt(p_pin, zaposlenik.pin_hash)
      then jsonb_build_object(
        'id', zaposlenik.id,
        'ime', zaposlenik.ime,
        'uloga', zaposlenik.uloga
      )
    else jsonb_build_object('pogresan_pin', true)
  end
  from (select 1) as singleton
  left join public.zaposlenici zaposlenik
    on lower(trim(zaposlenik.ime)) = lower(trim(p_ime))
    and zaposlenik.uloga = 'konobar'
    and zaposlenik.aktivan
  limit 1;
$$;

create or replace function public.sacuvaj_zaposlenika(
  p_ime text,
  p_uloga text,
  p_pin text,
  p_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  if length(trim(p_ime)) not between 2 and 80 then
    raise exception 'Ime zaposlenika mora imati od 2 do 80 znakova.';
  end if;
  if p_uloga not in ('konobar', 'kuhinja', 'pecenjara', 'sank', 'mesnica', 'sefica') then
    raise exception 'Nepoznata uloga zaposlenika.';
  end if;
  if p_pin !~ '^[0-9]{4,8}$' then
    raise exception 'PIN mora imati 4 do 8 cifara.';
  end if;

  if p_id is null then
    insert into public.zaposlenici (ime, uloga, pin_hash)
    values (
      trim(p_ime), p_uloga,
      extensions.crypt(p_pin, extensions.gen_salt('bf'))
    )
    returning id into v_id;
  else
    update public.zaposlenici
    set ime = trim(p_ime), uloga = p_uloga,
        pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
        aktivan = true
    where id = p_id
    returning id into v_id;
    if not found then raise exception 'Zaposlenik nije pronađen.'; end if;
  end if;

  return v_id;
end;
$$;

create or replace function public.postavi_status_zaposlenika(
  p_id uuid,
  p_aktivan boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.zaposlenici set aktivan = p_aktivan where id = p_id;
  if not found then raise exception 'Zaposlenik nije pronađen.'; end if;
end;
$$;

revoke all on function public.autentificiraj_konobara(text, text)
  from public, anon, authenticated;
grant execute on function public.autentificiraj_konobara(text, text)
  to service_role;
revoke all on function public.sacuvaj_zaposlenika(text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.sacuvaj_zaposlenika(text, text, text, uuid)
  to service_role;
revoke all on function public.postavi_status_zaposlenika(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.postavi_status_zaposlenika(uuid, boolean)
  to service_role;
