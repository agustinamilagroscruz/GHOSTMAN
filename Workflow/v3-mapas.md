# Mapas de la V3 (bocetos aprobados)

Bocetos de los tres niveles de la V3, aprobados el 30/10/2026. Son la entrada del incremento 19 (HU-44 y HU-45; decisiones 26 y 34). Antes de ese incremento se pasan a `TP/entrega-03.md`.

## Reglas comunes

- **Tamaño:** 28 columnas × 31 filas, como el Pac-Man original. Si los niveles resultan lentos de completar, se ajustan las velocidades después de un playtest.
- **Diseño:** cada laberinto es propio, no una copia del original. Conserva lo reconocible: simetría horizontal, la base en el centro, el túnel a la altura de la base, cuatro esferas grandes y Pacman apareciendo debajo de la base.
- **Muros finos:** los pasillos están en las filas impares y los muros interiores tienen una celda de espesor casi en todo el mapa, para que el espectro tenga muchos lugares donde usar su poder (decisión 26). El espectro nunca cruza el borde del mapa.
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
| Muros interiores que el espectro puede cruzar | 234 de 282 | 240 de 318 | 210 de 328 |
| Esferas comunes | 388 | 352 | 344 |
| Esferas grandes | (1,1) (1,26) (23,1) (23,26) | (5,1) (5,26) (25,1) (25,26) | (1,1) (1,26) (29,1) (29,26); en modo GhostMan, además (15,1) y (15,26) |

Los conteos excluyen el borde y la base. Las posiciones de las esferas grandes van como (fila, columna). En el nivel 3 del modo GhostMan las esferas grandes son dinámicas (incremento 17 de la V2), así que esas posiciones son solo las iniciales.

---

## Nivel 1

```
   0         1         2
   0123456789012345678901234567
 0 ############################
 1 #o....#..............#....o#
 2 #.#.#.#.###.####.###.#.#.#.#
 3 #...#..................#...#
 4 #.#####.############.#####.#
 5 #..........................#
 6 #.###.###.########.###.###.#
 7 #...#.......####.......#...#
 8 ###.#.#.###.####.###.#.#.###
 9 #.....#..............#.....#
10 #.#####.#.########.#.#####.#
11 #.......#          #.......#
12 #####.#.# ###--### #.#.#####
13     ..... #      # .....    
14 #####.#.# #      # #.#.#####
15 #.....#.# #      # #.#.....#
16 #.#####.# ######## #.#####.#
17 #...#...#          #...#...#
18 ###.#.#.# ######## #.#.#.###
19 #.....#..............#.....#
20 #.###.#.###.####.###.#.###.#
21 #.....#...#......#...#.....#
22 ###.###.#.########.#.###.###
23 #o......#....  ....#......o#
24 #.###.###.#.####.#.###.###.#
25 #.#.........####.........#.#
26 #.#.###.###.####.###.###.#.#
27 #...#..................#...#
28 #.###.###.########.###.###.#
29 #..........................#
30 ############################
```

## Nivel 2

Laberinto en espiral en las esquinas, con las esferas grandes a los costados.

```
   0         1         2
   0123456789012345678901234567
 0 ############################
 1 #.......#...####...#.......#
 2 #.#####.#.#.####.#.#.#####.#
 3 #.#.....#.#.####.#.#.....#.#
 4 #.#.#####.#.####.#.#####.#.#
 5 #o#...#...#.####.#...#...#o#
 6 #.###.#.###.####.###.#.###.#
 7 #...#.....#......#.....#...#
 8 ###.#.#.#.########.#.#.#.###
 9 #...#.#...#......#...#.#...#
10 #.#.#.#####.####.#####.#.#.#
11 #...#....          ....#...#
12 ######### ###--### #########
13     ..... #      # .....    
14 ######### #      # #########
15 #.......# #      # #.......#
16 #.#####.# ######## #.#####.#
17 #.......#          #.......#
18 #######.# ######## #.#######
19 #..........................#
20 #.###.#.#.########.#.#.###.#
21 #.#...#.#.#......#.#.#...#.#
22 #.#.###.#.#.####.#.#.###.#.#
23 #.....#.#....  ....#.#.....#
24 ###.#.#.############.#.#.###
25 #o..#.#.....####.....#.#..o#
26 #.###.#.###.####.###.#.###.#
27 #.....#...#.####.#...#.....#
28 #.###.#.#.#.####.#.#.#.###.#
29 #.....#...#......#...#.....#
30 ############################
```

## Nivel 3

Más compartimentado. Hay tramos donde las columnas 12 a 15 forman un muro de 4 celdas, y ahí el espectro no puede cruzar por el centro. Tiene que usar los cruces laterales o las filas que atraviesan el centro (por ejemplo, la 29).

```
   0         1         2
   0123456789012345678901234567
 0 ############################
 1 #o..........####..........o#
 2 #.#.#######.####.#######.#.#
 3 #...#...#...####...#...#...#
 4 #.###.#.#.########.#.#.###.#
 5 #...#...#.#......#.#...#...#
 6 ###.#.###.#.####.#.###.#.###
 7 #.......#...####...#.......#
 8 #.#.###.############.###.#.#
 9 #.#...#.....####.....#...#.#
10 #.###.#.###.####.###.#.###.#
11 #.....#..          ..#.....#
12 ######### ###--### #########
13     ..... #      # .....    
14 ######### #      # #########
15 #.....#.. #      # ..#.....#
16 #.#.#.#.# ######## #.#.#.#.#
17 #...#...#          #...#...#
18 #.#########.####.#########.#
19 #.........#.####.#.........#
20 #####.#.#.#.####.#.#.#.#####
21 #.....#...#.####.#...#.....#
22 #.#.#######.####.#######.#.#
23 #...#.....#..  ..#.....#...#
24 #.###.#.#.#.####.#.#.#.###.#
25 #...#.#...#.####.#...#.#...#
26 ###.#.#####.####.#####.#.###
27 #...#...#...####...#...#...#
28 #.#####.#.########.#.#####.#
29 #o......#..........#......o#
30 ############################
```

---

## Pendientes antes del incremento 19

- [ ] Pasar el formato de texto de `src/game/maps/parse.ts` a esta leyenda: espacio como pasillo sin esfera, `-` como puerta y las celdas de borde de la fila 13 como túnel
- [x] Definir el resto de los puntos de la base y el túnel: decisiones 44 a 50 de `v3-workflow.md`
- [x] Revisar la decisión 22 con mapas de muros finos: se mantienen las 5 cargas y se vuelve a medir después del incremento 19 (decisión 51)
