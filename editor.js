// Interazioni "da editor" su index.html e progetto.html.
// Per spegnerne una basta mettere false; per spegnerle tutte, togliere <script src="editor.js">.
const EDITOR = {
  resize: true,       // maniglie: titolo della home e frame "lavoro-15" nella scheda
  edit: true,         // doppio clic sui titoli per riscriverli
  inspect: true,      // tasto I o "Ispeziona la pagina" nel footer
  breakpoints: true,  // trascinare "Sei qui" sul righello per vedere la home a quella larghezza
};

(function () {
  const RESET_MS = 2500; // dopo quanto un elemento modificato torna com'era
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  document.head.insertAdjacentHTML('beforeend', `<style>
    [data-resize] > i { cursor: nwse-resize; touch-action: none; }
    [data-resize] > i:nth-of-type(2), [data-resize] > i:nth-of-type(3) { cursor: nesw-resize; }
    [data-resize] > i::before { content: ""; position: absolute; inset: -10px; }
    .settling, .settling > h1, .settling > h2 { transition: width .5s cubic-bezier(.2,.8,.2,1), min-height .5s cubic-bezier(.2,.8,.2,1), font-size .5s cubic-bezier(.2,.8,.2,1); }
    [data-editable] { cursor: text; }
    [data-editable][contenteditable="true"] { outline: none; caret-color: var(--or); }
    .bp-now { cursor: ew-resize; touch-action: none; }
    .bp-now::before { content: ""; position: absolute; inset: -6px -14px; }
    .bp-preview { position: absolute; left: 0; bottom: calc(100% + 64px); height: 300px; background: #000; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; opacity: 0; visibility: hidden; transition: opacity .25s, visibility .25s; z-index: 3; }
    .bp-preview.open { opacity: 1; visibility: visible; }
    .bp-preview iframe { display: block; border: 0; transform-origin: 0 0; pointer-events: none; }
    html.inspecting, html.inspecting * { cursor: crosshair !important; }
    .ins-box { position: fixed; z-index: 200; display: none; pointer-events: none; outline: 1px solid var(--or); }
    .ins-box span, .ins-pill { font-family: var(--pixel); font-size: 16px; line-height: 1; padding: 3px 6px 2px; border-radius: 3px; background: var(--or); color: var(--black); white-space: nowrap; }
    .ins-box span { position: absolute; left: -1px; bottom: calc(100% + 4px); }
    .ins-pill { position: fixed; z-index: 201; left: 50%; top: 88px; transform: translateX(-50%); display: none; }
    html.inspecting .ins-pill { display: block; }
    .ins-panel { position: fixed; z-index: 202; right: 16px; top: 120px; width: min(340px, calc(100vw - 32px)); background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 14px 16px; display: none; cursor: auto !important; }
    .ins-panel.open { display: block; }
    .ins-panel header { display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid var(--line); font-family: var(--pixel); font-size: 18px; text-transform: uppercase; }
    .ins-panel header button { color: var(--muted); font-family: var(--pixel); font-size: 18px; text-transform: uppercase; cursor: pointer !important; }
    .ins-panel dl div { display: grid; grid-template-columns: 72px 1fr; gap: 10px; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,.06); font-size: 13px; }
    .ins-panel dt { font-family: var(--pixel); font-size: 16px; color: var(--muted); }
    .ins-panel dd { word-break: break-word; display: flex; align-items: center; gap: 6px; }
    [data-inspect-toggle] { margin-left: 14px; color: var(--fg); text-decoration: underline; text-underline-offset: 3px; }
    .ins-panel dd i { width: 12px; height: 12px; border-radius: 2px; box-shadow: 0 0 0 1px rgba(255,255,255,.3); flex: none; }
  </style>`);

  // trascinamento con mouse o dito
  function drag(el, h) {
    el.addEventListener('pointerdown', e => {
      if (e.button) return;
      e.preventDefault(); e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* puntatore sintetico: si trascina lo stesso */ }
      const x0 = e.clientX, y0 = e.clientY, c = h.start(e);
      const mv = ev => h.move(ev.clientX - x0, ev.clientY - y0, c, ev);
      const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); h.end(c); };
      el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  }

  // ---------- maniglie ----------
  // data-resize="scale": il titolo cambia corpo (60%-125%); data-resize="box": il frame cambia misure dentro la colonna
  if (EDITOR.resize) document.querySelectorAll('[data-resize]').forEach(box => {
    const scale = box.dataset.resize === 'scale';
    const target = scale ? box.querySelector('h1, h2') : box;
    const label = box.querySelector('[data-size]');
    const original = label ? label.textContent : '';
    const live = label && label.dataset.size !== 'static';
    const show = () => { if (label) label.textContent = `${Math.round(target.offsetWidth)} × ${Math.round(target.offsetHeight)}`; };
    let timer, nat = null;
    const reset = () => {
      box.classList.add('settling');
      if (scale) target.style.removeProperty('--s');
      else if (nat) { box.style.width = nat.w + 'px'; box.style.minHeight = nat.h + 'px'; }
      setTimeout(() => {
        box.classList.remove('settling');
        if (!scale) { box.style.width = ''; box.style.minHeight = ''; nat = null; }
        live ? show() : (label.textContent = original);
      }, 520);
    };
    if (live) { show(); addEventListener('resize', show); document.fonts && document.fonts.ready.then(show); box.addEventListener('input', show); }
    box.querySelectorAll(':scope > i').forEach((h, k) => {
      const sx = k % 2 ? 1 : -1, sy = k < 2 ? -1 : 1; // maniglie in ordine: alto sx, alto dx, basso sx, basso dx
      drag(h, {
        start: () => {
          clearTimeout(timer); box.classList.remove('settling');
          if (!scale && !nat) nat = { w: box.offsetWidth, h: box.offsetHeight };
          return { w: box.offsetWidth, h: box.offsetHeight, s: parseFloat(target.style.getPropertyValue('--s')) || 1, max: box.parentNode.clientWidth, tw: target.offsetWidth, room: box.parentNode.clientWidth + 40 };
        },
        move: (dx, dy, c) => {
          // il titolo cresce solo fino allo spazio libero della colonna (più lo stacco), mai sopra il testo accanto
          if (scale) target.style.setProperty('--s', clamp(c.s * (c.w + dx * sx) / c.w, .6, Math.min(1.25, c.s * c.room / c.tw)));
          else { box.style.width = clamp(c.w + dx * sx * 2, c.max * .5, c.max) + 'px'; box.style.minHeight = clamp(c.h + dy * sy, nat.h, nat.h + 240) + 'px'; }
          show();
        },
        end: () => { timer = setTimeout(reset, RESET_MS); },
      });
    });
  });

  // ---------- testo modificabile ----------
  if (EDITOR.edit) document.querySelectorAll('[data-editable]').forEach(el => {
    const html = el.innerHTML;
    let timer;
    el.title = 'Doppio clic per modificare';
    el.addEventListener('dblclick', () => {
      clearTimeout(timer);
      el.contentEditable = 'true'; el.focus();
      getSelection().selectAllChildren(el);
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); el.blur(); } });
    el.addEventListener('paste', e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); });
    el.addEventListener('blur', () => {
      el.contentEditable = 'false';
      timer = setTimeout(() => { el.innerHTML = html; el.dispatchEvent(new Event('input', { bubbles: true })); }, RESET_MS);
    });
  });

  // ---------- ispeziona ----------
  if (EDITOR.inspect) {
    const box = document.createElement('div'); box.className = 'ins-box'; box.innerHTML = '<span></span>';
    const pill = document.createElement('div'); pill.className = 'ins-pill'; pill.textContent = 'Ispeziona · clicca un elemento · Esc per uscire';
    const panel = document.createElement('aside'); panel.className = 'ins-panel'; panel.setAttribute('aria-live', 'polite');
    document.body.append(box, pill, panel);
    document.querySelectorAll('[data-inspect-toggle]').forEach(b => b.hidden = false); // il bottone compare solo se la funzione è accesa
    let on = false, cur = null;
    const skip = el => !el || !el.closest || el.closest('.ins-panel, .ins-pill') || el === document.body || el === document.documentElement;
    const name = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '');
    const hex = c => {
      const m = c.match(/[\d.]+/g);
      if (!m) return c;
      if (m[3] === '0') return 'trasparente';
      return '#' + m.slice(0, 3).map(v => (+v).toString(16).padStart(2, '0')).join('').toUpperCase() + (m[3] ? ` · ${Math.round(m[3] * 100)}%` : '');
    };
    const frame = () => {
      if (!cur) { box.style.display = 'none'; return; }
      const r = cur.getBoundingClientRect();
      Object.assign(box.style, { display: 'block', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      box.firstChild.textContent = `${name(cur)} · ${Math.round(r.width)} × ${Math.round(r.height)}`;
    };
    const details = el => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      const sw = c => `<i style="background:${c}"></i>${hex(c)}`;
      const rows = [
        ['elemento', name(el)],
        ['misure', `${Math.round(r.width)} × ${Math.round(r.height)}`],
        ['font', `${s.fontFamily.split(',')[0].replace(/["']/g, '')} ${s.fontWeight} · ${parseFloat(s.fontSize)}px`],
        ['colore', sw(s.color)],
        ['sfondo', sw(s.backgroundColor)],
        ['padding', s.padding],
        ['margin', s.margin],
        ['raggio', s.borderRadius],
      ];
      panel.innerHTML = `<header><span>Ispeziona</span><button type="button" data-ins-close>Chiudi</button></header><dl>${rows.map(([k, v]) => `<div><dt>${k}:</dt><dd>${v}</dd></div>`).join('')}</dl>`;
      panel.classList.add('open');
    };
    const toggle = v => {
      on = v === undefined ? !on : v;
      document.documentElement.classList.toggle('inspecting', on);
      if (!on) { cur = null; frame(); panel.classList.remove('open'); }
    };
    document.addEventListener('keydown', e => {
      if (e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]')) return;
      if (e.key === 'i' || e.key === 'I') toggle();
      else if (e.key === 'Escape' && on) toggle(false);
    });
    document.addEventListener('pointerover', e => { if (on && !skip(e.target)) { cur = e.target; frame(); } });
    addEventListener('scroll', () => { if (on) frame(); }, { passive: true });
    // mentre ispezioni, il clic non apre link né pannelli: seleziona l'elemento
    document.addEventListener('click', e => {
      const t = e.target.closest && e.target.closest('[data-inspect-toggle]');
      if (!on) { if (t) { e.preventDefault(); toggle(true); } return; }
      if (e.target.closest('.ins-panel')) { if (e.target.closest('[data-ins-close]')) toggle(false); return; }
      e.preventDefault(); e.stopPropagation();
      if (!skip(e.target)) { cur = e.target; frame(); details(cur); }
    }, true);
  }

  // ---------- righello dei breakpoint con anteprima ----------
  const track = document.querySelector('.bp-track');
  if (EDITOR.breakpoints && track) {
    const now = document.getElementById('bpNow'), label = document.getElementById('bpNowLabel');
    const pv = document.createElement('div'); pv.className = 'bp-preview'; pv.setAttribute('aria-hidden', 'true');
    pv.innerHTML = '<iframe title="Anteprima della home" tabindex="-1"></iframe>';
    track.append(pv);
    const frameEl = pv.firstChild;
    const names = [[390, 'Telefono'], [768, 'Tablet'], [1024, 'Laptop'], [1440, 'Desktop']];
    let timer;
    const set = w => {
      const s = track.clientWidth / 1440;
      now.style.left = w / 1440 * 100 + '%';
      label.textContent = `${w} px · ${(names.find(([b]) => w <= b) || names[3])[1]}`;
      pv.style.width = w * s + 'px';
      Object.assign(frameEl.style, { width: w + 'px', height: 300 / s + 'px', transform: `scale(${s})` });
    };
    drag(now, {
      start: () => {
        clearTimeout(timer);
        if (!frameEl.getAttribute('src')) frameEl.src = 'index.html';
        pv.classList.add('open');
        return { r: track.getBoundingClientRect() };
      },
      move: (dx, dy, c, e) => {
        let w = Math.round(clamp((e.clientX - c.r.left) / c.r.width * 1440, 320, 1440));
        const snap = names.find(([b]) => Math.abs(b - w) < 24); // si aggancia alle soglie
        set(snap ? snap[0] : w);
      },
      end: () => { timer = setTimeout(() => { pv.classList.remove('open'); dispatchEvent(new Event('resize')); }, RESET_MS); },
    });
  }
})();
