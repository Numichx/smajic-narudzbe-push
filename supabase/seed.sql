insert into public.stolovi (id, naziv)
select sto_id, 'Sto ' || sto_id
from generate_series(1, 20) as sto_id
on conflict (id) do update set naziv = excluded.naziv;

insert into public.kategorije_menija (id, naziv, redoslijed)
values
  ('hladna-predjela', 'Hladna predjela', 1),
  ('topla-predjela', 'Topla predjela', 2),
  ('supe', 'Supe', 3),
  ('kuhana-jela', 'Kuhana jela', 4),
  ('jela-po-narudzbi', 'Jela po narudžbi', 5),
  ('piletina', 'Piletina', 6),
  ('rostilj', 'Roštilj', 7),
  ('pecenja', 'Pečenja', 8),
  ('riba', 'Riba', 9),
  ('prilozi', 'Prilozi', 10),
  ('salate', 'Salate', 11),
  ('hljeb', 'Hljeb', 12),
  ('deserti', 'Deserti', 13),
  ('vina', 'Vina', 14),
  ('zestoka-pica', 'Žestoka pića', 15),
  ('pivo', 'Pivo', 16),
  ('bezalkoholna-pica', 'Bezalkoholna pića', 17),
  ('topli-napici', 'Topli napici', 18)
on conflict (id) do update
set naziv = excluded.naziv, redoslijed = excluded.redoslijed;

insert into public.proizvodi (
  kategorija_id, naziv, cijena, jedinica, stanica, aktivan,
  napomena_cijene, redoslijed
)
values
  ('hladna-predjela', 'Pečenica', 6, 'porcija', 'kuhinja', true, null, 1),
  ('hladna-predjela', 'Sudžuk', 4, 'porcija', 'kuhinja', true, null, 2),
  ('hladna-predjela', 'Travnički sir', 4, 'porcija', 'kuhinja', true, null, 3),
  ('hladna-predjela', 'Trapist', 5, 'porcija', 'kuhinja', true, null, 4),
  ('hladna-predjela', 'Kajmak', 4, 'porcija', 'kuhinja', true, null, 5),
  ('hladna-predjela', 'Kajmak kugla', 2, 'kom', 'kuhinja', true, null, 6),

  ('topla-predjela', 'Omlet sa sirom', 8, 'porcija', 'kuhinja', true, null, 1),
  ('topla-predjela', 'Kajgana', 6, 'porcija', 'kuhinja', true, null, 2),
  ('topla-predjela', 'Pohovani sir', 7, 'porcija', 'kuhinja', true, null, 3),

  ('supe', 'Goveđa supa', 4, 'porcija', 'kuhinja', true, null, 1),
  ('supe', 'Teleća čorba', 8, 'porcija', 'kuhinja', true, null, 2),
  ('supe', 'Teleća tarhana', 8, 'porcija', 'kuhinja', true, null, 3),

  ('kuhana-jela', 'Lešo teletina', 17, 'porcija', 'kuhinja', true, null, 1),
  ('kuhana-jela', 'Gulaš', 13, 'porcija', 'kuhinja', true, null, 2),
  ('kuhana-jela', 'Sitni ćevap', 15, 'porcija', 'kuhinja', true, null, 3),
  ('kuhana-jela', 'Grah', 8, 'porcija', 'kuhinja', true, null, 4),
  ('kuhana-jela', 'Tripice', 9, 'porcija', 'kuhinja', true, null, 5),
  ('kuhana-jela', 'Pače (noga)', 9, 'porcija', 'kuhinja', true, null, 6),
  ('kuhana-jela', 'Pače (glava)', 9, 'porcija', 'kuhinja', true, null, 7),
  ('kuhana-jela', 'Pače (miješano)', 9, 'porcija', 'kuhinja', true, null, 8),

  ('jela-po-narudzbi', 'Natur šnicla', 17, 'porcija', 'kuhinja', true, null, 1),
  ('jela-po-narudzbi', 'Bečka šnicla', 19, 'porcija', 'kuhinja', true, null, 2),
  ('jela-po-narudzbi', 'Pariška šnicla', 19, 'porcija', 'kuhinja', true, null, 3),
  ('jela-po-narudzbi', 'Teleći medaljoni', 22, 'porcija', 'kuhinja', true, null, 4),
  ('jela-po-narudzbi', 'Travnički odrezak', 21, 'porcija', 'kuhinja', true, null, 5),
  ('jela-po-narudzbi', 'Odrezak na kućni način', 22, 'porcija', 'kuhinja', true, null, 6),
  ('jela-po-narudzbi', 'Mozak pohovani', 18, 'porcija', 'kuhinja', true, null, 7),
  ('jela-po-narudzbi', 'Mozak restovani', 18, 'porcija', 'kuhinja', true, null, 8),
  ('jela-po-narudzbi', 'Krezla', 19, 'porcija', 'kuhinja', true, null, 9),
  ('jela-po-narudzbi', 'Mućkalica', 20, 'porcija', 'kuhinja', true, null, 10),
  ('jela-po-narudzbi', 'Restovana teletina', 18, 'porcija', 'kuhinja', true, null, 11),

  ('piletina', 'Pileći file', 10, 'porcija', 'kuhinja', true, null, 1),
  ('piletina', 'Piletina punjena sirom', 14, 'porcija', 'kuhinja', true, null, 2),
  ('piletina', 'Pohovana piletina', 13, 'porcija', 'kuhinja', true, null, 3),
  ('piletina', 'Piletina u sosu', 13, 'porcija', 'kuhinja', true, null, 4),
  ('piletina', 'Pileći ražnjići', 10, 'porcija', 'kuhinja', true, null, 5),

  ('rostilj', 'Batak', 8, 'porcija', 'pecenjara', true, null, 1),
  ('rostilj', 'Peka', 16, 'porcija', 'pecenjara', true, null, 2),
  ('rostilj', 'Kotlet', 15, 'porcija', 'pecenjara', true, null, 3),
  ('rostilj', 'Ražnjići', 16, 'porcija', 'pecenjara', true, null, 4),
  ('rostilj', 'Bubreg', 10, 'porcija', 'pecenjara', true, null, 5),
  ('rostilj', 'Jetra', 17, 'porcija', 'pecenjara', true, null, 6),
  ('rostilj', 'Miješano meso', 35, 'porcija', 'pecenjara', true, null, 7),
  ('rostilj', 'Pljeskavica', 13, 'porcija', 'pecenjara', true, null, 8),
  ('rostilj', 'Punjena pljeskavica', 14, 'porcija', 'pecenjara', true, null, 9),
  ('rostilj', 'Kombinacija', 11.50, 'porcija', 'pecenjara', true, null, 10),
  ('rostilj', 'Sudžukice - mala porcija', 6.50, 'porcija', 'pecenjara', true, null, 11),
  ('rostilj', 'Sudžukice - srednja porcija', 11, 'porcija', 'pecenjara', true, null, 12),
  ('rostilj', 'Sudžukice - velika porcija', 15, 'porcija', 'pecenjara', true, null, 13),
  ('rostilj', 'Ćevapi - školska porcija', 5, 'porcija', 'pecenjara', true, null, 14),
  ('rostilj', 'Ćevapi - mala porcija', 9.50, 'porcija', 'pecenjara', true, null, 15),
  ('rostilj', 'Ćevapi - cijela lepinja', 10, 'porcija', 'pecenjara', true, null, 16),
  ('rostilj', 'Ćevapi - srednja porcija', 14.50, 'porcija', 'pecenjara', true, null, 17),
  ('rostilj', 'Ćevapi - velika porcija', 19, 'porcija', 'pecenjara', true, null, 18),

  ('pecenja', 'Jagnjetina s ražnja', 50, 'kg', 'pecenjara', true, null, 1),
  ('pecenja', 'Porcija jagnjetine', 16, 'porcija', 'pecenjara', true, null, 2),
  ('pecenja', 'Glava', 5, 'kom', 'pecenjara', true, null, 3),
  ('pecenja', 'Puca', 2.50, 'kom', 'pecenjara', true, null, 4),
  ('pecenja', 'Teletina ispod sača (kg)', 55, 'kg', 'pecenjara', true, null, 5),
  ('pecenja', 'Teletina ispod sača (porcija)', 18, 'porcija', 'pecenjara', true, null, 6),
  ('pecenja', 'Pečeno pile', 14, 'kom', 'pecenjara', true, null, 7),

  ('riba', 'Pastrmka sa žara', 17, 'porcija', 'kuhinja', true, null, 1),
  ('riba', 'Kuhana pastrmka', 17, 'porcija', 'kuhinja', true, null, 2),

  ('prilozi', 'Pekarski krompir', 3, 'porcija', 'kuhinja', true, null, 1),
  ('prilozi', 'Kuhani krompir', 3, 'porcija', 'kuhinja', true, null, 2),
  ('prilozi', 'Makaroni', 3, 'porcija', 'kuhinja', true, null, 3),
  ('prilozi', 'Pomfrit', 4, 'porcija', 'kuhinja', true, null, 4),
  ('prilozi', 'Riža', 4, 'porcija', 'kuhinja', true, null, 5),
  ('prilozi', 'Pire', 4, 'porcija', 'kuhinja', true, null, 6),
  ('prilozi', 'Povrće', 4, 'porcija', 'kuhinja', true, null, 7),
  ('prilozi', 'Sosovi', 1, 'porcija', 'kuhinja', true, null, 8),
  ('prilozi', 'Jogurt', 1.50, 'porcija', 'kuhinja', true, null, 9),

  ('salate', 'Zimska salata', 3, 'porcija', 'kuhinja', true, null, 1),
  ('salate', 'Sezonska salata', 3, 'porcija', 'kuhinja', true, null, 2),
  ('salate', 'Šopska salata', 5, 'porcija', 'kuhinja', true, null, 3),
  ('salate', 'Krompir salata', 3.50, 'porcija', 'kuhinja', true, null, 4),

  ('hljeb', 'Hljeb', 1, 'porcija', 'kuhinja', true, null, 1),
  ('hljeb', 'Lepinja', 1, 'kom', 'kuhinja', true, null, 2),
  ('hljeb', 'Uštipci', 5, 'porcija', 'kuhinja', true, null, 3),

  ('deserti', 'Baklava', 4, 'kom', 'kuhinja', true, null, 1),
  ('deserti', 'Hurmašica', 2.50, 'kom', 'kuhinja', true, null, 2),
  ('deserti', 'Kolač', 4, 'kom', 'kuhinja', true, null, 3),
  ('deserti', 'Palačinke', 5, 'porcija', 'kuhinja', true, null, 4),
  ('deserti', 'Plazma čaša', 3.50, 'kom', 'kuhinja', true, null, 5),

  ('vina', 'Vino 0,75 l', null, 'kom', 'sank', false, 'Cjenik navodi raspon 30–60 KM; unesite cijenu konkretnog vina.', 1),
  ('vina', 'Vino 1 l', null, 'kom', 'sank', false, 'Cjenik navodi raspon 20–25 KM; unesite cijenu konkretnog vina.', 2),
  ('vina', 'Vino 0,2 l', 7, 'kom', 'sank', true, null, 3),

  ('zestoka-pica', 'Domaća', 2.50, 'porcija', 'sank', true, null, 1),
  ('zestoka-pica', 'Štok', 3, 'porcija', 'sank', true, null, 2),
  ('zestoka-pica', 'Viski', null, 'porcija', 'sank', false, 'Cjenik navodi raspon 3–6 KM; unesite cijenu konkretnog pića.', 3),
  ('zestoka-pica', 'Viljamovka', 5, 'porcija', 'sank', true, null, 4),

  ('pivo', 'Pivo 0,33 l', null, 'kom', 'sank', false, 'Cjenik navodi raspon 3,50–4,50 KM; unesite cijenu konkretnog piva.', 1),
  ('pivo', 'Točeno pivo 1 l', 8, 'l', 'sank', true, null, 2),

  ('bezalkoholna-pica', 'Bezalkoholno piće', null, 'kom', 'sank', false, 'Cjenik navodi raspon 2,50–4 KM; unesite cijenu konkretnog pića.', 1),
  ('bezalkoholna-pica', 'Mineralna voda 1 l', 5, 'kom', 'sank', true, null, 2),

  ('topli-napici', 'Čaj', 2, 'porcija', 'sank', true, null, 1),
  ('topli-napici', 'Espresso', 2, 'porcija', 'sank', true, null, 2),
  ('topli-napici', 'Nescafé', 2.50, 'porcija', 'sank', true, null, 3),
  ('topli-napici', 'Cappuccino', 2.50, 'porcija', 'sank', true, null, 4)
on conflict (kategorija_id, naziv) do update
set cijena = excluded.cijena,
    jedinica = excluded.jedinica,
    stanica = excluded.stanica,
    aktivan = excluded.aktivan,
    napomena_cijene = excluded.napomena_cijene,
    redoslijed = excluded.redoslijed;

insert into public.pin_postavke (kljuc, pin_hash)
values
  ('osoblje', extensions.crypt('0000', extensions.gen_salt('bf'))),
  ('sefica', extensions.crypt('1234', extensions.gen_salt('bf'))),
  ('poseban_prilog', extensions.crypt('1111', extensions.gen_salt('bf')))
on conflict (kljuc) do nothing;

insert into public.zaliha_artikli (
  naziv, jedinica, stanje, minimum, nabavna_cijena
)
values
  ('Kotlet', 'kg', 10, 2, 15),
  ('Teletina', 'kg', 15, 3, 22),
  ('Junetina', 'kg', 15, 3, 16),
  ('Biftek', 'kg', 5, 1, 30),
  ('Ramstek', 'kg', 5, 1, 28),
  ('Ćevapi', 'kg', 25, 5, 12),
  ('Suho meso', 'kg', 4, 1, 30),
  ('Sudžuk', 'kg', 5, 1, 16),
  ('Stelja', 'kg', 5, 1, 14),
  ('Piletina', 'kg', 10, 3, 6),
  ('Janjetina', 'kg', 20, 5, 22),
  ('Pomfrit', 'kg', 25, 5, null),
  ('Lepinja', 'kom', 100, 20, null)
on conflict (naziv) do update
set jedinica = excluded.jedinica,
    stanje = excluded.stanje,
    minimum = excluded.minimum,
    nabavna_cijena = excluded.nabavna_cijena;

insert into public.recepti (proizvod_id)
select proizvod.id
from public.proizvodi proizvod
where proizvod.naziv in (
  'Natur šnicla',
  'Ćevapi - velika porcija',
  'Pomfrit'
)
on conflict (proizvod_id) do nothing;

insert into public.sastojci_recepta (recept_id, zaliha_id, kolicina)
select recept.id, zaliha.id, sastojak.kolicina
from (
  values
    ('Natur šnicla', 'Teletina', 0.2::numeric),
    ('Ćevapi - velika porcija', 'Ćevapi', 1::numeric),
    ('Ćevapi - velika porcija', 'Lepinja', 2::numeric),
    ('Pomfrit', 'Pomfrit', 0.2::numeric)
) as sastojak(proizvod_naziv, zaliha_naziv, kolicina)
join public.proizvodi proizvod on proizvod.naziv = sastojak.proizvod_naziv
join public.recepti recept on recept.proizvod_id = proizvod.id
join public.zaliha_artikli zaliha on zaliha.naziv = sastojak.zaliha_naziv
on conflict (recept_id, zaliha_id) do update
set kolicina = excluded.kolicina;
