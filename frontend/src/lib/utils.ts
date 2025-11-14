/**
 * Formatea un número con puntos como separador de miles
 * Ejemplo: 47500 -> "47.500"
 */
export function formatCurrency(amount: number): string {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

