insert into public.stolovi (id, naziv)
select sto_id, 'Sto ' || sto_id
from generate_series(1, 20) as sto_id
on conflict (id) do update set naziv = excluded.naziv;

insert into public.kategorije_menija (id, naziv, redoslijed)
values
  ('hladna-predjela', 'Hladna predjela', 1),
  ('topla-predjela', 'Topla predjela', 2),
  ('supe', 'Supe i čorbe', 3),
  ('kuhana-jela', 'Kuhana jela', 4),
  ('jela-po-narudzbi', 'Jela po narudžbi', 5),
  ('piletina', 'Specijaliteti od piletine', 6),
  ('rostilj', 'Jela sa roštilja', 7),
  ('pecenja', 'Pečenja', 8),
  ('riba', 'Riba', 9),
  ('prilozi', 'Prilozi', 10),
  ('salate', 'Salate', 11),
  ('hljeb', 'Hljeb i peciva', 12),
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
  ('hladna-predjela', 'Goveđa pečenica', 6, 'porcija', 'kuhinja', true, null, 1),
  ('hladna-predjela', 'Goveđi sudžuk', 4, 'porcija', 'kuhinja', true, null, 2),
  ('hladna-predjela', 'Travnički sir', 4, 'porcija', 'kuhinja', true, null, 3),
  ('hladna-predjela', 'Trapist sir', 5, 'porcija', 'kuhinja', true, null, 4),
  ('hladna-predjela', 'Kajmak', 4, 'porcija', 'kuhinja', true, null, 5),
  ('hladna-predjela', 'Kajmak – kugla', 2, 'kom', 'kuhinja', true, null, 6),

  ('topla-predjela', 'Omlet sa sirom', 8, 'porcija', 'kuhinja', true, null, 1),
  ('topla-predjela', 'Kajgana (2 jaja)', 6, 'porcija', 'kuhinja', true, null, 2),
  ('topla-predjela', 'Pohovani sir', 7, 'porcija', 'kuhinja', true, null, 3),

  ('supe', 'Goveđa supa', 4, 'porcija', 'kuhinja', true, null, 1),
  ('supe', 'Teleća čorba', 8, 'porcija', 'kuhinja', true, null, 2),
  ('supe', 'Teleća tarhana', 8, 'porcija', 'kuhinja', true, null, 3),

  ('kuhana-jela', 'Lešo teletina', 17, 'porcija', 'kuhinja', true, null, 1),
  ('kuhana-jela', 'Gulaš', 13, 'porcija', 'kuhinja', true, null, 2),
  ('kuhana-jela', 'Sitni ćevap', 15, 'porcija', 'kuhinja', true, null, 3),
  ('kuhana-jela', 'Grah s mesom', 8, 'porcija', 'kuhinja', true, null, 4),
  ('kuhana-jela', 'Tripice', 9, 'porcija', 'kuhinja', true, null, 5),
  ('kuhana-jela', 'Pače noga', 9, 'porcija', 'kuhinja', true, null, 6),
  ('kuhana-jela', 'Pače glava', 9, 'porcija', 'kuhinja', true, null, 7),
  ('kuhana-jela', 'Miješano pače', 9, 'porcija', 'kuhinja', true, null, 8),

  ('jela-po-narudzbi', 'Natur šnicla', 17, 'porcija', 'kuhinja', true, null, 1),
  ('jela-po-narudzbi', 'Bečka šnicla', 19, 'porcija', 'kuhinja', true, null, 2),
  ('jela-po-narudzbi', 'Pariška šnicla', 19, 'porcija', 'kuhinja', true, null, 3),
  ('jela-po-narudzbi', 'Teleći medaljoni', 22, 'porcija', 'kuhinja', true, null, 4),
  ('jela-po-narudzbi', 'Travnički odrezak', 21, 'porcija', 'kuhinja', true, null, 5),
  ('jela-po-narudzbi', 'Pohovani mozak', 18, 'porcija', 'kuhinja', true, null, 6),
  ('jela-po-narudzbi', 'Restovani mozak', 18, 'porcija', 'kuhinja', true, null, 7),
  ('jela-po-narudzbi', 'Krezla (teleća brizla)', 19, 'porcija', 'kuhinja', true, null, 8),
  ('jela-po-narudzbi', 'Mućkalica', 20, 'porcija', 'kuhinja', true, null, 9),
  ('jela-po-narudzbi', 'Restovana teletina', 18, 'porcija', 'kuhinja', true, null, 10),
  ('jela-po-narudzbi', 'Teleći odrezak na kućni način', 22, 'porcija', 'kuhinja', true, null, 11),

  ('piletina', 'Pileći file sa žara', 10, 'porcija', 'kuhinja', true, null, 1),
  ('piletina', 'Piletina punjena sirom', 14, 'porcija', 'kuhinja', true, null, 2),
  ('piletina', 'Pohovana piletina', 13, 'porcija', 'kuhinja', true, null, 3),
  ('piletina', 'Piletina u sosu', 13, 'porcija', 'kuhinja', true, null, 4),
  ('piletina', 'Pileći ražnjići sa žara', 10, 'porcija', 'kuhinja', true, null, 5),

  ('rostilj', 'Pileći batak bez kosti', 8, 'porcija', 'pecenjara', true, null, 1),
  ('rostilj', 'Teleća peka', 16, 'porcija', 'pecenjara', true, null, 2),
  ('rostilj', 'Teleći kotlet sa žara', 15, 'porcija', 'pecenjara', true, null, 3),
  ('rostilj', 'Teleći ražnjići', 16, 'porcija', 'pecenjara', true, null, 4),
  ('rostilj', 'Teleći bubreg', 10, 'porcija', 'pecenjara', true, null, 5),
  ('rostilj', 'Teleća jetra sa žara', 17, 'porcija', 'pecenjara', true, null, 6),
  ('rostilj', 'Miješano meso', 35, 'porcija', 'pecenjara', true, null, 7),
  ('rostilj', 'Pljeskavica', 13, 'porcija', 'pecenjara', true, null, 8),
  ('rostilj', 'Punjena pljeskavica', 14, 'porcija', 'pecenjara', true, null, 9),
  ('rostilj', 'Sudžukice – male', 6.50, 'porcija', 'pecenjara', true, null, 10),
  ('rostilj', 'Sudžukice – srednje', 11, 'porcija', 'pecenjara', true, null, 11),
  ('rostilj', 'Sudžukice – velike', 15, 'porcija', 'pecenjara', true, null, 12),
  ('rostilj', 'Kombinacija: 5 ćevapa + 3 sudžukice', 11.50, 'porcija', 'pecenjara', true, null, 13),
  ('rostilj', 'Ćevapi – školska porcija', 5, 'porcija', 'pecenjara', true, null, 14),
  ('rostilj', 'Ćevapi – mala porcija', 9.50, 'porcija', 'pecenjara', true, null, 15),
  ('rostilj', 'Ćevapi – cijela lepinja (10 komada)', 10, 'porcija', 'pecenjara', true, null, 16),
  ('rostilj', 'Ćevapi – srednja porcija', 14.50, 'porcija', 'pecenjara', true, null, 17),
  ('rostilj', 'Ćevapi – velika porcija', 19, 'porcija', 'pecenjara', true, null, 18),

  ('pecenja', 'Jagnjetina s ražnja', 50, 'kg', 'pecenjara', true, null, 1),
  ('pecenja', 'Porcija pečene jagnjetine', 16, 'porcija', 'pecenjara', true, null, 2),
  ('pecenja', 'Pečena janjeća glava', 5, 'kom', 'pecenjara', true, null, 3),
  ('pecenja', 'Janjeća puca', 2.50, 'kom', 'pecenjara', true, null, 4),
  ('pecenja', 'Teletina ispod sača', 55, 'kg', 'pecenjara', true, null, 5),
  ('pecenja', 'Porcija pečene teletine', 18, 'porcija', 'pecenjara', true, null, 6),
  ('pecenja', 'Pečeno pile', 14, 'kom', 'pecenjara', true, null, 7),

  ('riba', 'Pastrmka sa žara', 17, 'porcija', 'kuhinja', true, null, 1),
  ('riba', 'Kuhana pastrmka', 17, 'porcija', 'kuhinja', true, null, 2),

  ('prilozi', 'Pekarski krompir', 3, 'porcija', 'kuhinja', true, null, 1),
  ('prilozi', 'Kuhani krompir', 3, 'porcija', 'kuhinja', true, null, 2),
  ('prilozi', 'Makaroni', 3, 'porcija', 'kuhinja', true, null, 3),
  ('prilozi', 'Pomfrit', 4, 'porcija', 'kuhinja', true, null, 4),
  ('prilozi', 'Riža', 4, 'porcija', 'kuhinja', true, null, 5),
  ('prilozi', 'Pire krompir', 4, 'porcija', 'kuhinja', true, null, 6),
  ('prilozi', 'Miješano povrće', 4, 'porcija', 'kuhinja', true, null, 7),
  ('prilozi', 'Majoneza', 1, 'porcija', 'kuhinja', true, null, 8),
  ('prilozi', 'Kečap', 1, 'porcija', 'kuhinja', true, null, 9),
  ('prilozi', 'Senf', 1, 'porcija', 'kuhinja', true, null, 10),
  ('prilozi', 'Jogurt', 1.50, 'porcija', 'kuhinja', true, null, 11),

  ('salate', 'Zimska salata', 3, 'porcija', 'kuhinja', true, null, 1),
  ('salate', 'Svježa sezonska salata', 3, 'porcija', 'kuhinja', true, null, 2),
  ('salate', 'Šopska salata', 5, 'porcija', 'kuhinja', true, null, 3),
  ('salate', 'Krompir salata', 3.50, 'porcija', 'kuhinja', true, null, 4),

  ('hljeb', 'Hljeb', 1, 'porcija', 'kuhinja', true, null, 1),
  ('hljeb', 'Lepinja', 1, 'kom', 'kuhinja', true, null, 2),
  ('hljeb', 'Uštipci', 5, 'porcija', 'kuhinja', true, null, 3),

  ('deserti', 'Baklava s orasima', 4, 'kom', 'kuhinja', true, null, 1),
  ('deserti', 'Hurmašica', 2.50, 'kom', 'kuhinja', true, null, 2),
  ('deserti', 'Kolač', 4, 'kom', 'kuhinja', true, null, 3),
  ('deserti', 'Palačinke s Nutellom i orasima', 5, 'porcija', 'kuhinja', true, null, 4),
  ('deserti', 'Palačinke s džemom i orasima', 5, 'porcija', 'kuhinja', true, null, 5),
  ('deserti', 'Plazma sladoledna čaša', 3.50, 'kom', 'kuhinja', true, null, 6),

  ('vina', 'Žilavka Teuta 0,75 l', 60, 'kom', 'sank', true, null, 1),
  ('vina', 'Blatina Malvazija 0,75 l', 60, 'kom', 'sank', true, null, 2),
  ('vina', 'Kambola Malvazija 0,75 l', 60, 'kom', 'sank', true, null, 3),
  ('vina', 'Kozlović Malvazija 0,75 l', 50, 'kom', 'sank', true, null, 4),
  ('vina', 'Žilavka 0,75 l', 30, 'kom', 'sank', true, null, 5),
  ('vina', 'Graševina Kutjevo 0,75 l', 35, 'kom', 'sank', true, null, 6),
  ('vina', 'Blatina 0,75 l', 30, 'kom', 'sank', true, null, 7),
  ('vina', 'Dingač 0,75 l', 50, 'kom', 'sank', true, null, 8),
  ('vina', 'Postup 0,75 l', 50, 'kom', 'sank', true, null, 9),
  ('vina', 'Vranac Procorde 0,75 l', 45, 'kom', 'sank', true, null, 10),
  ('vina', 'Graševina Kutjevo 1 l', 25, 'kom', 'sank', true, null, 11),
  ('vina', 'Vranac 1 l', 20, 'kom', 'sank', true, null, 12),
  ('vina', 'Žilavka 1 l', 20, 'kom', 'sank', true, null, 13),
  ('vina', 'Graševina Kutjevo 0,20 l', 7, 'kom', 'sank', true, null, 14),
  ('vina', 'Vranac Procorde 0,20 l', 7, 'kom', 'sank', true, null, 15),
  ('vina', 'Crni pinot 0,20 l', 7, 'kom', 'sank', true, null, 16),

  ('zestoka-pica', 'Trojka votka 0,05 l', 2.50, 'porcija', 'sank', true, null, 1),
  ('zestoka-pica', 'Vigor votka 0,05 l', 2.50, 'porcija', 'sank', true, null, 2),
  ('zestoka-pica', 'Rakija 0,05 l', 2.50, 'porcija', 'sank', true, null, 3),
  ('zestoka-pica', 'Loza 0,05 l', 2.50, 'porcija', 'sank', true, null, 4),
  ('zestoka-pica', 'Travarica 0,05 l', 2.50, 'porcija', 'sank', true, null, 5),
  ('zestoka-pica', 'Vlahov Maraska 0,05 l', 2.50, 'porcija', 'sank', true, null, 6),
  ('zestoka-pica', 'Pelinkovac 0,05 l', 2.50, 'porcija', 'sank', true, null, 7),
  ('zestoka-pica', 'Konjak 0,05 l', 2.50, 'porcija', 'sank', true, null, 8),
  ('zestoka-pica', 'Štok 0,05 l', 3, 'porcija', 'sank', true, null, 9),
  ('zestoka-pica', 'Chivas 0,03 l', 6, 'porcija', 'sank', true, null, 10),
  ('zestoka-pica', 'Jack Daniel’s 0,03 l', 5, 'porcija', 'sank', true, null, 11),
  ('zestoka-pica', 'Jägermeister 0,03 l', 3.50, 'porcija', 'sank', true, null, 12),
  ('zestoka-pica', 'Ballantine’s 0,03 l', 4, 'porcija', 'sank', true, null, 13),
  ('zestoka-pica', 'Viljamovka 0,03 l', 5, 'porcija', 'sank', true, null, 14),
  ('zestoka-pica', 'Višnjevac 0,05 l', 2.50, 'porcija', 'sank', true, null, 15),
  ('zestoka-pica', 'Orahovac 0,05 l', 2.50, 'porcija', 'sank', true, null, 16),
  ('zestoka-pica', 'Rum 0,05 l', 2.50, 'porcija', 'sank', true, null, 17),
  ('zestoka-pica', 'Pelinkovac Antik 0,03 l', 2.50, 'porcija', 'sank', true, null, 18),

  ('pivo', 'Heineken 0,33 l', 4.50, 'kom', 'sank', true, null, 1),
  ('pivo', 'Bavaria 0,33 l', 4, 'kom', 'sank', true, null, 2),
  ('pivo', 'Bavaria 0,0% 0,33 l', 4.50, 'kom', 'sank', true, null, 3),
  ('pivo', 'Sarajevsko 0,33 l', 3.50, 'kom', 'sank', true, null, 4),
  ('pivo', 'Karlovačko 0,33 l', 3.50, 'kom', 'sank', true, null, 5),
  ('pivo', 'Ožujsko 0,33 l', 3.50, 'kom', 'sank', true, null, 6),
  ('pivo', 'Pan 0,33 l', 3.50, 'kom', 'sank', true, null, 7),
  ('pivo', 'Preminger 0,33 l', 3.50, 'kom', 'sank', true, null, 8),
  ('pivo', 'Tuborg 0,33 l', 4, 'kom', 'sank', true, null, 9),
  ('pivo', 'Radler 0,33 l', 3.50, 'kom', 'sank', true, null, 10),
  ('pivo', 'Točeno pivo 1 l', 8, 'l', 'sank', true, null, 11),

  ('bezalkoholna-pica', 'Coca-Cola 0,25 l', 3.50, 'kom', 'sank', true, null, 1),
  ('bezalkoholna-pica', 'Fanta 0,25 l', 3.50, 'kom', 'sank', true, null, 2),
  ('bezalkoholna-pica', 'Schweppes Bitter Lemon 0,25 l', 3.50, 'kom', 'sank', true, null, 3),
  ('bezalkoholna-pica', 'Schweppes Tangerine 0,25 l', 3.50, 'kom', 'sank', true, null, 4),
  ('bezalkoholna-pica', 'Schweppes Tonic 0,25 l', 3.50, 'kom', 'sank', true, null, 5),
  ('bezalkoholna-pica', 'Sprite 0,25 l', 3.50, 'kom', 'sank', true, null, 6),
  ('bezalkoholna-pica', 'Cockta 0,275 l', 3.50, 'kom', 'sank', true, null, 7),
  ('bezalkoholna-pica', 'Jana ledeni čaj – breskva 0,33 l', 3.50, 'kom', 'sank', true, null, 8),
  ('bezalkoholna-pica', 'Jana ledeni čaj – šumsko voće 0,33 l', 3.50, 'kom', 'sank', true, null, 9),
  ('bezalkoholna-pica', 'Cedevita 0,20 l', 3, 'kom', 'sank', true, null, 10),
  ('bezalkoholna-pica', 'Limunada 0,20 l', 3.50, 'kom', 'sank', true, null, 11),
  ('bezalkoholna-pica', 'Orangina 0,25 l', 4, 'kom', 'sank', true, null, 12),
  ('bezalkoholna-pica', 'Sarajevski Kiseljak 0,25 l', 2.50, 'kom', 'sank', true, null, 13),
  ('bezalkoholna-pica', 'Sensation 0,25 l', 3, 'kom', 'sank', true, null, 14),
  ('bezalkoholna-pica', 'Ski Orange 0,25 l', 3, 'kom', 'sank', true, null, 15),
  ('bezalkoholna-pica', 'Ski Mango-Orange 0,25 l', 3, 'kom', 'sank', true, null, 16),
  ('bezalkoholna-pica', 'Mineralna voda 1 l', 5, 'kom', 'sank', true, null, 17),
  ('bezalkoholna-pica', 'Fructal sok od jabuke 0,20 l', 3.50, 'kom', 'sank', true, null, 18),
  ('bezalkoholna-pica', 'Fructal sok od jagode 0,20 l', 3.50, 'kom', 'sank', true, null, 19),
  ('bezalkoholna-pica', 'Fructal sok od breskve 0,20 l', 3.50, 'kom', 'sank', true, null, 20),
  ('bezalkoholna-pica', 'Fructal sok od narandže 0,20 l', 3.50, 'kom', 'sank', true, null, 21),
  ('bezalkoholna-pica', 'Fructal sok od crnog ribizla 0,20 l', 3.50, 'kom', 'sank', true, null, 22),
  ('bezalkoholna-pica', 'Fructal sok od višnje 0,20 l', 3.50, 'kom', 'sank', true, null, 23),
  ('bezalkoholna-pica', 'Jana negazirana voda 0,33 l', 2.50, 'kom', 'sank', true, null, 24),
  ('bezalkoholna-pica', 'Fast energetsko piće 0,25 l', 3.50, 'kom', 'sank', true, null, 25),

  ('topli-napici', 'Franck čaj', 2, 'porcija', 'sank', true, null, 1),
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
  'Ćevapi – velika porcija',
  'Pomfrit'
)
on conflict (proizvod_id) do nothing;

insert into public.sastojci_recepta (recept_id, zaliha_id, kolicina)
select recept.id, zaliha.id, sastojak.kolicina
from (
  values
    ('Natur šnicla', 'Teletina', 0.2::numeric),
    ('Ćevapi – velika porcija', 'Ćevapi', 1::numeric),
    ('Ćevapi – velika porcija', 'Lepinja', 2::numeric),
    ('Pomfrit', 'Pomfrit', 0.2::numeric)
) as sastojak(proizvod_naziv, zaliha_naziv, kolicina)
join public.proizvodi proizvod on proizvod.naziv = sastojak.proizvod_naziv
join public.recepti recept on recept.proizvod_id = proizvod.id
join public.zaliha_artikli zaliha on zaliha.naziv = sastojak.zaliha_naziv
on conflict (recept_id, zaliha_id) do update
set kolicina = excluded.kolicina;
