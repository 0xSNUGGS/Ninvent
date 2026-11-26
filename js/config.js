// Repositorio donde se guardan el adviento (data/adviento.json) y los archivos (media/).
// En GitHub Pages se detecta solo a partir de la dirección (usuario.github.io/repo).
// Para probar en local contra GitHub, rellénalo a mano. Vacío en local = MODO DEMO (todo en este navegador).
const onPages = location.hostname.endsWith('.github.io');
export const GITHUB = onPages
  ? { owner: location.hostname.split('.')[0], repo: location.pathname.split('/')[1] || location.hostname, branch: 'main' }
  : { owner: '', repo: '', branch: 'main' };

// SHA-256 de los dos correos que pueden entrar (así no aparecen en claro en la página).
export const PEOPLE = {
  'f35b928269f4c4b9d2310e6ae33286943672a41e0f780fd9b704f95027dea398': 'destinataria',
  '6bab438b5a6422bb83c9c0bef24aa2bde09d7b358d753f551867e71973962be5': 'creadora',
};
