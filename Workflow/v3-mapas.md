# Mapas de la V3 (bocetos aprobados)

Mapas de los tres niveles de la V3, aprobados por D. Savoia el 31/10/2026 (decisión 69). Son la entrada del incremento 21 y reemplazan los bocetos de muros finos del 30/10/2026, que se usaron en los incrementos 19 y 20 (están en el historial de git). El marco fijo no cambió.

## Reglas comunes

- **Tamaño:** 28 columnas × 31 filas, como el Pac-Man original. Se dibujan a la escala del original: personajes de unas 2 celdas y muros como contorno (decisión 68).
- **Diseño:** cada laberinto es propio, no una copia del original. Conserva lo reconocible: simetría horizontal, la base en el centro, el túnel a la altura de la base, cuatro esferas grandes y Pacman apareciendo debajo de la base.
- **Bloques:** como en el original, la mayoría de los muros son bloques de 2 o más celdas, y hay unas 260 esferas por nivel (decisión 69). Quedan algunos muros de una celda para que el espectro tenga dónde usar su poder (decisión 26); en pantalla se ven como una sola línea. El espectro nunca cruza el borde del mapa.
- **Validación:** los tres mapas no tienen celdas aisladas, callejones sin salida ni espacios abiertos de 2 × 2 fuera de la base.

### Marco fijo (igual en los tres niveles)

| Elemento | Ubicación |
|---|---|
| Base de los fantasmas | Filas 12 a 16, columnas 10 a 17. Interior: filas 13 a 15, columnas 11 a 16. Es infranqueable salvo por la puerta, también para el espectro, el saltarín y el acelerado |
| Puerta de la base | Fila 12, columnas 13 y 14 |
| Anillo alrededor de la base | Filas 11 y 17, columnas 9 y 18. No tiene esferas |
| Túnel | Fila 13. Sale por la columna 0 y entra por la 27, y al revés. Las columnas 0 a 3 y 24 a 27 no tienen esferas |
| Aparición de Pacman | Fila 23, entre las columnas 13 y 14. Esas celdas no tienen esferas |

### Leyenda

| Símbolo | Significado |
|---|---|
| `#` | Muro |
| `.` | Pasillo con esfera común |
| `o` | Pasillo con esfera grande |
| espacio | Pasillo sin esfera (anillo, túnel, aparición de Pacman e interior de la base) |
| `-` | Puerta de la base |

### Resumen

| | Nivel 1 | Nivel 2 | Nivel 3 |
|---|---|---|---|
| Muros interiores que el espectro puede cruzar | 30 de 414 | 22 de 404 | 46 de 414 |
| Esferas comunes | 258 | 268 | 258 |
| Esferas grandes | (1,1) (1,26) (23,1) (23,26) | (3,1) (3,26) (22,1) (22,26) | (1,1) (1,26) (29,1) (29,26); en modo GhostMan, además (15,1) y (15,26) |

Los conteos de muros excluyen el borde y la base; un muro se puede cruzar si tiene pasillo a los dos lados, en vertical o en horizontal. Las posiciones de las esferas grandes van como (fila, columna). En el nivel 3 del modo GhostMan las esferas grandes son dinámicas (incremento 17 de la V2), así que esas posiciones son solo las iniciales.

---

## Nivel 1

Bloques rectangulares, con pasillos largos de lado a lado en las filas 3, 5, 20 y 29.

```
   0         1         2
   0123456789012345678901234567
 0 ############################
 1 #o.....#.....##.....#.....o#
 2 #.####.#.###.##.###.#.####.#
 3 #..........................#
 4 #.####.##.########.##.####.#
 5 #.####.##.########.##.####.#
 6 #......##....##....##......#
 7 #.####.##.##.##.##.##.####.#
 8 #............##............#
 9 ######.##.########.##.######
10 ######.##.########.##.######
11 ######.##          ##.######
12 ######.## ###--### ##.######
13     ..... #      # .....    
14 ######.## #      # ##.######
15 ######.## #      # ##.######
16 ######.## ######## ##.######
17 ######.##          ##.######
18 ######.##.########.##.######
19 ######.##.########.##.######
20 #..........................#
21 #.####.##############.####.#
22 #.####.##############.####.#
23 #o...........  ...........o#
24 #.######.##########.######.#
25 #.######.##########.######.#
26 #.######.##########.######.#
27 #.######.##########.######.#
28 #.######.##########.######.#
29 #..........................#
30 ############################
```
## Nivel 2

Un gran bloque central arriba, bolsillos a los costados de la base y las esferas grandes a los costados.

```
   0         1         2
   0123456789012345678901234567
 0 ############################
 1 #.....################.....#
 2 #.###.################.###.#
 3 #o###.#......##......#.###o#
 4 #.###.#.####.##.####.#.###.#
 5 #..........................#
 6 #.##########.##.##########.#
 7 #.##########.##.##########.#
 8 #............##............#
 9 #.####.##.########.##.####.#
10 #.####.##.########.##.####.#
11 #......##          ##......#
12 ######.## ###--### ##.######
13     ..... #      # .....    
14 ######.## #      # ##.######
15 ######.## #      # ##.######
16 ######.## ######## ##.######
17 #......##          ##......#
18 #.####.##.########.##.####.#
19 #.####.##.########.##.####.#
20 #..........................#
21 #.########.######.########.#
22 #o########.######.########o#
23 #............  ............#
24 #.#####.############.#####.#
25 #.#####.############.#####.#
26 #.......############.......#
27 #.########################.#
28 #.########################.#
29 #..........................#
30 ############################
```
## Nivel 3

El más compartimentado: bloques con forma de L y de escalón, y un muro central de 4 celdas en la parte de arriba. El espectro tiene más cruces que en los otros niveles.

```
   0         1         2
   0123456789012345678901234567
 0 ############################
 1 #o....#.....####.....#....o#
 2 #.###.#.###.####.###.#.###.#
 3 #.###...###.####.###...###.#
 4 #.#########.####.#########.#
 5 #..........................#
 6 ####.###.##########.###.####
 7 #....###.##########.###....#
 8 #.######.##########.######.#
 9 #.######.##########.######.#
10 #.####...##########...####.#
11 #.####.##          ##.####.#
12 #.####.## ###--### ##.####.#
13     ..... #      # .....    
14 ######.## #      # ##.######
15 #......## #      # ##......#
16 #.####.## ######## ##.####.#
17 #.####.##          ##.####.#
18 #.####.##.########.##.####.#
19 #..........................#
20 ###.#.####.######.####.#.###
21 #...#.####.######.####.#...#
22 #.###......######......###.#
23 #.....####...  ...####.....#
24 #.###.####.######.####.###.#
25 #.###......######......###.#
26 #.#####.############.#####.#
27 #.#####.############.#####.#
28 #.#####.############.#####.#
29 #o......############......o#
30 ############################
```

---

## Pendientes antes del incremento 19 (cerrados)

- [ ] Pasar el formato de texto de `src/game/maps/parse.ts` a esta leyenda: espacio como pasillo sin esfera, `-` como puerta y las celdas de borde de la fila 13 como túnel
- [x] Definir el resto de los puntos de la base y el túnel: decisiones 44 a 50 de `v3-workflow.md`
- [x] Revisar la decisión 22 con mapas de muros finos: se mantienen las 5 cargas y se vuelve a medir después del incremento 19 (decisión 51)
