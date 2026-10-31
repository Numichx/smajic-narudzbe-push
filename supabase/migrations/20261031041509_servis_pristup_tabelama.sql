-- Od 30.10.2026. Supabase novim tabelama više ne daje automatske privilegije
-- za Data API (ni service_role). Aplikacija sa servera, preko service_role,
-- direktno čita tabele ispod, a mijenja samo tri; sve ostale izmjene idu kroz
-- security definer funkcije. Dodjela je ograničena na ono što se koristi.
-- anon i authenticated i dalje nemaju pristup.

grant usage on schema public to service_role;

grant select on
  public.dnevnik_radnji,
  public.kategorije_menija,
  public.naplate,
  public.narudzbe,
  public.pecenjara_popisi_smjena,
  public.proizvodi,
  public.racun_stolovi,
  public.racuni,
  public.recepti,
  public.rezervacije,
  public.sastojci_recepta,
  public.smjene,
  public.stavke_narudzbe,
  public.stolovi,
  public.uplate_pecenjari,
  public.zahtjevi_mesnice,
  public.zaliha_artikli
to service_role;

-- pin_hash se ne smije čitati izvan funkcija za provjeru PIN-a.
grant select (id, ime, uloga, aktivan, kreirano_at, izmijenjeno_at)
  on public.zaposlenici to service_role;

grant update on
  public.rezervacije,
  public.zaliha_artikli,
  public.zahtjevi_mesnice
to service_role;
