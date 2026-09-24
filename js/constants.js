/* =========================================================================
   GTA MERCALOCA - Constantes y Configuración General
   ========================================================================= */

const VERSION = 'v42-1eb456d';

const CREW = [
  {id:'p1', name:'EL SMOKE',  img:'img/p1.jpeg', crop:[0.42,0.11,0.25,0.29], shirt:'#3f9a4a', pants:'#232323'},
  {id:'p2', name:'ACADEMIA',  img:'img/p2.jpeg', crop:[0.40,0.08,0.19,0.14], shirt:'#1d1d22', pants:'#2a2a33'},
  {id:'p3', name:'PALMERA',   img:'img/p3.jpeg', crop:[0.37,0.03,0.20,0.14], shirt:'#26262c', pants:'#3a3f4a'},
  {id:'p4', name:'EL JEFE',   img:'img/p4.jpeg', crop:[0.42,0.17,0.25,0.24], shirt:'#4a4238', pants:'#1c1c1c'},
  {id:'p5', name:'LA PIEDRA', img:'img/p5.jpeg', crop:[0.56,0.16,0.22,0.20], shirt:'#e8e8e0', pants:'#242424'},
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
const FOCAL = 300;                      // menor = mas perspectiva en la extrusion

// Geometria del mundo y grilla
const CELL = 190, ROAD = 56, SIDEWALK = 10;
const GRID = 24, WORLD = CELL * GRID;
const MARGIN = 8;

// Avenida central (9 de Julio): fila/columna de la grilla que pasa por la plaza,
// mucho mas ancha que una calle comun, 2 carriles por sentido
const AVENUE_ROAD = 108;
const AVENUE_LANE = AVENUE_ROAD * 0.24;

// Rotonda del obelisco: radio del anillo de circulacion y de la isla peatonal central
const ROTONDA_R = 58;
const ROTONDA_ISLAND_R = 26;

// Riachuelo: ancho base del cauce y radio de la playa en la desembocadura.
// El ancho real varia a lo largo de la curva (RIVER_WOBBLE) para que la orilla
// muerda las manzanas en vez de cortarlas en cuadrados de grilla.
const RIVER_HALF = CELL * 0.55;
const RIVER_WOBBLE = 0.42;
const BEACH_RADIUS = CELL * 1.8;
// Ancho de la franja de arena que rodea todo el cauce, no solo la desembocadura
const BEACH_BAND = 26;

// Puentes: medio ancho del corredor sobre la avenida donde el agua no existe
const BRIDGE_HALF = AVENUE_ROAD * 0.62;

// Plaza de Mayo: explanada maciza de 2x2 celdas, sin calles cruzandola
const PLAZA_MAYO_CELLS = 2;

// Casa Rosada: cantidad de guardias fijos en la puerta
const CASA_ROSADA_GUARDS = 3;

// Mapa global (tecla M): rango y velocidad de zoom
const MAP_MIN_ZOOM = 1, MAP_MAX_ZOOM = 8, MAP_ZOOM_RATE = 1.6;

// Semaforos
const LIGHT_CYCLE = 11, GREEN = 4.6, AMBER = 0.9;  // por eje: 4.6s verde, 0.9 amarillo, resto rojo

// Hospitales: cuanto tarda en curarte la secuencia al entrar
const HOSPITAL_TIME = 3.2;

// Items de curacion desperdigados por el mapa: cuanta vida da cada uno
const FOOD_HEAL = { pernil: 45, choripan: 30, mate: 15 };
const FOODS = Object.keys(FOOD_HEAL);

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
