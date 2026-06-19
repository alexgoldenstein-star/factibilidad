# Factibilidad

App de análisis de factibilidad inmobiliaria para AGF Desarrollos.

## Setup

1. `npm install`
2. Crear `.env.local` con las credenciales de Firebase (ver `.env.example`)
3. `npm run dev` para probar local
4. `npm run build` genera `/dist`

## Variables de entorno necesarias (Vercel → Settings → Environment Variables)

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- ANTHROPIC_API_KEY (para el endpoint /api/verificar-normativa)

## Estructura

- `src/lib/factibilidad.js` — motor de cálculo (toda la lógica de negocio)
- `src/lib/firebase.js` — conexión a Firestore
- `src/lib/proyectos.js` — CRUD de proyectos guardados
- `src/lib/normativa.js` — cliente del endpoint de verificación normativa
- `src/lib/reportePDF.js` — generador de PDF para inversores
- `src/pages/ListaProyectos.jsx` — home, listado de proyectos
- `src/pages/EditorProyecto.jsx` — editor principal (6 tabs)
- `api/verificar-normativa.js` — Vercel Function que llama a Claude API con web search
