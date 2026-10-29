export type SerieAnual = {
  anio: number;
  sembrada: number;
  cosechada: number;
  siniestrada: number;
  rendimientoTHa: number;
  precioPorTon: number;
};

export type ReferenciaCosto = {
  anio: number;
  zona: string;
  tecnologia: string;
  cultivo: string;
  rendimientoTHa: { pesimista: number; probable: number; optimista: number };
  precioPorTon: number;
  ingresoPorHa: number;
  totalFinanciablePorHa: number;
  tasaFira: number;
};

export type Perfil = {
  cultivo: string;
  hectareas: number | null;
  estado: string;
  municipio: string | null;
  beneficiarioSader: boolean | null;
  posesionPredio: boolean | null;
  edad?: number;
};
