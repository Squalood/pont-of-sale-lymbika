/** Rango Unicode de los diacríticos que `normalize("NFD")` separa de su letra. */
const DIACRITICOS = /[\u0300-\u036f]/g;

/**
 * Minúsculas y sin acentos, para comparar lo tecleado con el catálogo.
 *
 * Es cara: tres pasadas y tres strings temporales por llamada. Con 1.7k
 * productos, llamarla dentro del filtro significaba renormalizar ~132 mil
 * caracteres en cada pulsación (~0.8 MB de basura por tecla). Por eso el POS
 * normaliza el catálogo una sola vez, al cargarlo, y el buscador solo normaliza
 * el término.
 */
export function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(DIACRITICOS, "");
}
