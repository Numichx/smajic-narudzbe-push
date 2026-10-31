-- Lični PIN zaposlenika: zaposlenik kojeg šefica unese prijavljuje se samo
-- svojim PIN-om i aplikacija ga vodi na ekran njegove uloge.

-- Vraća jedinog aktivnog zaposlenika čiji PIN odgovara, bez obzira na ulogu.
-- null = nijedan PIN ne odgovara; {"dvosmislen": true} = PIN dijeli više ljudi.
create or replace function public.autentificiraj_zaposlenika(p_pin text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_pogodci jsonb;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,8}$' then
    return null;
  end if;

  select jsonb_agg(jsonb_build_object(
    'id', zaposlenik.id,
    'ime', zaposlenik.ime,
    'uloga', zaposlenik.uloga
  ))
  into v_pogodci
  from public.zaposlenici zaposlenik
  where zaposlenik.aktivan
    and zaposlenik.pin_hash = extensions.crypt(p_pin, zaposlenik.pin_hash);

  if v_pogodci is null then
    return null;
  end if;
  if jsonb_array_length(v_pogodci) > 1 then
    return jsonb_build_object('dvosmislen', true);
  end if;
  return v_pogodci -> 0;
end;
$$;

revoke all on function public.autentificiraj_zaposlenika(text)
  from public, anon, authenticated;
grant execute on function public.autentificiraj_zaposlenika(text)
  to service_role;

-- Isti potpis kao ranije; dodana provjera da lični PIN nije već dodijeljen
-- drugom aktivnom zaposleniku (inače prijava samo PIN-om ne bi bila jednoznačna).
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
  if exists (
    select 1 from public.zaposlenici zaposlenik
    where zaposlenik.aktivan
      and zaposlenik.id is distinct from p_id
      and zaposlenik.pin_hash = extensions.crypt(p_pin, zaposlenik.pin_hash)
  ) then
    raise exception 'Ovaj PIN već koristi drugi zaposlenik. Odaberite drugi PIN.';
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

revoke all on function public.sacuvaj_zaposlenika(text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.sacuvaj_zaposlenika(text, text, text, uuid)
  to service_role;
