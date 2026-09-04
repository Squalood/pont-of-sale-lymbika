export type ServiceRateType = {
  id: number;
  documentId: string;
  price: number;
  duration_min: number;
  notes: string | null;
  medical_service: null | {
    id: number;
    documentId: string;
    name: string;
    slug: string;
    description: string | null;
    image: { id: number; url: string } | null;
    /** Enum de Strapi. El POS solo carga "consultation" (ver useGetServiceRates). */
    type: "consultation" | "procedure" | "study";
  };
  doctor: {
    id: number;
    documentId: string;
    doctorName: string
  } | null;
};