export type KategorijaMenija = {
  naziv: string;
  proizvodi: {
    naziv: string;
    cijena: number;
  }[];
};

export const MENI_SEED: KategorijaMenija[] = [];
