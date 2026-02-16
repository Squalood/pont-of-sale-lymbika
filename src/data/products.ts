import { Product } from "@/types/product";

export const categories = [
  { id: "todos", label: "Todos", emoji: "🏪" },
  { id: "dolor", label: "Dolor", emoji: "💊" },
  { id: "gripa", label: "Gripa y Tos", emoji: "🤧" },
  { id: "vitaminas", label: "Vitaminas", emoji: "✨" },
  { id: "estomago", label: "Estómago", emoji: "🫃" },
  { id: "piel", label: "Piel", emoji: "🧴" },
  { id: "antibioticos", label: "Antibióticos", emoji: "🧬" },
  { id: "diabetes", label: "Diabetes", emoji: "💉" },
  { id: "higiene", label: "Higiene", emoji: "🧼" },
];

export const sampleProducts: Product[] = [
  { id: "1", name: "Aspirina 100mg", price: 28.00, stock: 200, category: "dolor", emoji: "💊", requiresPrescription: false },
  { id: "2", name: "Antigripal NF", price: 65.00, stock: 45, category: "gripa", emoji: "🤧", requiresPrescription: false },
  { id: "3", name: "Descongestionante", price: 55.00, stock: 70, category: "gripa", emoji: "👃", requiresPrescription: false },
  { id: "4", name: "Pastillas Garganta", price: 42.00, stock: 90, category: "gripa", emoji: "🍬", requiresPrescription: false },
  { id: "5", name: "Multivitamínico", price: 185.00, stock: 30, category: "vitaminas", emoji: "✨", requiresPrescription: false },
  { id: "6", name: "Vitamina D3", price: 110.00, stock: 65, category: "vitaminas", emoji: "☀️", requiresPrescription: false },
  { id: "7", name: "Loperamida 2mg", price: 40.00, stock: 80, category: "estomago", emoji: "💊", requiresPrescription: false },
  { id: "8", name: "Protector Solar SPF50", price: 220.00, stock: 20, category: "piel", emoji: "😎", requiresPrescription: false },
  { id: "9", name: "Crema Antimicótica", price: 95.00, stock: 40, category: "piel", emoji: "🧴", requiresPrescription: true },
  { id: "10", name: "Amoxicilina 500mg", price: 125.00, stock: 30, category: "antibioticos", emoji: "🧬", requiresPrescription: true },
  { id: "11", name: "Azitromicina 500mg", price: 180.00, stock: 25, category: "antibioticos", emoji: "🧬", requiresPrescription: true },
  { id: "12", name: "Metformina 850mg", price: 65.00, stock: 90, category: "diabetes", emoji: "💉", requiresPrescription: true },
  { id: "13", name: "Tiras Reactivas (50)", price: 350.00, stock: 15, category: "diabetes", emoji: "💧", requiresPrescription: false },
  { id: "14", name: "Glucómetro Digital", price: 450.00, stock: 10, category: "diabetes", emoji: "⌨️", requiresPrescription: false },
  { id: "15", name: "Alcohol Gel 500ml", price: 55.00, stock: 100, category: "higiene", emoji: "🧴", requiresPrescription: false },
  { id: "16", name: "Cubrebocas (50)", price: 89.00, stock: 60, category: "higiene", emoji: "😷", requiresPrescription: false },
];
