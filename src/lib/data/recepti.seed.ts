export type ReceptSeed = {
  naziv: string;
  sastojci: {
    naziv: string;
    kolicina: number;
    jedinica: string;
  }[];
};

export const RECEPTI_SEED: ReceptSeed[] = [];
