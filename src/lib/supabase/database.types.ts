export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      dnevni_zakljucci: {
        Row: {
          broj_racuna: number
          datum: string
          detalji: Json
          id: string
          kreirano_at: string
          ukupno_naplaceno: number
          zakljucio_ime: string
        }
        Insert: {
          broj_racuna?: number
          datum: string
          detalji?: Json
          id?: string
          kreirano_at?: string
          ukupno_naplaceno?: number
          zakljucio_ime: string
        }
        Update: {
          broj_racuna?: number
          datum?: string
          detalji?: Json
          id?: string
          kreirano_at?: string
          ukupno_naplaceno?: number
          zakljucio_ime?: string
        }
        Relationships: []
      }
      dnevnik_radnji: {
        Row: {
          akter_ime: string
          akter_uloga: string
          detalji: Json
          entitet: string
          entitet_id: string | null
          id: number
          kreirano_at: string
          radnja: string
        }
        Insert: {
          akter_ime: string
          akter_uloga: string
          detalji?: Json
          entitet: string
          entitet_id?: string | null
          id?: never
          kreirano_at?: string
          radnja: string
        }
        Update: {
          akter_ime?: string
          akter_uloga?: string
          detalji?: Json
          entitet?: string
          entitet_id?: string | null
          id?: never
          kreirano_at?: string
          radnja?: string
        }
        Relationships: []
      }
      dopune_sanka: {
        Row: {
          evidentirao_ime: string
          id: string
          kolicina: number
          kreirano_at: string
          proizvod_id: string
          smjena_id: string
        }
        Insert: {
          evidentirao_ime: string
          id?: string
          kolicina: number
          kreirano_at?: string
          proizvod_id: string
          smjena_id: string
        }
        Update: {
          evidentirao_ime?: string
          id?: string
          kolicina?: number
          kreirano_at?: string
          proizvod_id?: string
          smjena_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dopune_sanka_proizvod_id_fkey"
            columns: ["proizvod_id"]
            isOneToOne: false
            referencedRelation: "proizvodi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dopune_sanka_smjena_id_fkey"
            columns: ["smjena_id"]
            isOneToOne: false
            referencedRelation: "smjene"
            referencedColumns: ["id"]
          },
        ]
      }
      kategorije_menija: {
        Row: {
          aktivna: boolean
          id: string
          naziv: string
          redoslijed: number
        }
        Insert: {
          aktivna?: boolean
          id: string
          naziv: string
          redoslijed: number
        }
        Update: {
          aktivna?: boolean
          id?: string
          naziv?: string
          redoslijed?: number
        }
        Relationships: []
      }
      naplate: {
        Row: {
          baksis: number
          gost_dao: number
          gost_duznik: string | null
          id: string
          kreirano_at: string
          kusur: number
          nacin: string
          naplatio_ime: string
          racun_id: string
          ukupno: number
        }
        Insert: {
          baksis?: number
          gost_dao: number
          gost_duznik?: string | null
          id?: string
          kreirano_at?: string
          kusur?: number
          nacin: string
          naplatio_ime: string
          racun_id: string
          ukupno: number
        }
        Update: {
          baksis?: number
          gost_dao?: number
          gost_duznik?: string | null
          id?: string
          kreirano_at?: string
          kusur?: number
          nacin?: string
          naplatio_ime?: string
          racun_id?: string
          ukupno?: number
        }
        Relationships: [
          {
            foreignKeyName: "naplate_racun_id_fkey"
            columns: ["racun_id"]
            isOneToOne: false
            referencedRelation: "racuni"
            referencedColumns: ["id"]
          },
        ]
      }
      narudzba_idempotencija: {
        Row: {
          kreirano_at: string
          request_id: string
          rezultat: Json
        }
        Insert: {
          kreirano_at?: string
          request_id: string
          rezultat: Json
        }
        Update: {
          kreirano_at?: string
          request_id?: string
          rezultat?: Json
        }
        Relationships: []
      }
      narudzbe: {
        Row: {
          broj: string
          cijena_pecenjari: number | null
          grupa_id: string
          id: string
          izmijenjeno_at: string
          kreirano_at: string
          kreirao_ime: string
          racun_id: string
          stanica: string
          status: string
        }
        Insert: {
          broj: string
          cijena_pecenjari?: number | null
          grupa_id: string
          id?: string
          izmijenjeno_at?: string
          kreirano_at?: string
          kreirao_ime: string
          racun_id: string
          stanica: string
          status?: string
        }
        Update: {
          broj?: string
          cijena_pecenjari?: number | null
          grupa_id?: string
          id?: string
          izmijenjeno_at?: string
          kreirano_at?: string
          kreirao_ime?: string
          racun_id?: string
          stanica?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "narudzbe_racun_id_fkey"
            columns: ["racun_id"]
            isOneToOne: false
            referencedRelation: "racuni"
            referencedColumns: ["id"]
          },
        ]
      }
      pecenjara_popisi_smjena: {
        Row: {
          dodatna_janjetina_kg: number
          dodatne_koke: number
          evidentirao_ime: string
          kreirano_at: string
          pazar_po_popisu: number | null
          pocetna_janjetina_kg: number
          pocetne_koke_pecene: number
          pocetne_koke_sirove: number
          predani_pazar: number | null
          preostala_janjetina_kg: number | null
          preostale_koke: number | null
          prodana_janjetina_kg: number | null
          prodane_koke: number | null
          razlika: number | null
          smjena_id: string
          zatvoreno_at: string | null
        }
        Insert: {
          dodatna_janjetina_kg?: number
          dodatne_koke?: number
          evidentirao_ime: string
          kreirano_at?: string
          pazar_po_popisu?: number | null
          pocetna_janjetina_kg: number
          pocetne_koke_pecene: number
          pocetne_koke_sirove: number
          predani_pazar?: number | null
          preostala_janjetina_kg?: number | null
          preostale_koke?: number | null
          prodana_janjetina_kg?: number | null
          prodane_koke?: number | null
          razlika?: number | null
          smjena_id: string
          zatvoreno_at?: string | null
        }
        Update: {
          dodatna_janjetina_kg?: number
          dodatne_koke?: number
          evidentirao_ime?: string
          kreirano_at?: string
          pazar_po_popisu?: number | null
          pocetna_janjetina_kg?: number
          pocetne_koke_pecene?: number
          pocetne_koke_sirove?: number
          predani_pazar?: number | null
          preostala_janjetina_kg?: number | null
          preostale_koke?: number | null
          prodana_janjetina_kg?: number | null
          prodane_koke?: number | null
          razlika?: number | null
          smjena_id?: string
          zatvoreno_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pecenjara_popisi_smjena_smjena_id_fkey"
            columns: ["smjena_id"]
            isOneToOne: true
            referencedRelation: "smjene"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_postavke: {
        Row: {
          izmijenjeno_at: string
          kljuc: string
          pin_hash: string
        }
        Insert: {
          izmijenjeno_at?: string
          kljuc: string
          pin_hash: string
        }
        Update: {
          izmijenjeno_at?: string
          kljuc?: string
          pin_hash?: string
        }
        Relationships: []
      }
      potrosnja_zaliha: {
        Row: {
          id: number
          kolicina: number
          kreirano_at: string
          narudzba_id: string
          stavka_id: string
          zaliha_id: string
        }
        Insert: {
          id?: never
          kolicina: number
          kreirano_at?: string
          narudzba_id: string
          stavka_id: string
          zaliha_id: string
        }
        Update: {
          id?: never
          kolicina?: number
          kreirano_at?: string
          narudzba_id?: string
          stavka_id?: string
          zaliha_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "potrosnja_zaliha_narudzba_id_fkey"
            columns: ["narudzba_id"]
            isOneToOne: false
            referencedRelation: "narudzbe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potrosnja_zaliha_stavka_id_fkey"
            columns: ["stavka_id"]
            isOneToOne: false
            referencedRelation: "stavke_narudzbe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potrosnja_zaliha_zaliha_id_fkey"
            columns: ["zaliha_id"]
            isOneToOne: false
            referencedRelation: "zaliha_artikli"
            referencedColumns: ["id"]
          },
        ]
      }
      prodaje_mesnice: {
        Row: {
          cijena_po_jedinici: number
          evidentirao_ime: string
          id: string
          kolicina: number
          kreirano_at: string
          smjena_id: string | null
          ukupno: number
          zaliha_id: string
        }
        Insert: {
          cijena_po_jedinici: number
          evidentirao_ime: string
          id?: string
          kolicina: number
          kreirano_at?: string
          smjena_id?: string | null
          ukupno: number
          zaliha_id: string
        }
        Update: {
          cijena_po_jedinici?: number
          evidentirao_ime?: string
          id?: string
          kolicina?: number
          kreirano_at?: string
          smjena_id?: string | null
          ukupno?: number
          zaliha_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prodaje_mesnice_smjena_id_fkey"
            columns: ["smjena_id"]
            isOneToOne: false
            referencedRelation: "smjene"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prodaje_mesnice_zaliha_id_fkey"
            columns: ["zaliha_id"]
            isOneToOne: false
            referencedRelation: "zaliha_artikli"
            referencedColumns: ["id"]
          },
        ]
      }
      proizvodi: {
        Row: {
          aktivan: boolean
          cijena: number | null
          id: string
          izmijenjeno_at: string
          jedinica: string
          kategorija_id: string
          kreirano_at: string
          napomena_cijene: string | null
          naziv: string
          redoslijed: number
          stanica: string
        }
        Insert: {
          aktivan?: boolean
          cijena?: number | null
          id?: string
          izmijenjeno_at?: string
          jedinica?: string
          kategorija_id: string
          kreirano_at?: string
          napomena_cijene?: string | null
          naziv: string
          redoslijed?: number
          stanica: string
        }
        Update: {
          aktivan?: boolean
          cijena?: number | null
          id?: string
          izmijenjeno_at?: string
          jedinica?: string
          kategorija_id?: string
          kreirano_at?: string
          napomena_cijene?: string | null
          naziv?: string
          redoslijed?: number
          stanica?: string
        }
        Relationships: [
          {
            foreignKeyName: "proizvodi_kategorija_id_fkey"
            columns: ["kategorija_id"]
            isOneToOne: false
            referencedRelation: "kategorije_menija"
            referencedColumns: ["id"]
          },
        ]
      }
      prometi_zaliha: {
        Row: {
          evidentirao_ime: string
          id: number
          kreirano_at: string
          povezana_narudzba_id: string | null
          promjena: number
          razlog: string
          zaliha_id: string
        }
        Insert: {
          evidentirao_ime: string
          id?: never
          kreirano_at?: string
          povezana_narudzba_id?: string | null
          promjena: number
          razlog: string
          zaliha_id: string
        }
        Update: {
          evidentirao_ime?: string
          id?: never
          kreirano_at?: string
          povezana_narudzba_id?: string | null
          promjena?: number
          razlog?: string
          zaliha_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prometi_zaliha_narudzba_fk"
            columns: ["povezana_narudzba_id"]
            isOneToOne: false
            referencedRelation: "narudzbe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prometi_zaliha_zaliha_id_fkey"
            columns: ["zaliha_id"]
            isOneToOne: false
            referencedRelation: "zaliha_artikli"
            referencedColumns: ["id"]
          },
        ]
      }
      racun_stolovi: {
        Row: {
          racun_id: string
          sto_id: number
        }
        Insert: {
          racun_id: string
          sto_id: number
        }
        Update: {
          racun_id?: string
          sto_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "racun_stolovi_racun_id_fkey"
            columns: ["racun_id"]
            isOneToOne: false
            referencedRelation: "racuni"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "racun_stolovi_sto_id_fkey"
            columns: ["sto_id"]
            isOneToOne: true
            referencedRelation: "stolovi"
            referencedColumns: ["id"]
          },
        ]
      }
      racuni: {
        Row: {
          broj: number
          gost_duznik: string | null
          id: string
          izmijenjeno_at: string
          konobar_id: string | null
          konobar_ime: string
          otvoren_at: string
          podijeljeno_na: number | null
          status: string
          sto_id: number
          zatvoren_at: string | null
        }
        Insert: {
          broj?: never
          gost_duznik?: string | null
          id?: string
          izmijenjeno_at?: string
          konobar_id?: string | null
          konobar_ime: string
          otvoren_at?: string
          podijeljeno_na?: number | null
          status?: string
          sto_id: number
          zatvoren_at?: string | null
        }
        Update: {
          broj?: never
          gost_duznik?: string | null
          id?: string
          izmijenjeno_at?: string
          konobar_id?: string | null
          konobar_ime?: string
          otvoren_at?: string
          podijeljeno_na?: number | null
          status?: string
          sto_id?: number
          zatvoren_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "racuni_konobar_id_fkey"
            columns: ["konobar_id"]
            isOneToOne: false
            referencedRelation: "zaposlenici"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "racuni_sto_id_fkey"
            columns: ["sto_id"]
            isOneToOne: false
            referencedRelation: "stolovi"
            referencedColumns: ["id"]
          },
        ]
      }
      recepti: {
        Row: {
          id: string
          izmijenjeno_at: string
          proizvod_id: string
        }
        Insert: {
          id?: string
          izmijenjeno_at?: string
          proizvod_id: string
        }
        Update: {
          id?: string
          izmijenjeno_at?: string
          proizvod_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recepti_proizvod_id_fkey"
            columns: ["proizvod_id"]
            isOneToOne: true
            referencedRelation: "proizvodi"
            referencedColumns: ["id"]
          },
        ]
      }
      rezervacije: {
        Row: {
          broj_gostiju: number
          id: string
          ime: string
          kreirano_at: string
          kreirao_ime: string
          napomena: string | null
          rezervisano_za: string
          status: string
          sto_id: number | null
          telefon: string | null
        }
        Insert: {
          broj_gostiju: number
          id?: string
          ime: string
          kreirano_at?: string
          kreirao_ime: string
          napomena?: string | null
          rezervisano_za: string
          status?: string
          sto_id?: number | null
          telefon?: string | null
        }
        Update: {
          broj_gostiju?: number
          id?: string
          ime?: string
          kreirano_at?: string
          kreirao_ime?: string
          napomena?: string | null
          rezervisano_za?: string
          status?: string
          sto_id?: number | null
          telefon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rezervacije_sto_id_fkey"
            columns: ["sto_id"]
            isOneToOne: false
            referencedRelation: "stolovi"
            referencedColumns: ["id"]
          },
        ]
      }
      sastojci_recepta: {
        Row: {
          kolicina: number
          recept_id: string
          zaliha_id: string
        }
        Insert: {
          kolicina: number
          recept_id: string
          zaliha_id: string
        }
        Update: {
          kolicina?: number
          recept_id?: string
          zaliha_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sastojci_recepta_recept_id_fkey"
            columns: ["recept_id"]
            isOneToOne: false
            referencedRelation: "recepti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sastojci_recepta_zaliha_id_fkey"
            columns: ["zaliha_id"]
            isOneToOne: false
            referencedRelation: "zaliha_artikli"
            referencedColumns: ["id"]
          },
        ]
      }
      smjene: {
        Row: {
          bar_pazar: number | null
          id: string
          kreirano_at: string
          kuhinja_pecenjara_pazar: number | null
          ocekivani_pazar: number | null
          oznaka: string
          pocetak_at: string
          pocetni_popis_sanka: Json
          predani_pazar: number | null
          preuzeo_ime: string
          razlika_pazara: number | null
          status: string
          zatvoreno_at: string | null
          zatvorio_ime: string | null
          zavrsni_popis_sanka: Json | null
        }
        Insert: {
          bar_pazar?: number | null
          id?: string
          kreirano_at?: string
          kuhinja_pecenjara_pazar?: number | null
          ocekivani_pazar?: number | null
          oznaka: string
          pocetak_at: string
          pocetni_popis_sanka?: Json
          predani_pazar?: number | null
          preuzeo_ime: string
          razlika_pazara?: number | null
          status?: string
          zatvoreno_at?: string | null
          zatvorio_ime?: string | null
          zavrsni_popis_sanka?: Json | null
        }
        Update: {
          bar_pazar?: number | null
          id?: string
          kreirano_at?: string
          kuhinja_pecenjara_pazar?: number | null
          ocekivani_pazar?: number | null
          oznaka?: string
          pocetak_at?: string
          pocetni_popis_sanka?: Json
          predani_pazar?: number | null
          preuzeo_ime?: string
          razlika_pazara?: number | null
          status?: string
          zatvoreno_at?: string | null
          zatvorio_ime?: string | null
          zavrsni_popis_sanka?: Json | null
        }
        Relationships: []
      }
      stavke_narudzbe: {
        Row: {
          cijena: number
          id: string
          jedinica: string
          kolicina: number
          kreirano_at: string
          napomena: string | null
          narudzba_id: string
          naziv: string
          prilozi: Json
          proizvod_id: string | null
          stornirano: boolean
          stornirano_at: string | null
          storno_razlog: string | null
          storno_vrijednost: number | null
        }
        Insert: {
          cijena: number
          id?: string
          jedinica: string
          kolicina: number
          kreirano_at?: string
          napomena?: string | null
          narudzba_id: string
          naziv: string
          prilozi?: Json
          proizvod_id?: string | null
          stornirano?: boolean
          stornirano_at?: string | null
          storno_razlog?: string | null
          storno_vrijednost?: number | null
        }
        Update: {
          cijena?: number
          id?: string
          jedinica?: string
          kolicina?: number
          kreirano_at?: string
          napomena?: string | null
          narudzba_id?: string
          naziv?: string
          prilozi?: Json
          proizvod_id?: string | null
          stornirano?: boolean
          stornirano_at?: string | null
          storno_razlog?: string | null
          storno_vrijednost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stavke_narudzbe_narudzba_id_fkey"
            columns: ["narudzba_id"]
            isOneToOne: false
            referencedRelation: "narudzbe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stavke_narudzbe_proizvod_id_fkey"
            columns: ["proizvod_id"]
            isOneToOne: false
            referencedRelation: "proizvodi"
            referencedColumns: ["id"]
          },
        ]
      }
      stavke_prilozi_veza: {
        Row: {
          osnovna_stavka_id: string
          prilog_stavka_id: string
        }
        Insert: {
          osnovna_stavka_id: string
          prilog_stavka_id: string
        }
        Update: {
          osnovna_stavka_id?: string
          prilog_stavka_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stavke_prilozi_veza_osnovna_stavka_id_fkey"
            columns: ["osnovna_stavka_id"]
            isOneToOne: false
            referencedRelation: "stavke_narudzbe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stavke_prilozi_veza_prilog_stavka_id_fkey"
            columns: ["prilog_stavka_id"]
            isOneToOne: true
            referencedRelation: "stavke_narudzbe"
            referencedColumns: ["id"]
          },
        ]
      }
      stolovi: {
        Row: {
          aktivan: boolean
          id: number
          kreirano_at: string
          naziv: string
        }
        Insert: {
          aktivan?: boolean
          id: number
          kreirano_at?: string
          naziv: string
        }
        Update: {
          aktivan?: boolean
          id?: number
          kreirano_at?: string
          naziv?: string
        }
        Relationships: []
      }
      uplate_pecenjari: {
        Row: {
          evidentirao_ime: string
          id: string
          iznos: number
          konobar_ime: string
          kreirano_at: string
          smjena_id: string | null
        }
        Insert: {
          evidentirao_ime: string
          id?: string
          iznos: number
          konobar_ime: string
          kreirano_at?: string
          smjena_id?: string | null
        }
        Update: {
          evidentirao_ime?: string
          id?: string
          iznos?: number
          konobar_ime?: string
          kreirano_at?: string
          smjena_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uplate_pecenjari_smjena_id_fkey"
            columns: ["smjena_id"]
            isOneToOne: false
            referencedRelation: "smjene"
            referencedColumns: ["id"]
          },
        ]
      }
      uskladjenja_jagnjetine: {
        Row: {
          cijena_po_kg: number
          dato_kg: number
          evidentirao_ime: string
          id: string
          kreirano_at: string
          naruceno_kg: number
          narudzba_id: string
          stavka_id: string
        }
        Insert: {
          cijena_po_kg: number
          dato_kg: number
          evidentirao_ime: string
          id?: string
          kreirano_at?: string
          naruceno_kg: number
          narudzba_id: string
          stavka_id: string
        }
        Update: {
          cijena_po_kg?: number
          dato_kg?: number
          evidentirao_ime?: string
          id?: string
          kreirano_at?: string
          naruceno_kg?: number
          narudzba_id?: string
          stavka_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uskladjenja_jagnjetine_narudzba_id_fkey"
            columns: ["narudzba_id"]
            isOneToOne: false
            referencedRelation: "narudzbe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uskladjenja_jagnjetine_stavka_id_fkey"
            columns: ["stavka_id"]
            isOneToOne: false
            referencedRelation: "stavke_narudzbe"
            referencedColumns: ["id"]
          },
        ]
      }
      zahtjevi_mesnice: {
        Row: {
          id: string
          isporucio_ime: string | null
          izvor: string
          kolicina: number | null
          kreirano_at: string
          kreirao_ime: string
          narudzba_id: string | null
          status: string
          zaliha_id: string
          zavrseno_at: string | null
        }
        Insert: {
          id?: string
          isporucio_ime?: string | null
          izvor: string
          kolicina?: number | null
          kreirano_at?: string
          kreirao_ime: string
          narudzba_id?: string | null
          status?: string
          zaliha_id: string
          zavrseno_at?: string | null
        }
        Update: {
          id?: string
          isporucio_ime?: string | null
          izvor?: string
          kolicina?: number | null
          kreirano_at?: string
          kreirao_ime?: string
          narudzba_id?: string | null
          status?: string
          zaliha_id?: string
          zavrseno_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zahtjevi_mesnice_narudzba_id_fkey"
            columns: ["narudzba_id"]
            isOneToOne: false
            referencedRelation: "narudzbe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zahtjevi_mesnice_zaliha_id_fkey"
            columns: ["zaliha_id"]
            isOneToOne: false
            referencedRelation: "zaliha_artikli"
            referencedColumns: ["id"]
          },
        ]
      }
      zaliha_artikli: {
        Row: {
          aktivan: boolean
          id: string
          izmijenjeno_at: string
          jedinica: string
          minimum: number
          nabavna_cijena: number | null
          naziv: string
          prodajna_cijena: number | null
          stanje: number
        }
        Insert: {
          aktivan?: boolean
          id?: string
          izmijenjeno_at?: string
          jedinica: string
          minimum?: number
          nabavna_cijena?: number | null
          naziv: string
          prodajna_cijena?: number | null
          stanje?: number
        }
        Update: {
          aktivan?: boolean
          id?: string
          izmijenjeno_at?: string
          jedinica?: string
          minimum?: number
          nabavna_cijena?: number | null
          naziv?: string
          prodajna_cijena?: number | null
          stanje?: number
        }
        Relationships: []
      }
      zaposlenici: {
        Row: {
          aktivan: boolean
          id: string
          ime: string
          izmijenjeno_at: string
          kreirano_at: string
          pin_hash: string | null
          uloga: string
        }
        Insert: {
          aktivan?: boolean
          id?: string
          ime: string
          izmijenjeno_at?: string
          kreirano_at?: string
          pin_hash?: string | null
          uloga: string
        }
        Update: {
          aktivan?: boolean
          id?: string
          ime?: string
          izmijenjeno_at?: string
          kreirano_at?: string
          pin_hash?: string | null
          uloga?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      autentificiraj_konobara: {
        Args: { p_ime: string; p_pin: string }
        Returns: Json
      }
      autentificiraj_zaposlenika: {
        Args: { p_pin: string }
        Returns: Json
      }
      dodaj_sto_na_racun: {
        Args: { p_racun_id: string; p_sto_id: number }
        Returns: Json
      }
      evidentiraj_dopunu_sanka: {
        Args: { p_akter_ime: string; p_kolicina: number; p_proizvod_id: string }
        Returns: string
      }
      evidentiraj_promjenu_zalihe: {
        Args: {
          p_akter_ime: string
          p_promjena: number
          p_razlog: string
          p_zaliha_id: string
        }
        Returns: Json
      }
      isporuci_zahtjev_mesnice: {
        Args: { p_akter_ime: string; p_kolicina: number; p_zahtjev_id: string }
        Returns: Json
      }
      izvjestaj_period: { Args: { p_do: string; p_od: string }; Returns: Json }
      kreiraj_rezervaciju: {
        Args: {
          p_akter_ime: string
          p_broj_gostiju: number
          p_ime: string
          p_napomena: string
          p_rezervisano_za: string
          p_sto_id: number
          p_telefon: string
        }
        Returns: string
      }
      kreiraj_zahtjev_mesnice: {
        Args: {
          p_akter_ime: string
          p_izvor: string
          p_kolicina: number
          p_narudzba_id: string
          p_zaliha_id: string
        }
        Returns: string
      }
      naplati_dug_gosta: {
        Args: { p_akter_ime: string; p_nacin: string; p_racun_id: string }
        Returns: Json
      }
      otvori_popis_pecenjare: {
        Args: {
          p_evidentirao_ime: string
          p_evidentirao_uloga: string
          p_pocetna_janjetina_kg: number
          p_pocetne_koke_pecene: number
          p_pocetne_koke_sirove: number
          p_smjena_id: string
        }
        Returns: {
          dodatna_janjetina_kg: number
          dodatne_koke: number
          evidentirao_ime: string
          kreirano_at: string
          pazar_po_popisu: number | null
          pocetna_janjetina_kg: number
          pocetne_koke_pecene: number
          pocetne_koke_sirove: number
          predani_pazar: number | null
          preostala_janjetina_kg: number | null
          preostale_koke: number | null
          prodana_janjetina_kg: number | null
          prodane_koke: number | null
          razlika: number | null
          smjena_id: string
          zatvoreno_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pecenjara_popisi_smjena"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      otvori_smjenu: {
        Args: { p_oznaka: string; p_popis_sanka: Json; p_preuzeo_ime: string }
        Returns: string
      }
      plati_racun: {
        Args: {
          p_gost_dao: number
          p_gost_duznik?: string
          p_nacin: string
          p_naplatio_ime: string
          p_podijeljeno_na?: number
          p_racun_id: string
          p_vraceni_kusur: number
        }
        Returns: Json
      }
      posalji_narudzbu: {
        Args: { p_konobar_ime: string; p_stavke: Json; p_sto_id: number }
        Returns: Json
      }
      posalji_narudzbu_idempotentnu: {
        Args: {
          p_konobar_ime: string
          p_request_id: string
          p_stavke: Json
          p_sto_id: number
        }
        Returns: Json
      }
      posalji_narudzbu_singletable: {
        Args: { p_konobar_ime: string; p_stavke: Json; p_sto_id: number }
        Returns: Json
      }
      postavi_pin: {
        Args: { p_kljuc: string; p_pin: string }
        Returns: undefined
      }
      postavi_status_zaposlenika: {
        Args: { p_aktivan: boolean; p_id: string }
        Returns: undefined
      }
      premjesti_ili_spoji_sto: {
        Args: { p_sto_iz: number; p_sto_u: number }
        Returns: Json
      }
      prijedlog_nabavke: { Args: never; Returns: Json }
      prodaj_artikal_mesnice: {
        Args: { p_akter_ime: string; p_kolicina: number; p_zaliha_id: string }
        Returns: Json
      }
      promijeni_status_narudzbe:
        | {
            Args: {
              p_narudzba_id: string
              p_novi_status: string
              p_uloga: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_akter_ime: string
              p_cijena_pecenjari: number
              p_jagnjetina_kg: number
              p_narudzba_id: string
              p_novi_status: string
              p_uloga: string
            }
            Returns: Json
          }
      provjeri_pin: {
        Args: { p_kljuc: string; p_pin: string }
        Returns: boolean
      }
      registruj_uplatu_pecenjari: {
        Args: { p_akter_ime: string; p_iznos: number; p_konobar_ime: string }
        Returns: Json
      }
      sacuvaj_recept: {
        Args: { p_proizvod_id: string; p_sastojci: Json }
        Returns: string
      }
      sacuvaj_zaposlenika: {
        Args: { p_id?: string; p_ime: string; p_pin: string; p_uloga: string }
        Returns: string
      }
      storniraj_stavku: {
        Args: { p_akter_ime: string; p_razlog: string; p_stavka_id: string }
        Returns: Json
      }
      ukupno_racuna: { Args: { p_racun_id: string }; Returns: number }
      zatvori_dan: { Args: { p_akter_ime: string }; Returns: Json }
      zatvori_popis_pecenjare: {
        Args: {
          p_dodatna_janjetina_kg: number
          p_dodatne_koke: number
          p_evidentirao_ime: string
          p_evidentirao_uloga: string
          p_predani_pazar: number
          p_preostala_janjetina_kg: number
          p_preostale_koke: number
          p_smjena_id: string
        }
        Returns: {
          dodatna_janjetina_kg: number
          dodatne_koke: number
          evidentirao_ime: string
          kreirano_at: string
          pazar_po_popisu: number | null
          pocetna_janjetina_kg: number
          pocetne_koke_pecene: number
          pocetne_koke_sirove: number
          predani_pazar: number | null
          preostala_janjetina_kg: number | null
          preostale_koke: number | null
          prodana_janjetina_kg: number | null
          prodane_koke: number | null
          razlika: number | null
          smjena_id: string
          zatvoreno_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pecenjara_popisi_smjena"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      zatvori_smjenu: {
        Args: {
          p_popis_sanka: Json
          p_predani_pazar: number
          p_smjena_id: string
          p_zatvorio_ime: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
