# Pokédex NEO LAB

> Explora 1-1025 Pokémon con PokeAPI. Filtros por tipo/nombre/ID/generación, favoritos, comparador 2vs2, shiny/normal, tema claro/oscuro e infinite scroll. GSAP + Anime.js con paleta oficial Pokémon.

![HTML5](https://img.shields.io/badge/HTML5-E3350D?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-3564AE?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-FFCB05?style=flat&logo=javascript&logoColor=black)
![PokeAPI](https://img.shields.io/badge/PokeAPI-E3350D?style=flat&logo=pokemon&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-0AE448?style=flat&logo=greensock&logoColor=black)
![Anime.js](https://img.shields.io/badge/Anime.js-FF2E93?style=flat)

## ✨ Demo

Abre `index.html` en tu navegador. No necesita servidor ni build.

```
C:\miguel leon evidencias\pokedex\index.html
```

## 🚀 Features

- **PokeAPI real** — `pokeapi.co/api/v2/pokemon/{id}` + `pokemon-species/{id}` + cries `.ogg`
- **Filtros combinables** — búsqueda por nombre / #025 / tipo, por tipo (18), generación I-IX (1-1025), orden ID / nombre / CP total
- **Favoritos** — ♥ en tarjeta, sección dedicada con tabs, contador vivo, vaciar y exportar `.txt`, persiste en `localStorage`
- **Comparador 2vs2** — marca ⚖️ en 2 Pokémon, barra flotante y modal lado a lado con barras animadas y ganador por CP
- **Detalle** — modal con arte oficial, shiny/normal con switch claro (`Normal | ✨ Shiny` + badge + glow), descripción ES/EN, peso/talla/CP, stats animadas, habilidades y grito
- **Infinite scroll** — `IntersectionObserver` + toggle + fallback botón `Cargar más +24`
- **Tema claro/oscuro** — guarda en `localStorage`, `prefers-color-scheme`
- **Paleta oficial Pokémon** — rojo Poké Ball `#E3350D`, azul `#3564AE`, amarillo `#FFCB05`
- **Animaciones** — GSAP (Flip, ScrollTrigger, stagger) + Anime.js

## 🛠️ Stack

- **Estructura:** `index.html` + `css/pokedex.css` + `js/pokedex.js`
- **Librerías CDN:** `gsap@3.12.5` + `ScrollTrigger` + `Flip` + `ScrollToPlugin` + `animejs@3.2.1`
- **Fuentes:** `Space Grotesk` + `Inter`

## 📂 Estructura

```
pokedex/
├── index.html
├── css/
│   └── pokedex.css
├── js/
│   └── pokedex.js
└── README.md
```

## 🔌 API

- Lista: `https://pokeapi.co/api/v2/pokemon/{id}` (1-1025)
- Especie: `https://pokeapi.co/api/v2/pokemon-species/{id}` (flavor_text, hábitat, color)
- Gritos: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/{id}.ogg`

Cache 24h por generación + concurrencia 20.

## ⌨️ Atajos

- `/` enfoca búsqueda
- `Enter` filtra inmediato
- `ESC` limpia búsqueda / cierra modal
- `♥` guarda favorito · `⚖️` compara

## 🎨 Paleta

| Token | Hex | Uso |
|---|---|---|
| `--poke-red` | `#E3350D` | Topbar, acentos, badges |
| `--poke-blue` | `#3564AE` | Botones, secundarios |
| `--poke-yellow` | `#FFCB05` | Bordes, highlights |

## 📄 Licencia

MIT — Datos de [PokeAPI](https://pokeapi.co/docs/v2). Hecho con GSAP + Anime.js + Uiverse neon.
