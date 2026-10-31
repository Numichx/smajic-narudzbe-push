# Smajić – Narudžbe

Next.js aplikacija za narudžbe, naplatu i operativni rad restorana. Supabase
čuva zajedničke podatke za uređaje; korisnički interfejs je na bosanskom jeziku.

## Pokreni aplikaciju

Potrebni su Node.js i Docker Desktop za lokalnu Supabase bazu.

```bash
npm install
npm run db:start
npm run db:reset
npm run dev
```

`db:reset` primjenjuje sve migracije iz `supabase/migrations` i učitava početne
podatke iz `supabase/seed.sql`. Poslije promjene šeme pokreni `npm run db:types`
da obnoviš TypeScript tipove. Za `db:reset` i `db:types` mora biti pokrenut
lokalni Supabase.

Za udaljeni projekat prvo ga poveži sa `npx supabase link --project-ref <REF>`,
zatim primijeni migracije sa `npx supabase db push --linked`. Početne podatke
učitaj samo u novu/praznu bazu komandom
`npx supabase db push --linked --include-seed --skip-vault`. Seed postavlja
početni meni, stolove, PIN-ove i količine zaliha; nemoj ga ponovo pokretati nad
aktivnim restoranom jer može vratiti početne količine zalihe. Za tipove iz
udaljene baze pokreni `npm run db:types:linked`; `npm run db:types` ostaje za
lokalnu bazu.

Za lokalni Supabase u `.env.local` postavi URL i ključeve koje prikaže
`npm run db:start`. Za udaljeni projekat koristi njegov Project URL i publishable
key iz Supabase Dashboarda:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
```

`SUPABASE_SERVICE_ROLE_KEY` mora pripadati istom projektu kao URL i koristi se
isključivo na serveru. Ne stavljati ga u `NEXT_PUBLIC_` varijablu niti u
repozitorij. Nakon izmjene `.env.local` ponovo pokrenuti Next.js. U produkciji
postaviti dugu, nasumičnu vrijednost `SESSION_SECRET` i zasebno podešen Supabase
projekat.

Aplikacija koristi vlastitu prijavu pomoću PIN-a; Supabase Auth middleware iz
generičkih primjera ne upravlja prijavom niti pristupom ulogama. Proxy osvježava
Supabase sesiju samo kada je Supabase konfigurisan; aplikacijske uloge koriste
vlastitu potpisanu PIN sesiju.

Početni PIN-ovi su `0000` za osoblje, `1234` za šeficu i `1111` za poseban
prilog. Zamijeniti ih prije stvarnog rada. Cijene pića navedene kao raspon u
meniju nisu aktivirane dok se ne podese konkretne cijene.

## Implementirane funkcije

- Prijava po ulozi; konobari koriste svoje korisničke zapise i PIN-ove.
- 20 stolova, filteri, aktivni računi, rezervacije i unos narudžbi po meniju.
- Automatska podjela narudžbe na kuhinju, pečenjaru i šank; stanice osvježavaju
  red i prate status pripreme.
- Standardni i naplatni prilozi, provjera PIN-a za poseban prilog, pregled
  zbirnih jela, storno s razlogom i dnevnikom radnji.
- Naplata, dug gosta, podjela po osobi, štampa računa na 58 mm, premještanje i
  spajanje stolova/računa.
- Evidencija rezervacija, upravljanje osobljem i PIN-ovima, naplata dugova
  gostiju i evidencija uplata pečenjari.
- Zalihe, recepti, automatski zahtjevi mesnici, prijem robe, prodaja mesa i
  prijedlozi nabavke.
- Smjene s početnim i završnim popisom šanka, evidentiranjem dopuna,
  obračunom pazara i prikazom razlike; izvještaji i CSV izvoz.
- Pečenjara evidentira trošak narudžbe i stvarnu količinu izdate jagnjetine;
  unesena količina usklađuje količinu i iznos na računu gosta.
- Popis pečenjare po smjeni prati početne i dodatne koke/janjetinu, preostalo
  stanje, pazar po cjeniku i razliku predanog pazara; smjena se ne može
  zaključiti dok se popis pečenjare ne završi.
- Offline red za slanje narudžbi, keširanje menija i automatski pokušaj
  sinhronizacije kada se veza vrati.
- Štampa narudžbi na stanicama, obavijesti konobaru kada je narudžba izdata i
  pokušaj zadržavanja ekrana uključenim na stanicama.

## Ograničenja i provjera prije rada

Ako nijedna Supabase varijabla nije podešena u development okruženju, aplikacija
ulazi u probni način rada. Probni podaci se čuvaju u `.data/smajic-demo.json` na
lokalnom serveru i uključuju meni, račune, narudžbe, plaćanja, storno,
premještanje stolova, rezervacije, smjene i dopune šanka, zalihe, recepte,
mesničke zahtjeve, osoblje i izvještaje. Za čisti probni početak ugasiti
razvojni server, ukloniti baš taj fajl i ponovo pokrenuti aplikaciju. Probna
pohrana je za jedan lokalni server, nije sinhronizovana između instalacija i
nije namijenjena produkciji.

Ako je bilo koja Supabase varijabla podešena, konfiguracija mora sadržavati URL,
publishable (ili legacy anon) ključ i service-role ključ. Nepotpuna
konfiguracija vraća HTTP 503 umjesto da tiho pređe na probne podatke. U
produkciji je Supabase konfiguracija obavezna; probni način rada je dostupan
samo lokalno u development okruženju.

U probnom načinu posebni PIN-ovi i PIN-ovi zaposlenika čuvaju se lokalno u
datoteci s probnim podacima, stoga se ne smije koristiti stvarnim podacima.
Početni demo PIN-ovi su `0000`, `1234` i `1111`. Konobar može ući imenom dok se
ne unese osoblje; nakon unosa osoblja prijava koristi lični PIN.

Offline podrška u pregledniku i dalje je ograničena na keš menija i red za
slanje narudžbi; ostale izmjene zahtijevaju vezu s aplikacijskim serverom.
Posebni prilozi se ne stavljaju u offline red. Stanice koriste periodično
osvježavanje umjesto Supabase Realtime.

PIN zaštita i početne vrijednosti namijenjeni su sprečavanju slučajnog ulaska,
ne zaštiti od osobe koja može pristupiti izvornom kodu ili administratorskim
podacima. Prije produkcije postaviti sigurne tajne, promijeniti početne PIN-ove,
provjeriti politike pristupa i testirati migracije nad zasebnom bazom.

Pokreni `npm run db:reset` i `npm run db:types` na lokalnoj bazi prije
TypeScript provjere i funkcionalnog testiranja svih Supabase tokova.

## Provjere koda

```bash
npm run lint
npm run test
npx tsc --noEmit
npm run build
```
