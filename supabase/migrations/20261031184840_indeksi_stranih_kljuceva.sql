-- Indeksi za strane ključeve bez pokrivajućeg indeksa (Supabase performance advisor).

create index if not exists dopune_sanka_proizvod_id_idx on public.dopune_sanka (proizvod_id);
create index if not exists dopune_sanka_smjena_id_idx on public.dopune_sanka (smjena_id);
create index if not exists potrosnja_zaliha_zaliha_id_idx on public.potrosnja_zaliha (zaliha_id);
create index if not exists prodaje_mesnice_smjena_id_idx on public.prodaje_mesnice (smjena_id);
create index if not exists prodaje_mesnice_zaliha_id_idx on public.prodaje_mesnice (zaliha_id);
create index if not exists prometi_zaliha_povezana_narudzba_id_idx on public.prometi_zaliha (povezana_narudzba_id);
create index if not exists racuni_konobar_id_idx on public.racuni (konobar_id);
create index if not exists rezervacije_sto_id_idx on public.rezervacije (sto_id);
create index if not exists sastojci_recepta_zaliha_id_idx on public.sastojci_recepta (zaliha_id);
create index if not exists stavke_narudzbe_proizvod_id_idx on public.stavke_narudzbe (proizvod_id);
create index if not exists uplate_pecenjari_smjena_id_idx on public.uplate_pecenjari (smjena_id);
create index if not exists uskladjenja_jagnjetine_narudzba_id_idx on public.uskladjenja_jagnjetine (narudzba_id);
create index if not exists uskladjenja_jagnjetine_stavka_id_idx on public.uskladjenja_jagnjetine (stavka_id);
create index if not exists zahtjevi_mesnice_narudzba_id_idx on public.zahtjevi_mesnice (narudzba_id);
create index if not exists zahtjevi_mesnice_zaliha_id_idx on public.zahtjevi_mesnice (zaliha_id);
