-- anon i authenticated (javni ključ iz preglednika) ne trebaju nikakva prava
-- nad tabelama: aplikacija pristupa bazi samo sa servera, preko service_role.
-- RLS bez politika ih je već blokirao; ovo je dodatni sloj zaštite.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;
