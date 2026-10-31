create table public.narudzba_idempotencija (
  request_id uuid primary key,
  rezultat jsonb not null,
  kreirano_at timestamptz not null default now()
);

alter table public.narudzba_idempotencija enable row level security;

create or replace function public.posalji_narudzbu_idempotentnu(
  p_request_id uuid,
  p_sto_id smallint,
  p_konobar_ime text,
  p_stavke jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rezultat jsonb;
begin
  if p_request_id is null then
    raise exception 'Nedostaje identifikator zahtjeva.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select rezultat into v_rezultat
  from public.narudzba_idempotencija
  where request_id = p_request_id;

  if found then
    return v_rezultat;
  end if;

  v_rezultat := public.posalji_narudzbu(p_sto_id, p_konobar_ime, p_stavke);
  insert into public.narudzba_idempotencija(request_id, rezultat)
  values (p_request_id, v_rezultat);
  return v_rezultat;
end;
$$;

revoke all on function public.posalji_narudzbu_idempotentnu(uuid, smallint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.posalji_narudzbu_idempotentnu(uuid, smallint, text, jsonb)
  to service_role;
