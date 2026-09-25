// Campi ASCII presi dal portfolio v2: una griglia di caratteri al posto dei pixel.
// Uso: <canvas class="asc" data-ascii="hot|cold"></canvas> dentro un contenitore posizionato.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CH = ' .-+*^$#@';

  // rampa di colore a più fermate
  function ramp(stops, t) {
    t = t < 0 ? 0 : (t > 1 ? 1 : t);
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0] || i === stops.length - 1) {
        const a = stops[i - 1], b = stops[i];
        const k = Math.min(Math.max((t - a[0]) / ((b[0] - a[0]) || 1), 0), 1);
        return [0, 1, 2].map(j => Math.round(a[1][j] + (b[1][j] - a[1][j]) * k));
      }
    }
    return stops[0][1];
  }
  const RAMP_HOT = [ // dal rosso cupo all'arancio pieno, fino al bianco
    [0.00, [78, 16, 8]], [0.16, [146, 30, 14]], [0.32, [206, 52, 24]], [0.46, [240, 68, 35]],
    [0.60, [252, 118, 50]], [0.72, [255, 158, 96]], [0.86, [246, 204, 170]], [1.00, [234, 234, 230]],
  ];
  const RAMP_COLD = [[0.00, [196, 92, 54]], [0.30, [132, 130, 126]], [1.00, [206, 206, 206]]]; // caldo solo sul bordo

  // masse che si muovono con frequenze diverse e si fondono: la forma non si ripete
  function blobField(st, octx, cols, rows, t, n, gain) {
    if (!st.buf || st.w !== cols || st.h !== rows) {
      st.buf = octx.createImageData(cols, rows); st.w = cols; st.h = rows;
      st.seed = st.seed || Math.random() * 97;
    }
    const tt = t * 0.05 + st.seed, C = [];
    for (let k = 0; k < n; k++) C.push([
      cols * (0.5 + 0.36 * Math.sin(tt * (0.13 + k * 0.041) + k * 2.1)),
      rows * (0.44 + 0.32 * Math.cos(tt * (0.11 + k * 0.033) + k * 1.7)),
      cols * (0.24 + 0.14 * Math.sin(tt * (0.07 + k * 0.019) + k)),
    ]);
    const d = st.buf.data;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let v = 0;
      for (const c of C) {
        const dx = x - c[0], dy = (y - c[1]) * 1.62, r = c[2] || 1; // celle più alte che larghe
        v += 1 / (1 + (dx * dx + dy * dy) / (r * r));
      }
      v = Math.min(v * gain + 0.10, 1); // base diffusa: la griglia non resta vuota
      const i = (y * cols + x) * 4, g = v * 255 | 0;
      d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = 255;
    }
    octx.putImageData(st.buf, 0, 0);
  }

  // sorgente ridisegnata a ogni fotogramma, rumore leggero che cambia carattere alle celle
  function asciiCanvas(cv, source, tint, opts) {
    const ctx = cv.getContext('2d'), box = cv.parentNode;
    const off = document.createElement('canvas'), octx = off.getContext('2d', { willReadFrequently: true });
    let cols = 0, cw = 0, chh = 0, rowsN = 0, W = 0, H = 0;
    function measure() {
      W = box.clientWidth; H = box.clientHeight;
      if (!W || !H) return false;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = W < 700 ? 58 : 112; cw = W / cols; chh = cw * 1.62;
      rowsN = Math.ceil(H / chh) + 1;
      off.width = cols; off.height = rowsN;
      ctx.font = Math.round(cw * 1.42) + 'px ui-monospace, Menlo, monospace';
      ctx.textBaseline = 'top';
      return true;
    }
    function draw(t) {
      if (!cols && !measure()) return;
      source(octx, cols, rowsN, t);
      const data = octx.getImageData(0, 0, cols, rowsN).data;
      ctx.clearRect(0, 0, W, H);
      for (let y = 0; y < rowsN; y++) for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        let lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
        if (lum < 0.035) continue;
        if (opts.lift) lum = Math.pow(lum, opts.lift); // alza i mezzitoni: griglia piena
        const n = Math.sin(x * 12.9898 + y * 7.233 + t * 0.55) * 0.5 + 0.5;
        const q = Math.min(Math.max(0.18 + lum * 0.82 + (n - 0.5) * 0.11, 0), 1);
        ctx.fillStyle = tint(x / cols, y / rowsN, lum);
        ctx.fillText(CH[Math.round(q * (CH.length - 1))], x * cw, y * chh);
      }
    }
    let t = 0, vis = false, last = 0;
    new IntersectionObserver(e => { vis = e[0].isIntersecting; }, { threshold: 0.01 }).observe(box);
    function loop(ts) {
      requestAnimationFrame(loop);
      if (!vis || ts - last < opts.interval) return;
      last = ts; draw(++t);
    }
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); draw(t); }, 200); });
    measure(); draw(0);
    if (!reduce) requestAnimationFrame(loop);
  }

  // hot: bagliore arancione con venature che scendono; cold: grigio, quasi fermo
  const kinds = {
    hot: st => [(octx, cols, rows, t) => {
      blobField(st, octx, cols, rows, t, 5, 0.82);
      octx.globalAlpha = .38;
      for (let i = 0; i < 22; i++) { octx.fillStyle = i % 3 ? '#242424' : '#8a8a8a'; octx.fillRect(0, ((i / 22) * rows + t * 0.45) % rows, cols, 1 + (i % 2)); }
      octx.globalAlpha = 1;
    }, (xr, yr, lum) => { const c = ramp(RAMP_HOT, xr * 0.34 + lum * 0.66); return `rgba(${c},${0.14 + lum * 0.7})`; }, { interval: 70, lift: 0.72 }],
    cold: st => [(octx, cols, rows, t) => {
      blobField(st, octx, cols, rows, t, 3, 0.66);
      octx.globalAlpha = .5;
      for (let i = 0; i < 26; i++) { octx.fillStyle = i % 2 ? '#333' : '#aaa'; octx.fillRect(0, ((Math.sin(i * 3.7 + t * 0.05) * 0.5 + 0.5) * rows + t * 0.4) % rows, cols, 1 + (i % 3)); }
      octx.globalAlpha = 1;
    }, (xr, yr, lum) => { const c = ramp(RAMP_COLD, xr * 0.9 + lum * 0.1); return `rgba(${c},${0.06 + lum * 0.22})`; }, { interval: 60 }],
  };
  document.querySelectorAll('canvas[data-ascii]').forEach(cv => {
    const [src, tint, opts] = kinds[cv.dataset.ascii]({});
    asciiCanvas(cv, src, tint, opts);
  });
})();
