create table public.stavke_prilozi_veza (
  osnovna_stavka_id uuid not null references public.stavke_narudzbe(id) on delete cascade,
  prilog_stavka_id uuid not null unique references public.stavke_narudzbe(id) on delete cascade,
  primary key (osnovna_stavka_id, prilog_stavka_id)
);

alter table public.stavke_prilozi_veza enable row level security;

create or replace function public.upozori_stanicu_na_storno()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.stornirano and not old.stornirano then
    update public.stavke_narudzbe prilog
    set stornirano = true,
        storno_razlog = new.storno_razlog,
        storno_vrijednost = 0,
        stornirano_at = now()
    from public.stavke_prilozi_veza veza
    where veza.osnovna_stavka_id = new.id
      and prilog.id = veza.prilog_stavka_id
      and not prilog.stornirano;
  end if;
  return new;
end;
$$;

create trigger stavka_storno_obavijesti_prilog
  after update of stornirano on public.stavke_narudzbe
  for each row execute function public.upozori_stanicu_na_storno();

revoke all on function public.upozori_stanicu_na_storno()
  from public, anon, authenticated;
