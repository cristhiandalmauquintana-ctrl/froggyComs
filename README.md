# Froggy Hub

Hub de loadstrings para juegos de Roblox con tema Froggy Chibi Kawaii.

- **Frontend:** HTML, CSS y JavaScript sin framework. Molinos y olas en CSS puro; gotas en un `<canvas>` ligero; ranas con la Web Animations API. Respeta `prefers-reduced-motion` y se pausa con la pestaña oculta.
- **Backend:** Node.js sin framework (`server.js`). Hace de puente hacia Roblox y Gemini, así la API key nunca llega al navegador.
- **Almacenamiento:** Postgres si defines `DATABASE_URL`; si no, un archivo JSON.

## Probar en local

```bash
npm install
cp .env.example .env        # y edita los valores
export $(grep -v '^#' .env | xargs)
npm start                   # http://localhost:3000
```

## Variables de entorno

| Variable | Para qué sirve |
| --- | --- |
| `ADMIN_PASSWORD` | Contraseña para agregar y borrar scripts. Sin ella, el botón “Agregar script” no aparece. |
| `GEMINI_API_KEY` | API key de Gemini para generar las descripciones. |
| `GEMINI_MODEL` | Modelo de Gemini (por defecto `gemini-2.5-flash`). |
| `DATABASE_URL` | Postgres opcional para persistir los scripts. |
| `DATA_DIR` | Carpeta del `scripts.json` cuando no usas Postgres. |

## Cómo funciona la subida

1. Escribes el **ID del universo** de Roblox. El servidor consulta `games.roblox.com` y `thumbnails.roblox.com` y muestra el nombre y la miniatura.
2. Pegas la **URL del loadstring**.
3. Si dejas la descripción vacía, el servidor pide a Gemini una descripción kawaii de máximo 2 líneas. También puedes generarla antes con el botón “Generar descripción con IA” y editarla.
4. La tarjeta copia `loadstring(game:HttpGet("URL"))()` al portapapeles.

## Desplegar en Render

El archivo `render.yaml` describe el servicio. En Render: **New → Blueprint** y elige este repositorio, o crea un **Web Service** con build `npm install` y start `npm start`.

> En el plan gratuito de Render el disco es efímero: sin `DATABASE_URL` (o un disco persistente con `DATA_DIR`), los scripts se pierden cuando el servicio se reinicia o se duerme.

## Seguridad

- Las subidas exigen `ADMIN_PASSWORD` (comparación en tiempo constante) y hay límite de intentos fallidos y de peticiones.
- El navegador solo recibe texto plano: todo se pinta con `textContent`, y la CSP bloquea scripts y estilos en línea.
- Froggy Hub no está afiliado a Roblox.
