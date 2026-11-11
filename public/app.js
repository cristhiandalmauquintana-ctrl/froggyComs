// Froggy Hub — galería, copiado y formulario de subida.
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const state = {
    scripts: [],
    query: '',
    config: { adminEnabled: false, aiEnabled: false },
    pass: '',
    unlocked: false,
    renderedOnce: false,
  };

  try {
    state.pass = sessionStorage.getItem('froggy-admin') || '';
  } catch {
    /* sin almacenamiento: se pedirá la contraseña cada vez */
  }

  /* ----------------------------- utilidades ---------------------------- */

  async function api(url, { method = 'GET', body, admin = false } = {}) {
    const headers = {};
    if (body) headers['content-type'] = 'application/json';
    if (admin) headers['x-admin-password'] = state.pass;
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try {
      data = await res.json();
    } catch {
      /* respuesta sin JSON */
    }
    if (!res.ok) {
      const err = new Error(data?.error || `Error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  let toastTimer = 0;
  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2800);
  }

  function frogIcon(className) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 112');
    svg.setAttribute('class', className);
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#frog');
    svg.appendChild(use);
    return svg;
  }

  function loadstringFor(script) {
    return `loadstring(game:HttpGet("${script.loadstringUrl}"))()`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Respaldo para navegadores sin Clipboard API o páginas sin HTTPS.
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.className = 'sr-only';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      area.remove();
      return ok;
    }
  }

  /* ------------------------------ tarjetas ----------------------------- */

  function buildCard(script, index) {
    const card = document.createElement('article');
    card.className = 'card';
    if (!state.renderedOnce) {
      card.classList.add('enter');
      card.style.setProperty('--i', Math.min(index, 10));
    }

    const media = document.createElement('div');
    media.className = 'card-media';
    media.appendChild(frogIcon('media-frog'));
    if (script.thumbnail) {
      const img = document.createElement('img');
      img.src = script.thumbnail;
      img.alt = `Miniatura de ${script.name}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => img.remove());
      media.appendChild(img);
    }
    if (script.aiGenerated) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Descripción con IA';
      media.appendChild(badge);
    }

    const body = document.createElement('div');
    body.className = 'card-body';
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = script.name;
    const desc = document.createElement('p');
    desc.className = 'card-desc';
    desc.textContent = script.description;
    body.append(title, desc);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn btn-green btn-copy';
    copy.textContent = 'Copiar loadstring';
    let resetTimer = 0;
    copy.addEventListener('click', async () => {
      const ok = await copyText(loadstringFor(script));
      clearTimeout(resetTimer);
      if (ok) {
        copy.classList.add('is-copied');
        copy.textContent = '¡Copiado!';
        resetTimer = setTimeout(() => {
          copy.classList.remove('is-copied');
          copy.textContent = 'Copiar loadstring';
        }, 1800);
      } else {
        toast('No pude copiar. Selecciona el texto y cópialo a mano.');
      }
    });
    actions.appendChild(copy);

    if (state.unlocked) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'btn btn-delete';
      del.textContent = 'Borrar';
      del.setAttribute('aria-label', `Borrar ${script.name}`);
      del.addEventListener('click', () => removeScript(script));
      actions.appendChild(del);
    }

    card.append(media, body, actions);
    return card;
  }

  function render() {
    const grid = $('#grid');
    const empty = $('#empty');
    const q = state.query.trim().toLowerCase();
    const list = q ? state.scripts.filter((s) => s.name.toLowerCase().includes(q)) : state.scripts;

    grid.replaceChildren(...list.map(buildCard));
    grid.setAttribute('aria-busy', 'false');
    state.renderedOnce = true;

    $('#count').textContent = state.scripts.length ? `${list.length} de ${state.scripts.length}` : '';

    empty.replaceChildren();
    if (list.length) {
      empty.hidden = true;
      return;
    }
    empty.hidden = false;
    const h = document.createElement('h2');
    const p = document.createElement('p');
    if (state.scripts.length) {
      h.textContent = 'Ningún juego coincide';
      p.textContent = `No encontré scripts para “${state.query.trim()}”. Prueba con otro nombre.`;
      empty.append(h, p);
    } else {
      h.textContent = 'Aún no hay scripts';
      p.textContent = state.config.adminEnabled
        ? 'Agrega el primero con el botón “Agregar script”.'
        : 'Vuelve pronto: el primer script llegará en cualquier momento.';
      empty.append(h, p);
    }
  }

  function showSkeleton() {
    const grid = $('#grid');
    const cards = [1, 2, 3].map(() => {
      const el = document.createElement('div');
      el.className = 'card skeleton';
      return el;
    });
    grid.replaceChildren(...cards);
  }

  async function removeScript(script) {
    if (!window.confirm(`¿Borrar “${script.name}”? Esta acción no se puede deshacer.`)) return;
    try {
      await api(`/api/scripts/${script.id}`, { method: 'DELETE', admin: true });
      state.scripts = state.scripts.filter((s) => s.id !== script.id);
      render();
      toast('Script borrado');
    } catch (err) {
      if (err.status === 401) lock();
      toast(err.message);
    }
  }

  /* ---------------------------- modo admin ----------------------------- */

  function unlock(pass) {
    state.pass = pass;
    state.unlocked = true;
    try {
      sessionStorage.setItem('froggy-admin', pass);
    } catch {
      /* ignorar */
    }
    render();
  }

  function lock() {
    state.pass = '';
    state.unlocked = false;
    try {
      sessionStorage.removeItem('froggy-admin');
    } catch {
      /* ignorar */
    }
    render();
  }

  /* ----------------------- formulario de subida ------------------------ */

  const dialog = $('#upload-dialog');
  const form = $('#upload-form');
  const fields = {
    pass: $('#f-pass'),
    universe: $('#f-universe'),
    url: $('#f-url'),
    name: $('#f-name'),
    desc: $('#f-desc'),
    ai: $('#f-ai'),
    submit: $('#f-submit'),
    msg: $('#f-msg'),
    preview: $('#f-preview'),
    thumb: $('#f-thumb'),
    game: $('#f-game'),
    hint: $('#f-gamehint'),
  };
  let descFromAi = false;
  let autoName = '';
  let lookupId = 0;
  let lookupTimer = 0;

  function setMsg(text, kind) {
    fields.msg.textContent = text || '';
    fields.msg.className = `msg${kind ? ` is-${kind}` : ''}`;
  }

  function resetForm() {
    const pass = fields.pass.value;
    form.reset();
    fields.pass.value = pass;
    fields.preview.hidden = true;
    descFromAi = false;
    autoName = '';
    setMsg('');
  }

  function openDialog() {
    fields.pass.value = state.pass;
    fields.ai.disabled = !state.config.aiEnabled;
    fields.ai.title = state.config.aiEnabled ? '' : 'Falta GEMINI_API_KEY en el servidor';
    dialog.showModal();
    (state.pass ? fields.universe : fields.pass).focus();
  }

  async function lookupGame(id) {
    const ticket = ++lookupId;
    fields.preview.hidden = false;
    fields.thumb.removeAttribute('src');
    fields.game.textContent = 'Buscando en Roblox…';
    fields.hint.textContent = '';
    try {
      const game = await api(`/api/roblox/${id}`);
      if (ticket !== lookupId) return;
      fields.game.textContent = game.name;
      fields.hint.textContent = game.thumbnail ? 'Miniatura encontrada' : 'Este juego no tiene miniatura pública';
      if (game.thumbnail) fields.thumb.src = game.thumbnail;
      if (!fields.name.value || fields.name.value === autoName) {
        fields.name.value = game.name;
        autoName = game.name;
      }
    } catch (err) {
      if (ticket !== lookupId) return;
      fields.game.textContent = 'No encontré ese juego';
      fields.hint.textContent = err.message;
    }
  }

  fields.universe.addEventListener('input', () => {
    clearTimeout(lookupTimer);
    const id = fields.universe.value.trim();
    if (!/^\d{4,15}$/.test(id)) {
      lookupId += 1;
      fields.preview.hidden = true;
      return;
    }
    lookupTimer = setTimeout(() => lookupGame(id), 450);
  });

  fields.desc.addEventListener('input', () => {
    descFromAi = false;
  });

  fields.ai.addEventListener('click', async () => {
    const name = fields.name.value.trim();
    if (!fields.pass.value) return setMsg('Escribe la contraseña de admin primero.', 'error');
    if (!name) return setMsg('Escribe el nombre del juego (o un ID de universo válido) primero.', 'error');
    state.pass = fields.pass.value;
    fields.ai.disabled = true;
    setMsg('Gemini está escribiendo…');
    try {
      const { description } = await api('/api/describe', { method: 'POST', body: { name }, admin: true });
      fields.desc.value = description;
      descFromAi = true;
      setMsg('Descripción lista. Puedes editarla antes de publicar.', 'ok');
    } catch (err) {
      setMsg(err.message, 'error');
    } finally {
      fields.ai.disabled = !state.config.aiEnabled;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    state.pass = fields.pass.value;
    fields.submit.disabled = true;
    setMsg('Publicando…');
    try {
      const { script, warning } = await api('/api/scripts', {
        method: 'POST',
        admin: true,
        body: {
          universeId: fields.universe.value.trim(),
          loadstringUrl: fields.url.value.trim(),
          name: fields.name.value.trim(),
          description: fields.desc.value.trim(),
          aiGenerated: descFromAi,
        },
      });
      unlock(state.pass);
      state.scripts.unshift(script);
      render();
      resetForm();
      dialog.close();
      toast(warning || 'Script publicado');
    } catch (err) {
      if (err.status === 401) {
        lock();
        fields.pass.focus();
      }
      setMsg(err.message, 'error');
    } finally {
      fields.submit.disabled = false;
    }
  });

  $('#f-cancel').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  $('#open-upload').addEventListener('click', openDialog);

  /* ------------------------------- inicio ------------------------------ */

  $('#search').addEventListener('input', (event) => {
    state.query = event.target.value;
    render();
  });

  async function init() {
    showSkeleton();
    const [config, list] = await Promise.allSettled([api('/api/config'), api('/api/scripts')]);
    if (config.status === 'fulfilled') state.config = config.value;
    $('#open-upload').hidden = !state.config.adminEnabled;

    if (list.status === 'fulfilled') {
      state.scripts = list.value.scripts;
    } else {
      toast('No pude cargar los scripts. Recarga la página.');
    }

    if (state.pass && state.config.adminEnabled) {
      try {
        await api('/api/auth', { method: 'POST', admin: true });
        state.unlocked = true;
      } catch {
        lock();
      }
    }
    render();
  }

  init();
})();
