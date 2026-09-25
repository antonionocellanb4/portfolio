// dati condivisi tra home (index.html) e scheda (progetto.html), presi dal portfolio v2.
// Per mostrare "Apri il sito" su un lavoro aggiungere url: 'https://...'.
// Per una foto con nome o formato diverso da assets/lavori/<id>.webp aggiungere img: 'assets/lavori/...'.
// I primi cinque dell'elenco sono quelli in vetrina in home.
const works = [
  { n: 'Blackshape',              t: ['Web', 'Aeronautica'],    id: '14' },
  { n: 'Build Impact Group',      t: ['Web', 'Costruzioni'],    id: '13' },
  { n: 'Lopera Group',            t: ['Web', 'Corporate'],      id: '12' },
  { n: 'ILMA',                    t: ['Web', 'Costruzioni'],    id: '11' },
  { n: 'Manelli',                 t: ['Web', 'Infrastrutture'], id: '10' },
  { n: 'MyCityBari',              t: ['Web', 'Immobiliare'],    id: '09' },
  { n: 'Masseria Mongio',         t: ['Web', 'Booking'],        id: '08' },
  { n: 'Myra Bari',               t: ['Web', 'Ospitalità'],     id: '07' },
  { n: 'San Domenico Estate',     t: ['Web', 'Vino'],           id: '06' },
  { n: 'Rossi',                   t: ['Web', 'Retail'],         id: '05' },
  { n: 'Assoricambi',             t: ['Web', 'Automotive'],     id: '04' },
  { n: 'Planetario delle Grotte', t: ['Web', '3D'],             id: '03' },
  { n: 'Logilift',                t: ['Shop', 'Industria'],     id: '02' },
  { n: 'la Ruggente',             t: ['Web', 'Moda'],           id: '01' },
];
const services = [
  ['Website design',   'Siti aziendali disegnati e sviluppati dalla stessa mano, su WordPress o scritti a mano.', ['HTML','CSS','JavaScript','jQuery','PHP','WordPress','MySQL']],
  ['Product design',   'Il prodotto raccontato online: schede, configuratori 3D, modelli che si guardano in AR.',  ['Model Viewer','glTF','GLB','AR','Canvas','WebGL']],
  ['UI/Visual design', 'Griglie, tipografia e colore: la parte visiva che tiene insieme tutto il resto.',         ['Griglie','Tipografia','Colore','Photoshop','Adobe CS','Responsive']],
];
const workType = w => w.t[0] === 'Shop' ? 'E-commerce' : 'Sito web';
const workUrl = w => `progetto.html?id=${w.id}`;

// Foto del lavoro: di base assets/lavori/<id>.webp (basta copiare lì il file), oppure img: '...' sul lavoro.
// Se il file non c'è, l'immagine si toglie da sola e resta il riquadro grigio con l'etichetta.
const workPic = (w, alt = w.n) => `<img src="${w.img || `assets/lavori/${w.id}.webp`}" alt="${alt}" loading="lazy" onerror="this.remove()">`;
