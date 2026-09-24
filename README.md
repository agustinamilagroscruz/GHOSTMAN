# 👻 GHOSTMAN

### Proyecto Integrador — Testing de Aplicaciones · Entrega 01

> **GhostMan** es un videojuego web inspirado en el clásico concepto de *Pac-Man*, desarrollado como parte del Proyecto Integrador de **Testing de Aplicaciones**.
>
> El proyecto combina el desarrollo de una aplicación funcional con el análisis de requerimientos, diseño de casos de prueba, ejecución de pruebas y documentación de defectos.

---

## 🎮 Sobre el juego

En **GhostMan**, el jugador puede experimentar dos formas diferentes de jugar:

### 🟡 Pacman

Controlá a Pacman a través del laberinto, recolectá las esferas, obtené puntos, utilizá Power-Ups y evitá a los fantasmas.

El objetivo es superar los **3 niveles** sin perder las **3 vidas disponibles**.

### 👻 GhostMan

En este modo, el jugador deja de controlar a Pacman y pasa a controlar un fantasma.

El objetivo es **impedir que Pacman complete el nivel**, utilizando las características y habilidades propias del fantasma seleccionado.

---

## ✨ Características del juego

| 🕹️ Mecánica      | Descripción                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| 🟡 **Pacman**     | Personaje principal del modo Pacman.                                   |
| 👻 **Fantasmas**  | Personajes con diferentes comportamientos y características.           |
| 🟢 **Esferas**    | Elementos que Pacman debe consumir para avanzar.                       |
| ⚡ **Power-Ups**   | Modifican temporalmente las condiciones del juego.                     |
| 🍒 **Frutas**     | Elementos especiales que otorgan puntuación.                           |
| 💯 **Puntuación** | Sistema de puntos obtenido mediante las diferentes acciones del juego. |
| ❤️ **Vidas**      | El jugador comienza cada partida con 3 vidas.                          |
| 🧱 **Laberinto**  | Escenario compuesto por paredes y zonas transitables.                  |
| 🚪 **Niveles**    | La partida está compuesta por 3 niveles de dificultad progresiva.      |
| ⏸️ **Pausa**      | Permite detener temporalmente la partida.                              |
| 👻 **GhostMan**   | Modalidad en la que el jugador controla un fantasma.                   |

---

## 👻 Los fantasmas

GhostMan cuenta con diferentes tipos de fantasmas, cada uno con características específicas.

### 🔴 Classic

El fantasma clásico del juego.

### 🟣 Spectre

Fantasma con características particulares que afectan su comportamiento frente a Pacman.

### 🟢 Jumper

Fantasma que incorpora una mecánica especial relacionada con el salto.

### 🔵 Naval

Fantasma con una mecánica particular que lo diferencia de los demás tipos.

### 🟠 Accelerated

Fantasma caracterizado por una mayor velocidad de desplazamiento.

> Los diferentes tipos de fantasmas se incorporan progresivamente de acuerdo con el plan de versiones del proyecto.

---

## ⚡ Power-Ups

Los **Power-Ups** son elementos especiales que modifican temporalmente las condiciones de juego.

Cuando Pacman obtiene un Power-Up, se activa un período de **8 segundos**.

Durante los últimos **2 segundos**, el Power-Up presenta un efecto de parpadeo para indicar que está próximo a finalizar.

### ⏱️ Duración

**8 segundos**

### ⚠️ Advertencia de finalización

**Últimos 2 segundos → parpadeo**

---

## 🍒 Frutas y puntuación

Las frutas constituyen elementos especiales que permiten obtener puntos adicionales.

| Elemento                    | Puntos |
| --------------------------- | -----: |
| 🟢 Esfera normal            |     10 |
| ⚡ Esfera grande             |     50 |
| 🍒 Fruta                    |    100 |
| 👻 Fantasma derrotado — 1.º |    200 |
| 👻 Fantasma derrotado — 2.º |    400 |
| 👻 Fantasma derrotado — 3.º |    800 |
| 👻 Fantasma derrotado — 4.º |   1600 |

---

## ❤️ Sistema de vidas

Cada partida comienza con:

**❤️ ❤️ ❤️ — 3 vidas**

No se obtienen vidas adicionales mediante la puntuación.

Cuando el jugador pierde una vida:

* Se reinician las posiciones de los personajes.
* El nivel continúa.
* Las esferas ya consumidas permanecen consumidas.
* La puntuación obtenida se conserva.

La partida finaliza cuando el jugador pierde las **3 vidas**.

---

## 🗺️ Niveles

El juego está compuesto por **3 niveles** con dificultad progresiva.

### Nivel 1

Inicio de la partida y aprendizaje de las mecánicas principales.

### Nivel 2

Incremento de la dificultad.

### Nivel 3

Último nivel necesario para completar la partida.

### 🏆 Victoria

En el modo Pacman, el jugador gana al completar los **3 niveles** sin agotar sus vidas.

### 💀 Derrota

La partida termina cuando el jugador pierde las **3 vidas**.

---

## 👻 Modo GhostMan

El modo GhostMan cambia el objetivo tradicional del juego.

En lugar de controlar a Pacman, el jugador controla un fantasma.

### 🎯 Objetivo

El jugador debe tocar a Pacman **3 veces**, siempre que Pacman no se encuentre protegido por un Power-Up.

Cada contacto:

* Hace que Pacman pierda una vida.
* Reinicia el nivel.

Si Pacman consigue consumir todas las esferas antes de que el fantasma cumpla su objetivo, el jugador pierde y se produce el **Game Over**.

### 🔒 Selección del fantasma

Una vez iniciada la partida, el fantasma seleccionado **no puede cambiarse durante el match**.

---

## 🕹️ Controles

| Tecla           | Acción                    |
| --------------- | ------------------------- |
| ⬆️ ⬇️ ⬅️ ➡️     | Movimiento                |
| **W A S D**     | Movimiento alternativo    |
| **SPACE**       | Activar poder en GhostMan |
| **ESC**         | Pausar                    |
| ⬅️ ➡️ / **A D** | Navegar por carruseles    |
| **ENTER**       | Confirmar selección       |

En el modo Pacman, la tecla **SPACE no produce ningún efecto**.

---

## 📋 Plan de versiones

### 🟡 V1 — Pacman

La primera versión concentra las mecánicas fundamentales:

* Movimiento de Pacman.
* Laberinto.
* Paredes y colisiones.
* Esferas.
* Power-Ups.
* Frutas.
* Fantasmas.
* Puntuación.
* Vidas.
* HUD.
* Tres niveles.
* Victoria y derrota.

En esta versión se contemplan inicialmente los fantasmas:

**Classic + Spectre**

### 👻 V2 — GhostMan

La segunda versión amplía la experiencia incorporando:

* Modo GhostMan.
* Selección de fantasma.
* Classic.
* Spectre.
* Jumper.
* Naval.
* Accelerated.
* Habilidades especiales.
* Nuevas condiciones de victoria y derrota.

### 🏆 V3 — Cuentas y personalización

La tercera versión contempla funcionalidades adicionales:

* 👤 Registro.
* 🔐 Inicio de sesión.
* 🏆 Ranking global.
* 📊 Puntajes personales.
* 🎨 Skins.
* ⚙️ Opciones.
* 🔊 Control de volumen.

---

## 🧪 Testing

El testing es una parte fundamental del proyecto.

La Entrega 01 contempla el proceso desde la definición de requerimientos hasta la ejecución de las pruebas.

### 🔎 Proceso

**Requerimientos**
↓
**Historias de usuario**
↓
**Criterios de aceptación**
↓
**Casos de prueba**
↓
**Ejecución**
↓
**Registro de resultados**
↓
**Reporte de defectos**

### 📌 Alcance de la Entrega 01

| Versión | Requerimientos | Casos de prueba | Ejecución       |
| ------- | -------------- | --------------- | --------------- |
| 🟡 V1   | Detallados     | Detallados      | ✅ Sí            |
| 👻 V2   | Definidos      | Sintéticos      | ⏳ Entrega 02    |
| 🏆 V3   | Definidos      | Sintéticos      | ⏳ Entrega 02/03 |

La ejecución de pruebas de esta entrega se concentra principalmente en la **V1**.

---

## 📚 Documentación

La documentación detallada del proyecto se encuentra organizada dentro del repositorio.

### 📋 Entrega 01

👉 [TP/entrega-01.md](TP/entrega-01.md)

Incluye:

* Objetivos.
* Requerimientos.
* Historias de usuario.
* Reglas de negocio.
* Organización del equipo.
* Estrategia de testing.
* Casos de prueba.
* Matriz de trazabilidad.
* Reporte de ejecución.
* Reporte de defectos.
* Conclusiones.

### 🔧 Workflow de V1

👉 [Workflow/v1-workflow.md](Workflow/v1-workflow.md)

Contiene el plan de trabajo y desarrollo correspondiente a la primera versión del proyecto.

---

## 🤖 Implementación

La aplicación fue desarrollada utilizando un enfoque de **vibe-coding**, con asistencia de herramientas de Inteligencia Artificial.

La documentación del proyecto registra:

* Herramientas y agentes utilizados.
* Prompts utilizados.
* Funcionalidades solicitadas.
* Problemas encontrados.
* Soluciones aplicadas.
* Validación de la aplicación.

---

## 🛠️ Tecnologías

### Frontend

* **TypeScript**
* **JavaScript**
* **CSS**
* **React**
* **Next.js**

### Motor del juego

* **HTML Canvas**
* **requestAnimationFrame**

### Control de versiones

* **GitHub**

---

## 💻 Desarrollo local

Para ejecutar el proyecto localmente:

### 1. Clonar el repositorio

```bash
git clone https://github.com/agustinamilagroscruz/GHOSTMAN.git
cd GHOSTMAN
```

### 2. Instalar las dependencias

```bash
npm install
```

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

### 4. Abrir la aplicación

Ingresar desde el navegador a:

**http://localhost:3000**

---

## 👥 Equipo

| Integrante                      |  Legajo |
| ------------------------------- | ------: |
| **Cruz, Agustina**              | 1241748 |
| **Luzzi, María Eugenia**        | 1121159 |
| **Rodriguez Castro, Alejandro** | 1117972 |
| **Savoia, Diego Agustín**       | 1175679 |
| **Tsai, Leonardo Kevin**        | 1120569 |

**Materia:** Testing de Aplicaciones
**Comisión:** 15852
**Grupo:** 1

---

## 🔗 Enlaces

| Recurso                       | Enlace                                                       |
| ----------------------------- | ------------------------------------------------------------ |
| 💻 Repositorio                | [GHOSTMAN](https://github.com/agustinamilagroscruz/GHOSTMAN) |
| 🌐 Aplicación desplegada      | *Agregar URL*                                                |
| 🧪 Casos de prueba y defectos | *Agregar URL de Google Sheets*                               |
| 📋 Documentación              | [TP/entrega-01.md](TP/entrega-01.md)                         |
| 🔧 Workflow V1                | [Workflow/v1-workflow.md](Workflow/v1-workflow.md)           |

---

## 📌 Estado del proyecto

**Proyecto:** GhostMan
**Entrega:** 01
**Versión bajo prueba:** V1 — Pacman

> 🎮 **Desarrollar · Probar · Detectar · Mejorar**

---

### 🎓 Proyecto Integrador

**Testing de Aplicaciones · Comisión 15852 · Grupo 1**
