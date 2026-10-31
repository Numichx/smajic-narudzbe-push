alter function public.posalji_narudzbu(smallint, text, jsonb)
  rename to posalji_narudzbu_singletable;

create or replace function public.posalji_narudzbu(
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
  v_sto_id smallint := p_sto_id;
  v_racun_sto_id smallint;
begin
  select racun.sto_id into v_racun_sto_id
  from public.racun_stolovi povezani
  join public.racuni racun on racun.id = povezani.racun_id
  where povezani.sto_id = p_sto_id
    and racun.status = 'otvoren'
  for update of racun;

  if found then
    v_sto_id := v_racun_sto_id;
  end if;

  return public.posalji_narudzbu_singletable(
    v_sto_id, p_konobar_ime, p_stavke
  );
end;
$$;

revoke all on function public.posalji_narudzbu(smallint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.posalji_narudzbu(smallint, text, jsonb)
  to service_role;
revoke all on function public.posalji_narudzbu_singletable(smallint, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.posalji_narudzbu_singletable(smallint, text, jsonb)
  to service_role;

create or replace function public.skini_zalihe_za_stavku()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sastojak record;
  v_stanje numeric(12, 3);
  v_minimum numeric(12, 3);
  v_novo numeric(12, 3);
begin
  for v_sastojak in
    select sastojak.zaliha_id, sastojak.kolicina
    from public.recepti recept
    join public.sastojci_recepta sastojak on sastojak.recept_id = recept.id
    where recept.proizvod_id = new.proizvod_id
    order by sastojak.zaliha_id
  loop
    select stanje, minimum into v_stanje, v_minimum
    from public.zaliha_artikli
    where id = v_sastojak.zaliha_id and aktivan
    for update;

    if not found then
      raise exception 'Sastojak recepta nije aktivan.';
    end if;

    if v_stanje < v_sastojak.kolicina * new.kolicina then
      raise exception 'Nema dovoljno zalihe za stavku "%".', new.naziv;
    end if;

    v_novo := v_stanje - v_sastojak.kolicina * new.kolicina;
    update public.zaliha_artikli
    set stanje = v_novo
    where id = v_sastojak.zaliha_id;

    insert into public.potrosnja_zaliha (
      narudzba_id, stavka_id, zaliha_id, kolicina
    )
    values (
      new.narudzba_id, new.id, v_sastojak.zaliha_id,
      v_sastojak.kolicina * new.kolicina
    );

    insert into public.prometi_zaliha (
      zaliha_id, promjena, razlog, povezana_narudzba_id, evidentirao_ime
    )
    select v_sastojak.zaliha_id,
      -(v_sastojak.kolicina * new.kolicina),
      'Potrošnja po narudžbi ' || narudzba.broj,
      new.narudzba_id,
      narudzba.kreirao_ime
    from public.narudzbe narudzba
    where narudzba.id = new.narudzba_id;

    if v_novo <= v_minimum and v_minimum > 0 and not exists (
      select 1
      from public.zahtjevi_mesnice zahtjev
      where zahtjev.zaliha_id = v_sastojak.zaliha_id
        and zahtjev.status = 'nov'
    ) then
      insert into public.zahtjevi_mesnice (
        zaliha_id, izvor, narudzba_id, kreirao_ime
      )
      select v_sastojak.zaliha_id, 'minimum', new.narudzba_id,
        narudzba.kreirao_ime
      from public.narudzbe narudzba
      where narudzba.id = new.narudzba_id;
    end if;
  end loop;

  return new;
end;
$$;

create trigger stavke_narudzbe_skidanje_zalihe
  after insert on public.stavke_narudzbe
  for each row execute function public.skini_zalihe_za_stavku();

revoke all on function public.skini_zalihe_za_stavku()
  from public, anon, authenticated;

