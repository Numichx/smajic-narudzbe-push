alter table public.zaliha_artikli
  add column prodajna_cijena numeric(10, 2)
    check (prodajna_cijena is null or prodajna_cijena >= 0);

update public.zaliha_artikli
set prodajna_cijena = case naziv
  when 'Kotlet' then 15
  when 'Teletina' then 22
  when 'Junetina' then 16
  when 'Biftek' then 30
  when 'Ramstek' then 28
  when 'Ćevapi' then 12
  when 'Suho meso' then 30
  when 'Sudžuk' then 16
  when 'Stelja' then 14
  when 'Piletina' then 6
  when 'Janjetina' then 22
  else prodajna_cijena
end
where prodajna_cijena is null;

create table public.prodaje_mesnice (
  id uuid primary key default gen_random_uuid(),
  zaliha_id uuid not null references public.zaliha_artikli(id),
  kolicina numeric(12, 3) not null check (kolicina > 0),
  cijena_po_jedinici numeric(10, 2) not null check (cijena_po_jedinici >= 0),
  ukupno numeric(12, 2) not null check (ukupno >= 0),
  evidentirao_ime text not null,
  smjena_id uuid references public.smjene(id) on delete set null,
  kreirano_at timestamptz not null default now()
);

alter table public.prodaje_mesnice enable row level security;

create or replace function public.prodaj_artikal_mesnice(
  p_zaliha_id uuid,
  p_kolicina numeric,
  p_akter_ime text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_artikal public.zaliha_artikli%rowtype;
  v_prodaja_id uuid;
  v_ukupno numeric(12, 2);
  v_smjena_id uuid;
begin
  if p_kolicina is null or p_kolicina <= 0 then
    raise exception 'Količina za prodaju mora biti veća od nule.';
  end if;
  if p_akter_ime is null or length(trim(p_akter_ime)) < 2 then
    raise exception 'Nedostaje ime osobe koja evidentira prodaju.';
  end if;

  select * into v_artikal
  from public.zaliha_artikli
  where id = p_zaliha_id and aktivan
  for update;
  if not found then raise exception 'Artikal zalihe nije pronađen.'; end if;
  if v_artikal.jedinica <> 'kg' then
    raise exception 'Direktna prodaja po kilogramu dozvoljena je samo za meso.';
  end if;
  if v_artikal.stanje < p_kolicina then
    raise exception 'Nema dovoljno zalihe za ovu prodaju.';
  end if;
  if v_artikal.prodajna_cijena is null then
    raise exception 'Prodajna cijena artikla nije podešena.';
  end if;

  select id into v_smjena_id from public.smjene
  where status = 'otvorena' order by pocetak_at desc limit 1;
  v_ukupno := round(p_kolicina * v_artikal.prodajna_cijena, 2);

  update public.zaliha_artikli
  set stanje = stanje - p_kolicina
  where id = p_zaliha_id;

  insert into public.prometi_zaliha (
    zaliha_id, promjena, razlog, evidentirao_ime
  ) values (p_zaliha_id, -p_kolicina, 'Prodaja mesnice', trim(p_akter_ime));

  insert into public.prodaje_mesnice (
    zaliha_id, kolicina, cijena_po_jedinici, ukupno, evidentirao_ime, smjena_id
  ) values (
    p_zaliha_id, p_kolicina, v_artikal.prodajna_cijena, v_ukupno,
    trim(p_akter_ime), v_smjena_id
  ) returning id into v_prodaja_id;

  insert into public.dnevnik_radnji (
    akter_ime, akter_uloga, radnja, entitet, entitet_id, detalji
  ) values (
    trim(p_akter_ime), 'mesnica', 'prodaja', 'prodaja_mesnice', v_prodaja_id::text,
    jsonb_build_object(
      'artikal', v_artikal.naziv, 'kolicina', p_kolicina,
      'ukupno', v_ukupno, 'smjena_id', v_smjena_id
    )
  );

  return jsonb_build_object(
    'id', v_prodaja_id, 'kolicina', p_kolicina,
    'cijena_po_jedinici', v_artikal.prodajna_cijena, 'ukupno', v_ukupno
  );
end;
$$;

revoke all on function public.prodaj_artikal_mesnice(uuid, numeric, text)
  from public, anon, authenticated;
grant execute on function public.prodaj_artikal_mesnice(uuid, numeric, text)
  to service_role;
