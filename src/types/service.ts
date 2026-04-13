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
    type: "consultation" | "procedure";
  };
  doctor: {
    id: number;
    documentId: string;
    doctorName: string
  } | null;
};