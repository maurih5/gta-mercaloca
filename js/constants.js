/* =========================================================================
   GTA MERCALOCA - Constantes y Configuración General
   ========================================================================= */

// Solo para correr local: la versión publicada sale de los tags y la inyecta el build
// (.github/scripts/armar-sitio.sh), igual que los ?v= de index.html.
const VERSION = 'local';

const CREW = [
  // hp y spd (multiplicador de velocidad a pie) son las stats propias de cada uno
  // crop: [x, y, ancho, alto] de la cara en la foto (de la frente o la gorra al mentón)
  {id:'p1', name:'EL MORO',          img:'img/p1.jpeg',   crop:[0.43,0.13,0.22,0.25],  shirt:'#3f9a4a', pants:'#232323', hp:100, spd:1},
  {id:'p2', name:'EL IVO',           img:'img/p2.jpeg',   crop:[0.41,0.10,0.16,0.11],  shirt:'#1d1d22', pants:'#2a2a33', hp:90, spd:1.08},
  {id:'p3', name:'EL CIEGO AUGUSTO', img:'img/p3.jpeg',   crop:[0.38,0.045,0.17,0.115], shirt:'#26262c', pants:'#3a3f4a', hp:120, spd:0.92},
  {id:'p4', name:'EL KEVIN',         img:'img/p4.jpeg',   crop:[0.43,0.19,0.22,0.19],  shirt:'#4a4238', pants:'#1c1c1c', hp:110, spd:0.96},
  {id:'p5', name:'EL ALEXIS',        img:'img/p5.jpeg',   crop:[0.575,0.18,0.18,0.15], shirt:'#e8e8e0', pants:'#242424', hp:85, spd:1.1},
  {id:'p6', name:'EL GER',           img:'img/crew.jpeg', crop:[0.42,0.10,0.24,0.29],  shirt:'#3a7d3c', pants:'#2a2a2a', hp:100, spd:1},
];

const TIPS = [
  'Consejo: Manten la calma y apunta con precision. Cada disparo cuenta.',
  'Consejo: Robar un auto sube tu nivel de busqueda. Perdelos en los callejones.',
  'Consejo: Los fajos verdes son guita. Juntalos antes que la yuta.',
  'Consejo: De noche los faros te delatan, pero sin luz no ves un pomo.',
  'Consejo: Si la yuta te encajona el auto, acelera. Si frenas, preso.',
  'Consejo: El barrio es de Mercaloca. Que no te lo saquen.',
];

// Resolucion interna y proyeccion de falso 3D
const RW = 480, RH = 270;
// El canvas tiene el doble de píxeles reales que la resolución lógica: todo se sigue
// dibujando en la grilla de 480x270 (los px() caen en bloques de 2x2), pero las caras
// de los personajes usan esos píxeles extra para verse con el doble de definición.
const RENDER_SCALE = 2;
const FACE_PX = 12 * RENDER_SCALE;      // lado de la foto de la cara, en píxeles reales (la cabeza mide 12)
const FOCAL = 300;                      // menor = mas perspectiva en la extrusion

// Geometria del mundo y grilla
const CELL = 190, ROAD = 56, SIDEWALK = 10;
const GRID = 24, WORLD_W = CELL * GRID, WORLD_H = CELL * GRID;
const MARGIN = 8;

// Avenida central (9 de Julio): fila/columna de la grilla que pasa por la plaza,
// mucho mas ancha que una calle comun, 2 carriles por sentido
const AVENUE_ROAD = 108;
const AVENUE_LANE = AVENUE_ROAD * 0.24;

// Carriles, medidos desde el eje de la calle. La vereda ocupa SIDEWALK px de cada
// borde de la franja, así que el asfalto de cada mano va de la raya del medio al cordón
// y el auto va centrado ahí (pegado al cordón, los anchos se subían a la vereda).
const LANE_OFF = (ROAD / 2 - SIDEWALK) / 2 + 0.5;
// Avenida: medio cantero, cordón, la raya entre los dos carriles de cada mano y el
// centro de cada carril (0 el de adentro, 1 el de la vereda)
const AVE_MEDIAN = AVENUE_LANE * 0.85 / 2;
const AVE_CURB = AVENUE_ROAD / 2 - SIDEWALK;
const AVE_DIVIDER = (AVE_MEDIAN + AVE_CURB) / 2;
const AVE_LANES = [(AVE_MEDIAN + AVE_DIVIDER) / 2, (AVE_DIVIDER + AVE_CURB) / 2];

// Rotonda del obelisco: radio del anillo de circulacion y de la isla peatonal central
const ROTONDA_R = 58;
const ROTONDA_ISLAND_R = 26;

// Riachuelo: ancho base del cauce. El ancho real varia a lo largo de la curva
// (RIVER_WOBBLE) para que la orilla muerda las manzanas en vez de cortarlas en
// cuadrados de grilla, y se abre en la desembocadura.
const RIVER_HALF = CELL * 0.5;
const RIVER_WOBBLE = 0.24;
// Ancho base de la franja de arena que rodea todo el cauce (varia por tramo y se
// hace un playon en la desembocadura)
const BEACH_BAND = 30;
// Agua del Riachuelo: paleta de la orilla (verdosa, baja) al centro (hondo), espuma
// contra la costa, barro humedo y su ancho, y el color en el minimapa
const WATER_PAL = ['#7ea68c', '#64947f', '#4f8079', '#426f72', '#385f68', '#2f505d'];
const WATER_FOAM = '#c3d5c4';
const WATER_MUD = '#6f6449';
const WATER_MUD_W = 9;
const WATER_MINI = '#3f6f73';
// Lo que navega el rio: tipo, velocidad (px/s), sentido (1 = aguas abajo), fase
// inicial (fraccion del largo) y carril (fraccion del medio ancho, a la derecha
// de la marcha). La posicion es funcion de G.t: igual para todos los jugadores.
const RIVER_BOATS = [
  { k: 'barcaza', v: 9, dir: 1, ph: 0.08, lane: 0.22 },
  { k: 'remolcador', v: 15, dir: -1, ph: 0.47, lane: 0.3 },
  { k: 'lancha', v: 44, dir: 1, ph: 0.31, lane: 0.4 },
  { k: 'lancha', v: 38, dir: -1, ph: 0.76, lane: 0.42 },
  { k: 'bote', v: 6, dir: 1, ph: 0.62, lane: 0.5 },
  { k: 'bote', v: 5, dir: -1, ph: 0.19, lane: 0.48 },
  { k: 'remolcador', v: 13, dir: 1, ph: 0.88, lane: 0.18 },
  { k: 'barcaza', v: 8, dir: -1, ph: 0.55, lane: 0.25 },
];
// Camalotes, basura y patos que van a la deriva con la corriente
const RIVER_FLOATS = 70;

// Puentes: cuantos hay en total (las dos avenidas y el resto en calles comunes)
const BRIDGE_COUNT = 7;
// Estilos de puente, cada uno con su personalidad. k: tipo de estructura; steel: color
// del hierro (o del hormigon); dark: la cara en sombra; HT: alto del reticulado.
const BRIDGE_STYLES = {
  // 9 de Julio (columna): atirantado blanco de un mastil inclinado, onda Puente de la Mujer
  mujer:         { k: 'atirantado',    steel: '#eceee8', dark: '#b7bab4', walk: '#b4b1a8' },
  // Avenida de la plaza (fila): reticulado verde con vigas en X, onda Puente Pueyrredon
  pueyrredon:    { k: 'reticulado',    steel: '#4a8a5a', dark: '#2f5c3c', walk: '#a39f95', HT: 20 },
  // Calles comunes: reticulados bajos pintados, de hormigon con faroles, y el Transbordador
  boca:          { k: 'reticulado',    steel: '#d0582e', dark: '#8a3820', walk: '#a39f95', HT: 13 },
  celeste:       { k: 'reticulado',    steel: '#78b4d4', dark: '#4a7f9c', walk: '#a8a59b', HT: 13 },
  hormigon:      { k: 'hormigon',      steel: '#c9c2b2', dark: '#8f887a', walk: '#b3ad9f' },
  transbordador: { k: 'transbordador', steel: '#46525e', dark: '#2c343c', walk: '#a39f95' },
};
// Las calles comunes van rotando estos estilos a lo largo del rio; el Transbordador va
// en la calle horizontal mas cercana a la desembocadura (donde esta La Boca).
const BRIDGE_STREET_STYLES = ['celeste', 'hormigon', 'boca'];
const BRIDGE_PIER_GAP = 58;   // separacion de las pilas en el agua
const BRIDGE_LAMP_GAP = 64;   // separacion de los faroles sobre el puente

// Playa: cada cuanto (en px de rio) se arma un grupito de cosas en la arena, y cuanto
// lugar se deja libre alrededor del corredor de cada puente (las palmeras mas, porque
// su copa se extruye lejos del tronco y tapaba el tablero)
const BEACH_GROUP_STEP = 52;
const BEACH_BRIDGE_CLEAR = 20;
const BEACH_PALM_CLEAR = 34;

// Plaza de Mayo: explanada maciza de 2x2 celdas, sin calles cruzandola
const PLAZA_MAYO_CELLS = 2;

// Casa Rosada: cantidad de guardias fijos en la puerta
const CASA_ROSADA_GUARDS = 3;

// Mapa global (tecla M): rango y velocidad de zoom
const MAP_MIN_ZOOM = 1, MAP_MAX_ZOOM = 8, MAP_ZOOM_RATE = 1.6;
const MAP_PAN_RATE = 0.9;  // con las flechas, cuántas pantallas de mapa por segundo
const MAP_LEG_W = 112;     // ancho del panel de referencias

// Semaforos
const LIGHT_CYCLE = 11, GREEN = 4.6, AMBER = 0.9;  // por eje: 4.6s verde, 0.9 amarillo, resto rojo

// Hospitales: cuanto tarda en curarte la secuencia al entrar
const HOSPITAL_TIME = 3.2;

// Items de curacion desperdigados por el mapa: cuanta vida da cada uno
const FOOD_HEAL = { pernil: 45, choripan: 30, mate: 15, chocolate: 20 };
const FOODS = Object.keys(FOOD_HEAL);

// Famosos: NPCs con nombre (parodias) que aparecen cada tanto cerca de algún jugador,
// pasean un rato y se van. Cada uno tiene su cara (look), sus frases y lo que suelta.
//  near: lo que dice cuando un jugador se le acerca; hurt: cuando le pegan
//  immortal: no se lo puede bajar; drop: lo que suelta al caer; stripes: rayas de la camiseta
const FAMOUS = [
  {
    id: 'listorti', name: 'JOSE MARIA LISTORTO', immortal: true, hp: 30,
    shirt: '#2b2f3a', pants: '#1a1a1f', spd: 26,
    look: { skin: '#e2b896', hair: '#2a1d12', hairStyle: 'corto', smile: true },
    near: ['¿QUE HACES, CAPO?', 'JA JA JA JA', 'MIRA LA CAMARA, SALUDA'],
    hurt: ['OOOOOOOOOOH!', 'OOOOOOOOOOOH!', 'OOOOOOOOOOH! JA JA'],
  },
  {
    id: 'messi', name: 'LIONEL MESSIAS', hp: 60,
    shirt: '#75aadb', pants: '#1a1a1a', stripes: '#ffffff', spd: 34,
    look: { skin: '#d9a87f', hair: '#4a2f1c', hairStyle: 'corto', beard: '#4a2f1c' },
    near: ['¿QUE MIRAS, BOBO?', 'ANDA PA ALLA, BOBO', 'ANDA PA ALLA'],
    hurt: ['¿QUE MIRAS, BOBO?', 'BOBO!'],
    drop: { kind: 'gold', n: 5, value: 400 },
  },
  {
    id: 'maradona', name: 'DIEGO ARMANDO MERCADONA', hp: 70,
    shirt: '#75aadb', pants: '#ffffff', stripes: '#ffffff', spd: 32,
    look: { skin: '#c98962', hair: '#18120d', hairStyle: 'rulos', beard: '#18120d', smile: true },
    near: ['LA PELOTA NO SE MANCHA', 'SE TE ESCAPO LA TORTUGA', 'YO ME EQUIVOQUE Y PAGUE'],
    hurt: ['¿QUE HACES, NABO?', 'ME CORTARON LAS PIERNAS'],
    drop: { kind: 'merca', n: 4, value: 300 },
  },
  {
    // heli: vuela en helicóptero sobre los edificios, dando vueltas arriba del jugador
    id: 'gaspi', name: 'GASPI EN VIVO', heli: true, hp: 90,
    shirt: '#d23a3a', pants: '#2a2d36', spd: 70,
    look: { skin: '#e2b896', hair: '#6a4a2a', hairStyle: 'corto', smile: true, cap: '#18181c', shades: true },
    near: ['SALUDOS AL CHAT', 'MIREN ESTE NABO, CHAT', 'DONEN, MANGA DE RATAS', 'ACTIVEN LAS NOTIS',
      'SE VIENE EL SORTEO', 'ESTO ES CONTENIDO, CHAT'],
    hurt: ['ME ESTAN TIRANDO, CHAT!', 'CLIPEALO, CLIPEALO', 'BANEENLO YA', 'MODS! MODS!'],
    drop: { kind: 'cash', n: 6, value: 250 },
  },
  {
    // beach: solo nace en la arena
    id: 'fort', name: 'RICARDO FORTE', beach: true, hp: 60,
    shirt: '#ff7ab8', pants: '#f4f4f4', spd: 30,
    look: { skin: '#e2b896', hair: '#e8c860', hairStyle: 'corto', smile: true, shades: true },
    near: ['¡MAIAMEEE!', 'ESTO ES MAIAMEEE, BEBE', 'TODO ES PLATINO, MI AMOR', 'TRAIGAN OTRO CHOCOLATE'],
    hurt: ['¡MAIAMEEE!', 'MI CIRUJANO SE ENTERA', 'AY, EL BRONCEADO!'],
    drop: { kind: 'hp', food: 'chocolate', n: 5 },
  },
  {
    // trail: color RGB del rastro de partículas que deja al caminar
    id: 'conductor', name: 'MARCELO TINELI-BOCHA', hp: 60, trail: '255,80,200',
    shirt: '#7a1fa2', pants: '#1a1a24', spd: 30,
    look: { skin: '#e2b896', hair: '#3a2a1a', hairStyle: 'corto', smile: true, shades: true },
    near: ['BIENVENIDOS AL PROGRAMA!', 'VOLVEMOS DESPUES DE LA TANDA', 'NO SE VAYAN, QUEDA LO MEJOR', 'APLAUSOS PARA EL PUBLICO'],
    hurt: ['CORTE, CORTE!', 'ESTO NO ESTABA EN EL GUION', 'VOLVEMOS EN UN MOMENTO'],
    drop: { kind: 'cash', n: 5, value: 200 },
  },
];
const FAMOUS_EVERY = [40, 80];          // cada cuánto (s, al azar) puede aparecer uno cerca de cada jugador
const CORRALITO_EVERY = [240, 480];   // cada cuánto (s, al azar) el gobierno se queda con la mitad de la plata del banco
const EVENT_EVERY = [90, 180];        // cada cuánto (s, al azar) el mundo intenta disparar un evento aleatorio registrado
const FESTEJO_TIME = 120;             // segundos que dura el festejo del Mundial en el Obelisco
const FESTEJO_PEDS = 26;              // cuánta gente junta (cerca de algún jugador)
const FESTEJO_CUT = ROTONDA_R + 22;   // radio (desde el obelisco) que queda cortado al tránsito
const CORRALITO_MIN = 100;            // plata mínima en el banco para que valga el corralito
const FAMOUS_LIFE = 150;                // segundos que pasea antes de irse (cuando nadie lo ve)
const FAMOUS_TALK = 34;                 // distancia a la que te habla

// Poblacion viva y radios de simulacion
const SIM_R = 560;                       // radio de simulacion
const PED_TARGET = 58, CAR_TARGET = 46;  // poblacion viva alrededor del jugador
const OFFSCREEN = 300;                   // mas alla de esto ya no se ve

// Ciclo dia/noche (3 min por dia)
const DAY = 240;
// t=0 medianoche, 0.25 amanecer, 0.5 mediodia, 0.75 atardecer
const SKY = [
  [0.00,'#4a5680'],[0.18,'#4e5b86'],[0.24,'#8a6e86'],[0.28,'#e0895f'],
  [0.33,'#ffc98e'],[0.40,'#fff0d2'],[0.50,'#ffffff'],[0.62,'#fff4dd'],
  [0.70,'#ffcb8e'],[0.76,'#f08a55'],[0.82,'#7d5f84'],[0.88,'#525e8a'],[1.00,'#4a5680'],
];

// Tipos de edificios: paredes, techo y que detalles lleva
const BTYPE = [
  {k:'casa',   cols:['#b08a62','#c49a6c','#9e7b58','#caa77c'], roof:'#8c4a35', detail:'tejas'},
  {k:'casa',   cols:['#a8b0a0','#c2c8b8','#93a08e','#d2d6c6'], roof:'#6d7a6a', detail:'tejas'},
  {k:'local',  cols:['#c8c2b0','#d8d2be','#b0aa98','#e2dcc8'], roof:'#8e8878', detail:'ac'},
  {k:'local',  cols:['#8fb0c4','#a6c4d6','#7a99ac','#bcd6e4'], roof:'#6a8494', detail:'ac'},
  {k:'torre',  cols:['#6e7686','#7e8696','#5e6676','#8e96a6'], roof:'#4a5260', detail:'helipuerto'},
  {k:'torre',  cols:['#5a6a72','#6a7a82','#4a5a62','#7a8a92'], roof:'#3e4a50', detail:'helipuerto'},
  {k:'galpon', cols:['#8a7460','#9a8470','#7a6450','#aa9480'], roof:'#6b5a48', detail:'tanque'},
  {k:'ladri',  cols:['#a05a48','#b06a54','#8e4c3c','#c07a60'], roof:'#7a4436', detail:'tanque'},
];

// Tipos de peaton: cambian ropa, velocidad y como reaccionan
const PEDTYPE = [
  {k:'vecino',  shirt:'#4a7ab0', pants:'#2b3340', spd:24, panic:1.0},
  {k:'vecino',  shirt:'#b05a4a', pants:'#33302b', spd:22, panic:1.0},
  {k:'pibe',    shirt:'#d8c64a', pants:'#2f3a4a', spd:32, panic:1.3},
  {k:'obrero',  shirt:'#e08a2a', pants:'#4a4a3a', spd:20, panic:0.8},
  {k:'runner',  shirt:'#e8e8e8', pants:'#2a2a2a', spd:44, panic:1.4},
  {k:'abuelo',  shirt:'#8a8a7a', pants:'#4a443a', spd:13, panic:0.5},
  {k:'gorra',   shirt:'#3f9a4a', pants:'#232323', spd:27, panic:1.1},
];

// Autos: paleta de colores y modelos
const CARCOL = ['#2f6b3c','#7a1f1f','#1f3f7a','#b4b4bc','#c9a227','#20242b','#6a3f8f','#c85a1e','#1d6b6b'];

const CARMODEL = [
  {k:'sedan',  w:23, h:11, cruise:62},
  {k:'sedan',  w:23, h:11, cruise:58},
  {k:'compac', w:19, h:10, cruise:68},
  {k:'pickup', w:26, h:12, cruise:52},
  {k:'van',    w:28, h:13, cruise:46},
  {k:'deport', w:22, h:10, cruise:88},
  {k:'taxi',   w:23, h:11, cruise:64, col:'#e8b52a'},
  {k:'bus',    w:36, h:14, cruise:38, col:'#c85a1e'},
];

// Armas: daño por bala, cadencia (cool), dispersión, perdigones, velocidad y alcance de la bala
const WEAPONS = {
  baston:   {name:'BASTON DEL CIEGO', short:'BASTON',  melee:true,  dmg:38, cool:0.42, reach:19},
  pistola:  {name:'PISTOLA 9MM',      short:'9MM',     dmg:22, cool:0.21,  spread:0.055, pellets:1, spd:430, life:0.70, shake:1.1, barrel:11},
  escopeta: {name:'ESCOPETA',         short:'ESCOPETA',dmg:15, cool:0.75,  spread:0.30,  pellets:6, spd:390, life:0.34, shake:3.2, barrel:14},
  uzi:      {name:'UZI',              short:'UZI',     dmg:12, cool:0.075, spread:0.14,  pellets:1, spd:450, life:0.55, shake:0.6, barrel:12},
  ak:       {name:'AK-47',            short:'AK-47',   dmg:30, cool:0.115, spread:0.05,  pellets:1, spd:540, life:0.90, shake:1.5, barrel:14},
  granada:  {name:'GRANADAS',         short:'GRANADA', thrown:true, dmg:110, cool:0.7, radius:42},
};
const WEAPON_ORDER = ['baston', 'pistola', 'escopeta', 'uzi', 'ak', 'granada'];

// Lo que vende la armeria: precio del fierro (viene con balas) y precio de la recarga
const SHOP_ITEMS = [
  {id:'baston',   price:300,                          desc:'El verde del Ciego Augusto. Pega fuerte.'},
  {id:'escopeta', price:900,  ammo:16,  refill:250,   desc:'Seis perdigones. Pa los de cerca.'},
  {id:'uzi',      price:1400, ammo:120, refill:300,   desc:'Escupe balas. Ideal desde el auto.'},
  {id:'ak',       price:2600, ammo:90,  refill:450,   desc:'La que manda. Pega y llega lejos.'},
  {id:'granada',  price:700,  ammo:4,   refill:450,   desc:'Revienta autos y patrulleros.'},
  {id:'chaleco',  price:500,                          desc:'Chaleco antibalas. Aguanta la yuta.'},
];

// Banco: lo que está adentro (P.bank) no se pierde al morir ni al caer en cana.
// Cada fila mueve hasta esa plata (dep > 0 deposita, < 0 saca; Infinity es todo).
const BANK_ITEMS = [
  {id:'dep100',  name:'DEPOSITAR $100',   dep:100,       desc:'Depositar $100.'},
  {id:'dep1000', name:'DEPOSITAR $1000',  dep:1000,      desc:'Depositar $1000.'},
  {id:'depall',  name:'DEPOSITAR TODO',   dep:Infinity,  desc:'Depositar toda la guita que llevas encima.'},
  {id:'ret100',  name:'SACAR $100',       dep:-100,      desc:'Sacar $100.'},
  {id:'ret1000', name:'SACAR $1000',      dep:-1000,     desc:'Sacar $1000.'},
  {id:'retall',  name:'SACAR TODO',       dep:-Infinity, desc:'Sacar todo lo que tenes en el banco.'},
];

// Fierros tirados en la calle: arma, balas que trae y peso del sorteo
const LOOT = [
  {id:'escopeta', ammo:8,  w:3},
  {id:'uzi',      ammo:45, w:3},
  {id:'ak',       ammo:30, w:2},
  {id:'granada',  ammo:2,  w:2},
  {id:'baston',   ammo:0,  w:1},
];

// Villas: zonas del mapa (rango de celdas de la grilla, inclusive) con casillas, calles de tierra y tranzas.
// La yuta a pie no entra y la busqueda baja mas rapido adentro. `potrero` es la celda de la canchita.
const VILLAS = [
  {name:'VILLA LA CHAPITA', cx0:1,  cy0:16, cx1:4,  cy1:19, tranzas:6, potrero:[2, 17]},
  {name:'VILLA EL FIERRO',  cx0:17, cy0:2,  cx1:20, cy1:5,  tranzas:6, potrero:[19, 3]},
];

// Casillas: paredes de ladrillo sin revocar, bloque o pintadas; techos de chapa o losa
const SHACK_WALLS = ['#a5583a','#b4653f','#9a4e32','#8a8a80','#9a968a','#5f8aa8','#c9b458','#7aa36a','#c87a8a','#d8d0c0'];
const SHACK_ROOFS = ['#8a9098','#7a8088','#9aa0a6','#8a5a3a','#7a4a30','#9a958a'];

// Ropa de los tranzas
const TRANZA_LOOK = [
  {shirt:'#2a2a30', pants:'#1c1c22', cap:'#c8302a'},
  {shirt:'#3a3a5a', pants:'#22222a', cap:'#1a1a1a'},
  {shirt:'#e8e8e0', pants:'#1c1c22', cap:'#2a5ab0'},
  {shirt:'#5a2a2a', pants:'#2a2a2a', cap:'#e8e8e8'},
];

// Lo que vende el tranza: atiende aunque te busque la yuta, pero mas caro
const TRANZA_ITEMS = [
  {id:'porro',   price:80,                         desc:'Te baja un cambio: el mundo va en camara lenta. Tecla F.'},
  {id:'uzi',     price:1100, ammo:60, refill:250,  desc:'Usada, pero anda. Sin preguntas.'},
  {id:'granada', price:950,  ammo:3,  refill:600,  desc:'Del deposito del fondo. No preguntes de donde.'},
];
// Hambre y sed, por jugador: 100 es lleno. Bajan solas (por segundo de juego); en 0 te
// vas muriendo de a poco. Bien comido y tomado (las dos arriba de NEED_GOOD), la vida
// sube sola. Lo que se compra va a la mochila (BAG_MAX cosas) y se come con C.
const HUNGER_RATE = 100 / 420;  // 7 minutos de lleno a vacío
const THIRST_RATE = 100 / 300;  // 5 minutos
const NEED_LOW = 25;            // aviso y barra titilando
const NEED_GOOD = 70;
const NEED_HURT = 1.2;          // vida por segundo con hambre o sed en 0
const NEED_REGEN = 0.5;         // vida por segundo bien comido
const BAG_MAX = 6;
// Lo que se come o se toma: cuánto llena (food), cuánto saca la sed (drink) y cuánto cura
const FOOD = {
  carne:      { food: 60, drink: 0,  heal: 30 },
  pernil:     { food: 45, drink: 0,  heal: 20 },
  choripan:   { food: 35, drink: 0,  heal: 15 },
  fideos:     { food: 40, drink: 0,  heal: 10 },
  galletitas: { food: 20, drink: 0,  heal: 5 },
  mate:       { food: 0,  drink: 30, heal: 10 },
  chocolate:  { food: 10, drink: 0,  heal: 20 },
  agua:       { food: 0,  drink: 50, heal: 0 },
  gaseosa:    { food: 5,  drink: 35, heal: 0 },
  asado:      { food: 100, drink: 0, heal: 60 }, // sacado a punto
  crudo:      { food: 35, drink: 0,  heal: 5 },
  quemado:    { food: 30, drink: 0,  heal: 5 },
};
// Lo que entra en la mochila: lo que se come y el carbón para el asado
const inBag = id => !!FOOD[id] || id === 'carbon';

// Asado: en las parrillas de las plazas, con carne y carbón de la mochila (E). Se saca
// con E de a una porción: antes de ASADO_PUNTO segundos sale crudo, hasta ASADO_QUEMA a
// punto y después quemado; pasado ASADO_CARBON se hace carbón y no queda nada. Las
// porciones se las lleva cualquiera que esté en la parrilla: si te descuidás, te lo comen.
const ASADO_PUNTO = 25;
const ASADO_QUEMA = 45;
const ASADO_CARBON = 75;
const ASADO_PORCIONES = 3;
const GRILL_R = 18;

const FOOD_NAME = { carne: 'UN VACIO', pernil: 'UN PERNIL', choripan: 'UN CHORI', fideos: 'UNOS FIDEOS',
  galletitas: 'UNAS CRIOLLITAS', mate: 'UNOS MATES', agua: 'UN AGUA', gaseosa: 'UNA CHOCA-COLA',
  chocolate: 'UN CHOCOLATE', asado: 'UN ASADO A PUNTO', crudo: 'UN ASADO CRUDO', quemado: 'UN ASADO QUEMADO' };

// Supermercados: lo que se compra va a la mochila. El CHOTO tiene carne; el NOCHE % es
// más barato y no tiene. El CHOTO de Lanús vende lo mismo que el CHOTO, pero la carne
// nunca llega (out).
const CHOTO_ITEMS = [
  {id:'carne',    price:260, desc:'Vacio del bueno. Para la parrilla o pa morfar ya.'},
  {id:'pernil',   price:180, desc:'Pernil de cumpleanos. Sin el cumpleanos.'},
  {id:'choripan', price:120, desc:'Chori con chimi. El del CHOTO, no el de la cancha.'},
  {id:'mate',     price:60,  desc:'Yerba, termo y bombilla. Saca la sed y te levanta.'},
  {id:'agua',     price:40,  desc:'Agua mineral. La de la canilla no la tomes.'},
  {id:'gaseosa',  price:70,  desc:'Choca-Cola de dos litros y cuarto. Caliente.'},
  {id:'carbon',   price:90,  desc:'Bolsa de carbon. Con carne, a la parrilla de la plaza.'},
];
const NOCHE_ITEMS = [
  {id:'fideos',     price:70, desc:'Monitos con manteca. Carne no hay, nunca hubo.'},
  {id:'galletitas', price:40, desc:'Paquete de criollitas, la mitad rotas.'},
  {id:'mate',       price:35, desc:'Yerba de marca propia. Tiene palos.'},
  {id:'agua',       price:25, desc:'Agua marca NOCHE. Sabe a agua, por suerte.'},
  {id:'gaseosa',    price:45, desc:'Cola marca NOCHE. Sin gas desde el 2019.'},
  {id:'carbon',     price:60, desc:'Carbon humedo. Prende, pero cuesta.'},
];
const LANUS_ITEMS = [
  {id:'carne',    price:260, out:true, desc:'HOY NO HAY CARNE. Ayer tampoco.'},
  {id:'pernil',   price:180, desc:'El ultimo que quedaba. Tiene una mordida.'},
  {id:'choripan', price:120, desc:'Lo hace el de seguridad en la puerta.'},
  {id:'mate',     price:60,  desc:'Lo tenes que cebar vos.'},
  {id:'agua',     price:40,  desc:'De la canilla, embotellada aca nomas.'},
];
// Las cadenas: cartel del techo (al de Lanús se le cayó la O), colores de la fachada y del cartel, y dónde va cada
// local (fracción del mapa; se convierte el edificio grande más cercano a ese punto).
// El de Lanús va del otro lado del Riachuelo, como corresponde.
// Estadios: parodias de las canchas de verdad, con los colores de cada club. Cada uno ocupa
// una manzana entera, la libre más cercana a "at" (celda de la grilla): LA CHOCOLATERA del
// lado de La Boca, pegada al Riachuelo (y le falta una tribuna); EL MONUMENTAZO en el norte;
// y en Avellaneda, del otro lado del Riachuelo, los dos vecinos a una cuadra.
// pattern: cómo se pintan las tribunas y el trapo (franja, banda, liso, bastones)
const STADIUMS = [
  { k: 'boca', name: 'LA CHOCOLATERA', club: 'BOCA JUNIORES', at: [14, 14], c1: '#123f8c', c2: '#f3b229', wall: '#0e3270',
    pattern: 'franja', missing: true },
  { k: 'river', name: 'EL MONUMENTAZO', club: 'RIVER PLATO', at: [11, 2], c1: '#f2f2f2', c2: '#e4002b', wall: '#c9c9c9',
    pattern: 'banda' },
  { k: 'inde', name: 'LOS DEUDORES DE AMERICA', club: 'DEPENDIENTE', at: [17, 19], c1: '#d8141c', c2: '#ffffff', wall: '#a80e14',
    pattern: 'liso' },
  { k: 'racing', name: 'EL TERMO', club: 'RASIN CLUB', at: [18, 19], c1: '#7cc4ef', c2: '#ffffff', wall: '#7a7e84',
    pattern: 'bastones', round: true },
];

// Respeto, por jugador. Rangos (desde cuánto respeto) y cuánto da o saca cada cosa.
const RANKS = [[0, 'GIL'], [50, 'PIBE DEL BARRIO'], [150, 'PESADO'], [350, 'CAPO'], [700, 'LEYENDA']];
const RESPECT = {
  choto: 10, noche: 6, lanus: 1,   // robar un super
  famoso: 8,                       // bajar a un famoso
  star: 5,                         // por estrella, al perder a la yuta con 3 o más
  pvp: 15, pvpLoss: 10,            // bajar a otro jugador (y lo que pierde el que cae)
  trapo: 50,                       // aguantar el trapo de una barra
  asado: 2,                        // que otro coma de tu asado
};
// Score del ranking (tabla con Tab): ganar y perder puntos, nunca baja de 0
const SCORE = {
  choto: 100, noche: 60, lanus: 10,   // robar un super
  famoso: 80,                         // bajar a un famoso
  star: 50,                           // por estrella, al perder a la yuta con 3 o más
  pvp: 150, pvpLoss: 100,             // bajar a otro jugador (y lo que pierde el que cae)
  trapo: 300,                         // aguantar el trapo de una barra
  death: 50, bust: 75,                // morir / caer preso
};
const SCORE_RULES = 'GANAS: ROBAR SUPER, BAJAR FAMOSO O JUGADOR, PERDER A LA YUTA, TRAPO. PERDES: MORIR, CAER PRESO, QUE TE BAJEN';
const RESPECT_DEATH = 0.10;  // lo que se pierde al morir
const RESPECT_BUST = 0.15;   // y al caer preso
const RANK_DISCOUNT = 0.05;  // por rango: más barato en la armería y con los tranzas
const RANK_CALM = 3;         // desde CAPO, un tranza lastimado no prende la villa de una

// Barras: paran en la puerta de su estadio con el trapo colgado. Si se lo robás, te salen a
// buscar; si lo aguantás TRAPO_TIME segundos es tuyo, y vuelve a colgarse a los TRAPO_BACK.
const BARRAS = [
  { k: 'boca', name: 'LA DOCENA', short: 'LA DOCENA', stadium: 'boca', shirt: '#123f8c', pants: '#0e2a5c', band: '#f3b229', n: 7,
    chant: ['DALE CHOCO, DALE CHOCO!', 'LA DOCENA NO SE VA!', 'DE LA BOCA SOMOS NOSOTROS!'] },
  { k: 'river', name: 'LOS BORRACHOS DEL TABLERO', short: 'LOS BORRACHOS', stadium: 'river', shirt: '#f2f2f2', pants: '#1a1a1a', band: '#e4002b', n: 7,
    chant: ['VAMOS RIVER PLATO!', 'EL MAS GRANDE, PAPA!', 'LOS BORRACHOS ESTAN ACA!'] },
  { k: 'inde', name: 'LOS DIABLITOS', short: 'LOS DIABLITOS', stadium: 'inde', shirt: '#d8141c', pants: '#1a1a1a', band: '#ffffff', n: 6,
    chant: ['ROJO, ROJO, PAGA LO QUE DEBE!', 'DE AVELLANEDA SOMOS!', 'EL DIABLO NO SE VA!'] },
  { k: 'racing', name: 'LA GUARDIA IMPERFECTA', short: 'LA GUARDIA', stadium: 'racing', shirt: '#7cc4ef', pants: '#1a1a1a', band: '#ffffff', n: 6,
    chant: ['LA ACADEMIA, PAPA!', 'CEBATE UN MATE EN EL TERMO!', 'SOMOS EL PRIMER GRANDE!'] },
];
const TRAPO_TIME = 60;
const TRAPO_BACK = 180;
const TRAPO_R = 16;         // distancia para agarrarlo
// Territorio: la zona de TERR_R alrededor del trapo es de la barra hasta que un jugador, sin hinchas
// vivos en la zona, la aguanta TERR_TIME segundos. Dueño: cobra TERR_CASH cada TERR_PAY segundos.
const TERR_R = 130, TERR_TIME = 30, TERR_HOLD = 240, TERR_PAY = 30, TERR_CASH = 60, TERR_RESPECT = 2;
const BARRA_ANGRY = 90;     // cuánto dura la bronca
const BARRA_CHASE = 420;    // hasta dónde te siguen
// Corren más que vos caminando y menos que corriendo (SHIFT); pegan los HINCHA_FRONT más cerca
const HINCHA_HP = 45, HINCHA_DMG = 5, HINCHA_SPD = 76, HINCHA_HIT = 1.1, HINCHA_FRONT = 3;

const SUPERS = [
  { k: 'choto', name: 'CHOTO', at: [0.30, 0.44], col: '#e8e0d4', roof: '#c8302a', sign: '#c8302a', ink: '#fff' },
  { k: 'noche', name: 'NOCHE %', at: [0.22, 0.62], col: '#e4e6ec', roof: '#2a4fa8', sign: '#d8302a', ink: '#fff' },
  { k: 'noche', name: 'NOCHE %', at: [0.86, 0.36], col: '#e4e6ec', roof: '#2a4fa8', sign: '#d8302a', ink: '#fff' },
  { k: 'lanus', name: 'CH TO', at: [0.70, 0.86], col: '#d6cdbd', roof: '#a8342e', sign: '#a8342e', ink: '#f2e6d8' },
];
// Boliches: abren de noche (darkness() > BOLICHE_DARK). Con E en la puerta se paga la entrada
// y se pasan BOLICHE_TIME segundos adentro (quieto, como en el hospital) con la música de la
// casa (radio: emisora de STATIONS). Al salir cada uno da lo suyo: respeto, comida y bebida,
// o una apuesta al pool (bet: se gana o se pierde, mitad y mitad). glow: color del neón.
const BOLICHES = [
  { k: 'bailanta', name: 'LA BAILANTA', at: [0.42, 0.74], entry: 100, radio: 0, glow: [255, 58, 208], doing: 'BAILANDO CUMBIA', respect: 4 },
  { k: 'cuarteto', name: 'CUARTETAZO', at: [0.60, 0.22], entry: 60, radio: 3, glow: [58, 230, 255], doing: 'TIRANDO PASOS', food: 50, drink: 100 },
  { k: 'pool', name: 'BAR EL TANO', at: [0.14, 0.30], entry: 40, radio: 1, glow: [255, 200, 60], doing: 'JUGANDO AL POOL', bet: 300 },
];
const BOLICHE_TIME = 5;
const BOLICHE_DARK = 0.55;
// Robo al super: se arranca disparando en la puerta y hay que quedarse ROB_TIME segundos
// ahí (si roban dos, va el doble de rápido). Si nadie queda en la puerta ROB_GRACE
// segundos, se corta. Después el local queda con la persiana baja SUPER_CLOSED segundos.
// Los que vieron el robo (a ROB_WITNESS_R de la puerta), si siguen vivos ROB_WITNESS
// segundos después, llaman a la yuta: una estrella más.
const ROB_TIME = 4;
const ROB_R = 22;
const ROB_GRACE = 1.5;
const ROB_STARS = 2;
const SUPER_CLOSED = 90;
const SUPER_ALARM = 12;
const ROB_WITNESS = 6;
const ROB_WITNESS_R = 110;
// Botín: cuántos fajos salen de la caja y cuánto vale cada uno
const ROB_LOOT = { choto: { n: 6, v: [250, 450] }, noche: { n: 4, v: [150, 300] }, lanus: { n: 1, v: [40, 40] } };
const PORRO_MAX = 5;      // cuantos entran en el bolsillo
const PORRO_TIME = 7;     // segundos de camara lenta
const SLOWMO = 0.38;      // velocidad del mundo mientras dura

// Multijugador
const MAX_PLAYERS = 4;
const CAR_SEATS = 4;      // el primero que sube maneja, el resto va de acompañante y tira por su cuenta
const PVP = true;         // las balas, granadas y atropellos de un jugador lastiman a los otros
