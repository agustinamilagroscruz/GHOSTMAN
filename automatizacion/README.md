# Automatización de casos de prueba — GhostMan

Caso automatizado con **Playwright**: **CP-060 · Pantalla de Game Over** (HU-19, prioridad Alta).

El script abre Google Chrome, entra a la aplicación publicada en Vercel y la usa como lo haría una
persona: inicia sesión, elige «Jugar» y «Modo PacMan», pierde las 3 vidas y verifica la pantalla de
Game Over. Es una prueba de **caja negra**: no usa atajos ni toca el código del juego.

Esta carpeta tiene su propio `package.json`, así que no cambia nada del juego.

---

## 1. Requisitos (una sola vez)

- **Node.js** 18 o superior. Para comprobarlo: `node -v`
- **Google Chrome** instalado
- **Una cuenta en el juego**: entrar a https://ghostman-seven.vercel.app y crearla con «Registrate»
  (o usar una que ya tengas)

## 2. Instalación (una sola vez)

Desde la carpeta del proyecto (`GHOSTMAN`), en la terminal:

```bash
cd automatizacion
npm install
```

`npm install` descarga Playwright y el componente que graba el video (ffmpeg). Tarda alrededor de
un minuto.

## 3. Cargar el usuario de prueba (una sola vez)

1. Crear el archivo `.env` a partir del ejemplo:
   ```bash
   cp .env.example .env
   ```
2. Abrir `automatizacion/.env` (en VS Code o con `open -e .env`) y completar las dos líneas con el
   usuario y la contraseña de tu cuenta del juego, sin espacios ni comillas:
   ```
   GHOSTMAN_USER=tu_usuario
   GHOSTMAN_PASSWORD=tu_contraseña
   ```
3. Guardar.

El `.env` **no se sube a GitHub** porque tiene una contraseña: cada persona arma el suyo.

## 4. Correr el caso

```bash
npm run cp060
```

Qué se ve:

1. Se abre Chrome y el script hace todo solo, en cámara lenta: inicia sesión, entra al modo
   PacMan y lleva a Pacman hacia los fantasmas hasta perder las 3 vidas. Tarda alrededor de 1 minuto.
2. En la terminal aparece cada paso con el resultado **esperado** y el **obtenido**, y al final
   `✅ CP-060 APROBADO` o el error.
3. Se abre solo el **reporte HTML** con:
   - el estado del caso (**Passed** o **Failed**),
   - cada paso con su duración y una captura (se despliega con la flecha),
   - el **video** de la ejecución (más abajo),
   - **View Trace**: permite recorrer la ejecución acción por acción.

Para volver a abrir el último reporte: `npm run reporte`. Para cerrarlo en la terminal: **Ctrl+C**.

## 5. Qué verifica

| Paso del caso | Qué hace el script | Qué verifica |
|---|---|---|
| Pre-requisito 1 | Abre la aplicación | Se muestra el inicio de sesión |
| Pre-requisito 2 | Inicia sesión, elige «Jugar» y «Modo PacMan» | Menú con «Hola, usuario»; empieza la partida |
| Pre-requisito 3 | — | «Nivel 1» y 3 vidas |
| Paso 1 | Lleva a Pacman hacia el centro, por donde salen los fantasmas | Las vidas bajan 3 → 2 → 1 → 0 y el contador queda vacío |
| Paso 2 | Observa la pantalla y hace clic en «Menú principal» | «Game Over», desglose (Esferas, Fantasmas comidos, Frutas, Bonus por tiempo, Bonus por vidas, Total), botones «Volver a jugar» y «Menú principal»; vuelve al menú |

Si cualquier verificación no se cumple, el caso queda **Failed** y el reporte marca el paso y la causa.

## 6. Problemas frecuentes

| Problema | Solución |
|---|---|
| `Faltan GHOSTMAN_USER y GHOSTMAN_PASSWORD` | Falta el `.env` o está vacío: ver el punto 3 |
| `Executable doesn't exist ... ffmpeg` | Correr `npx playwright install ffmpeg` |
| No encuentra Chrome | Instalar Google Chrome |
| La app dice «No se pudo conectar con el servidor» (también a mano en Chrome) | Problema de DNS del proveedor de internet. En Mac: Configuración del Sistema → Wi‑Fi → Detalles… → DNS → agregar `8.8.8.8` y `1.1.1.1` → OK. Después, en la terminal: `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`, y en Chrome abrir `chrome://net-internals/#dns` → «Clear host cache» |
| Lo mismo, pero el DNS ya está bien | El proyecto de Supabase puede estar pausado por inactividad: avisar a quien lo administra para que lo reactive («Restore project») |
| Falla el inicio de sesión | Revisar usuario y contraseña del `.env` entrando a mano en la app |

## 7. Opciones del `.env`

| Variable | Para qué sirve | Por defecto |
|---|---|---|
| `BASE_URL` | Otra URL (por ejemplo `http://localhost:3000`) | La de Vercel |
| `SLOW_MO` | Milisegundos de pausa entre acciones (0 = velocidad normal) | 400 |
| `HEADLESS` | `1` para correr sin abrir la ventana | Con ventana |

Nota: al terminar la partida, el juego guarda el puntaje en la cuenta usada.
