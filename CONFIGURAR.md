# Nuestro Adviento: cómo ponerlo en marcha

Web estática (HTML + JS, sin compilar ni base de datos) para GitHub Pages. Todo se guarda en el propio repositorio:

- `data/adviento.json`: los nombres, las fechas y el texto de cada puerta.
- `media/`: las fotos, notas de voz y vídeos.

Se entra escribiendo el correo. Solo hay dos correos válidos, guardados como hash SHA-256 en `js/config.js` (no aparecen en claro en la página):

- quien lo **crea** va al editor;
- quien lo **recibe** ve el calendario (cuando quien lo crea pulsa «Está listo»).

## Probar en tu ordenador

```powershell
python -m http.server 8000
```

Abre http://localhost:8000. En local la web funciona en **modo demo**: todo se guarda solo en ese navegador. Para simular un día añade `?hoy=2026-12-24` a la dirección (y `?hoy=` para volver a la fecha real).

## 1. Publicar en GitHub Pages

1. Crea un repositorio **público** en GitHub (Pages gratis solo funciona con públicos) y sube esta carpeta, salvo `.claude/`.
2. En el repositorio: **Settings → Pages** → *Deploy from a branch* → `main` / `(root)` → Save.
3. En un par de minutos estará en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

La web detecta sola el usuario y el repositorio a partir de esa dirección. Si la rama no se llama `main`, cámbialo en `js/config.js`.

## 2. Token para guardar (solo quien lo crea)

La primera vez que quien lo crea entra en un dispositivo, la web le pide un token de GitHub para poder guardar en el repositorio:

1. https://github.com/settings/personal-access-tokens/new
2. **Expiration**: una fecha después del Adviento.
3. **Repository access**: *Only select repositories* → este repositorio.
4. **Permissions → Repository permissions → Contents**: *Read and write*.
5. *Generate token*, copiarlo y pegarlo en la web.

El token se queda guardado solo en ese navegador. Quien lo recibe no necesita nada.

## Cosas a tener en cuenta

- **El repositorio es público**: cualquiera que lo encuentre puede ver los textos y archivos, y el bloqueo de cada puerta hasta su día es solo de la web. Para dos personas sirve, pero no subas nada que no quieras que se pueda ver.
- Cada guardado es un commit. El editor agrupa los cambios unos segundos para no llenar el historial.
- Una foto o un vídeo recién subido tarda un par de minutos en publicarse en Pages; mientras tanto, la web lo carga directamente desde GitHub.
- Límite por archivo: 25 MB (vídeos cortos). Las fotos se reducen solas antes de subirlas.

## Al terminar el Adviento

1. Archiva o borra el repositorio de GitHub.
2. Borra el token en https://github.com/settings/personal-access-tokens.
