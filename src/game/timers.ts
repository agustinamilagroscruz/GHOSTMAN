// Descuento de temporizadores con paso fijo. Restar 1/60 muchas veces acumula error de punto
// flotante: un cooldown de 5 s puede quedar en 1e-14 a los 5,000 s y terminar un cuadro tarde.
// Los restos menores a TIMER_EPSILON se toman como 0, así el temporizador vence en el instante exacto.

export const TIMER_EPSILON = 1e-9;

/** Descuenta `deltaSeconds` y devuelve el valor restante, nunca negativo. */
export function tickTimer(value: number, deltaSeconds: number): number {
  const next = value - deltaSeconds;
  return next <= TIMER_EPSILON ? 0 : next;
}
