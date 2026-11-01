-- Lak PIN se više ne može postaviti: ista cifra (1111), ponovljeni par, trojka
-- ili četvorka (1212, 123123), niz (1234, 4321), godina (1950–2039) i česti
-- obrasci na tastaturi (2580, 1470...). Postojeći PIN-ovi i dalje rade;
-- odbija se samo novi unos (zaposlenik ili PIN uloge).

create or replace function public.je_slab_pin(p_pin text)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $$
declare
  v_korak integer;
  i integer;
begin
  if p_pin is null or p_pin !~ '^[0-9]{4,8}$' then
    return false;
  end if;

  if p_pin ~ '^(.)\1+$'
    or p_pin ~ '^(..)\1+$'
    or p_pin ~ '^(...)\1+$'
    or p_pin ~ '^(....)\1+$'
  then
    return true;
  end if;

  -- Rastući ili opadajući niz cifara (1234, 98765).
  v_korak := ascii(substr(p_pin, 2, 1)) - ascii(substr(p_pin, 1, 1));
  if abs(v_korak) = 1 then
    for i in 3..length(p_pin) loop
      if ascii(substr(p_pin, i, 1)) - ascii(substr(p_pin, i - 1, 1)) <> v_korak then
        v_korak := 0;
        exit;
      end if;
    end loop;
    if v_korak <> 0 then
      return true;
    end if;
  end if;

  if p_pin ~ '^(19[5-9][0-9]|20[0-3][0-9])$' then
    return true;
  end if;

  return p_pin = any (array[
    '2580', '0852', '1470', '0741', '3690', '0963', '1357', '2468', '1478',
    '3698', '1122', '1004', '112233', '147258', '258369', '159753', '147852'
  ]);
end;
$$;

revoke all on function public.je_slab_pin(text) from public, anon, authenticated;

-- Isti potpis i ponašanje kao ranije, uz odbijanje lakog PIN-a.
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
  if public.je_slab_pin(p_pin) then
    raise exception 'PIN je previše lak (npr. 1111, 1234, 2580 ili godina). Odaberite drugi PIN.';
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

-- PIN uloge (osoblje, šefica, poseban prilog): isto pravilo.
create or replace function public.postavi_pin(p_kljuc text, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if p_kljuc not in ('osoblje', 'sefica', 'poseban_prilog')
    or p_pin !~ '^[0-9]{4,8}$'
  then
    raise exception 'PIN ili vrsta PIN-a nisu ispravni.';
  end if;
  if public.je_slab_pin(p_pin) then
    raise exception 'PIN je previše lak (npr. 1111, 1234, 2580 ili godina). Odaberite drugi PIN.';
  end if;

  insert into public.pin_postavke (kljuc, pin_hash)
  values (p_kljuc, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (kljuc) do update
  set pin_hash = excluded.pin_hash, izmijenjeno_at = now();
end;
$$;

revoke all on function public.postavi_pin(text, text) from public, anon, authenticated;
grant execute on function public.postavi_pin(text, text) to service_role;

-- Pomoćne funkcije koje su još bile izvršive javnim ključem. Nisu imale
-- pristup podacima (nisu security definer), ali im javni ključ ne treba.
revoke all on function public.osiguraj_racun_stol() from public, anon, authenticated;
revoke all on function public.postavi_vrijeme_izmjene() from public, anon, authenticated;
revoke all on function public.ukupno_racuna(uuid) from public, anon, authenticated;
