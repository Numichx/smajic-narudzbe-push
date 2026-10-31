-- Ograničenje pokušaja PIN prijave (zaštita od pogađanja PIN-a).
-- Bilježi se svaki pokušaj. U prozoru od 15 minuta:
--   * 5 neuspjeha s istog uređaja (IP adrese) od njegove zadnje uspješne
--     prijave zaključava taj uređaj,
--   * 30 neuspjeha ukupno zaključava sve PIN prijave,
-- dok najstariji takav neuspjeh ne izađe iz prozora.

create table public.pin_pokusaji (
  id bigint generated always as identity primary key,
  ip text not null,
  uspjesan boolean not null,
  kreirano_at timestamptz not null default now()
);

create index pin_pokusaji_ip_vrijeme_idx on public.pin_pokusaji (ip, kreirano_at);
create index pin_pokusaji_neuspjesni_vrijeme_idx on public.pin_pokusaji (kreirano_at)
  where not uspjesan;

alter table public.pin_pokusaji enable row level security;
revoke all on public.pin_pokusaji from public, anon, authenticated;

-- Vraća broj sekundi do otključavanja (0 = prijava je dozvoljena).
create or replace function public.provjeri_ogranicenje_pina(p_ip text)
returns integer
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_prozor constant interval := interval '15 minutes';
  v_ip text := coalesce(p_ip, 'nepoznat');
  v_od timestamptz := now() - v_prozor;
  v_ip_od timestamptz;
  v_ip_broj integer;
  v_ip_najstariji timestamptz;
  v_svi_broj integer;
  v_svi_najstariji timestamptz;
  v_cekanje integer := 0;
begin
  select greatest(v_od, coalesce(max(kreirano_at), v_od)) into v_ip_od
  from public.pin_pokusaji
  where ip = v_ip and uspjesan and kreirano_at > v_od;

  select count(*), min(kreirano_at) into v_ip_broj, v_ip_najstariji
  from public.pin_pokusaji
  where ip = v_ip and not uspjesan and kreirano_at > v_ip_od;

  if v_ip_broj >= 5 then
    v_cekanje := greatest(v_cekanje,
      ceil(extract(epoch from (v_ip_najstariji + v_prozor - now())))::integer);
  end if;

  select count(*), min(kreirano_at) into v_svi_broj, v_svi_najstariji
  from public.pin_pokusaji
  where not uspjesan and kreirano_at > v_od;

  if v_svi_broj >= 30 then
    v_cekanje := greatest(v_cekanje,
      ceil(extract(epoch from (v_svi_najstariji + v_prozor - now())))::integer);
  end if;

  return greatest(v_cekanje, 0);
end;
$$;

create or replace function public.zabiljezi_pin_pokusaj(p_ip text, p_uspjesan boolean)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.pin_pokusaji (ip, uspjesan)
  values (coalesce(p_ip, 'nepoznat'), coalesce(p_uspjesan, false));
$$;

revoke all on function public.provjeri_ogranicenje_pina(text)
  from public, anon, authenticated;
grant execute on function public.provjeri_ogranicenje_pina(text) to service_role;

revoke all on function public.zabiljezi_pin_pokusaj(text, boolean)
  from public, anon, authenticated;
grant execute on function public.zabiljezi_pin_pokusaj(text, boolean) to service_role;
