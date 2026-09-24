// Frutas: 100 puntos, no cuentan para completar el nivel, los fantasmas no las
// consumen y desaparecen a los 15 s de haber aparecido (HU-12).

export const FRUIT_LIFETIME_SECONDS = 15;

export interface Fruit {
  row: number;
  col: number;
  /** Segundos que le quedan en el mapa antes de desaparecer. */
  timeLeft: number;
}

export function createFruit(row: number, col: number): Fruit {
  return { row, col, timeLeft: FRUIT_LIFETIME_SECONDS };
}

/** Descuenta el tiempo de vida y devuelve solo las frutas que siguen en el mapa. */
export function ageFruits(fruits: Fruit[], deltaSeconds: number): Fruit[] {
  for (const fruit of fruits) {
    fruit.timeLeft -= deltaSeconds;
  }
  return fruits.filter((fruit) => fruit.timeLeft > 0);
}
