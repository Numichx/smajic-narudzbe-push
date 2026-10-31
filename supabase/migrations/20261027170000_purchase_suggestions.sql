create or replace function public.prijedlog_nabavke()
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  with utrosak_recepta as (
    select sastojak.zaliha_id,
      sum(stavka.kolicina * sastojak.kolicina) as kolicina
    from public.stavke_narudzbe stavka
    join public.narudzbe narudzba on narudzba.id = stavka.narudzba_id
    join public.recepti recept on recept.proizvod_id = stavka.proizvod_id
    join public.sastojci_recepta sastojak on sastojak.recept_id = recept.id
    where narudzba.kreirano_at >= now() - interval '7 days'
      and not stavka.stornirano
    group by sastojak.zaliha_id
  ),
  utrosak_prodaje as (
    select prodaja.zaliha_id, sum(prodaja.kolicina) as kolicina
    from public.prodaje_mesnice prodaja
    where prodaja.kreirano_at >= now() - interval '7 days'
    group by prodaja.zaliha_id
  ),
  ukupno as (
    select zaliha_id, sum(kolicina) as kolicina
    from (
      select * from utrosak_recepta
      union all
      select * from utrosak_prodaje
    ) promet
    group by zaliha_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', artikal.id,
    'naziv', artikal.naziv,
    'jedinica', artikal.jedinica,
    'stanje', artikal.stanje,
    'sedmodnevna_prodaja', coalesce(utrosak.kolicina, 0),
    'predlozena_nabavka', ceil(coalesce(utrosak.kolicina, 0) * 1.2 * 1000) / 1000
  ) order by artikal.naziv), '[]'::jsonb)
  from public.zaliha_artikli artikal
  left join ukupno utrosak on utrosak.zaliha_id = artikal.id
  where artikal.aktivan;
$$;

revoke all on function public.prijedlog_nabavke()
  from public, anon, authenticated;
grant execute on function public.prijedlog_nabavke() to service_role;
