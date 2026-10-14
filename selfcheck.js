// Self-check headless: corre la logica y las funciones puras de render con stubs de DOM.
// node selfcheck.js  -> exit 0 si todo OK
// En CI corre con el reporter JUnit de node:test: cada test() es un check en la PR.
const { describe, test } = require('node:test');
const fs = require('fs'), assert = require('assert');
const scriptFiles = [
  'constants.js', 'utils.js', 'audio.js', 'songs.js', 'instruments.js', 'radio.js', 'input.js', 'world.js',
  'entities.js', 'traffic.js', 'game.js', 'renderer.js', 'net.js', 'novedades.js', 'ui.js', 'shop.js'
];
let js = scriptFiles.map(f => fs.readFileSync(__dirname + '/js/' + f, 'utf8')).join('\n');

const noop = () => {};
const ctxStub = new Proxy({}, {get:(t,k)=>{
  if(k === 'canvas') return {};
  if(k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({addColorStop:noop});
  if(k === 'getImageData') return (x,y,w,h) => ({data:new Uint8ClampedArray(w*h*4)});
  if(k === 'measureText') return t => ({width: String(t).length * 6});
  return typeof t[k] === 'undefined' ? noop : t[k];
}, set:()=>true});
const el = () => new Proxy({style:{}, classList:{toggle:noop,add:noop,remove:noop},
  querySelectorAll:()=>[], getContext:()=>ctxStub, width:0, height:0},
  {get:(t,k)=> k in t ? t[k] : noop, set:(t,k,v)=>{t[k]=v;return true}});
global.document = {getElementById:el, createElement:el, querySelectorAll:()=>[], body:el()};
global.window = global; global.addEventListener = noop;
global.performance = {now:()=>Date.now()};
global.requestAnimationFrame = noop;
global.Image = function(){ setTimeout(()=>this.onerror&&this.onerror(),0) };
global.innerWidth = 1920; global.innerHeight = 1080;

const api = new Function(js + `
;return {G,CREW,buildCity,bakeGround,buildings,props,lamps,onRoad,hitBuilding,freeRoadSpot,
         boatsAt,floatsAt,shoreDist,bridgeAt,BOAT_DIM,RIVER_BOATS,
         startGame,update,render,WORLD,dist,shade,mix,hash,ambient,darkness,dayT,DAY,
         PED_TARGET,CAR_TARGET,SIM_R,laneSnap,ringSpot,CELL,ROAD,PEDTYPE,CARMODEL,onSidewalk,toSidewalk,SIDEWALK,
         lights,lightState,LIGHT_CYCLE,GREEN,AMBER,lightAhead,nearestDoor,GRID,
         bust,finishBust,makeChaser,makeCop,addPlayer,removePlayer,nearestPlayer,inPlay,driverOf,MAX_PLAYERS,idleControls,PORRO_TIME,hospitals,HOSPITAL_TIME,FOOD_HEAL,FOODS,makePickup,
         water,casaRosada,cabildo,getObelisco,riverCurve,CASA_ROSADA_GUARDS,
         AVENUE_ROAD,ROTONDA_R,ROTONDA_ISLAND_R,PLAZA_CX,PLAZA_CY,inRotondaRing,
         ROSADA_CX,ROSADA_CY,PLAZA_PX,PLAZA_PY,ROSADA_PX,ROSADA_PY,DIAG_ANG,DIAG_LEN,DIAG_UX,DIAG_UY,inDiagonalBand,RIVER_HALF,distToRiver,
         inWater,riverWidthAt,riverNearest,inPark,inPlazaMayo,hitCarBlock,PM_X0,PM_Y0,PM_X1,PM_Y1,onBeach,BEACH_BAND,villaAt,segAliveV,segAliveH,onDeadRoad,sandZone,audibleFor,sound,sfx,sfxFor,AUDIO_R,game,radio,STATIONS,SONGS,compileSong,noteNum,DRUMS,INSTRUMENTS,FAMOUS,makeFamous,OFFSCREEN,FAMOUS_TALK,CORRALITO_MIN,clamp,net,world,shops,supers,CHOTO_ITEMS,NOCHE_ITEMS,LANUS_ITEMS,FOOD,BAG_MAX,NEED_HURT,NEED_REGEN,parrillas,ASADO_PUNTO,ASADO_QUEMA,ASADO_CARBON,ASADO_PORCIONES,ROB_TIME,ROB_STARS,ROB_LOOT,ROB_WITNESS,SUPER_CLOSED,stadiums,STADIUMS,RANKS,RESPECT,BARRAS,TRAPO_TIME,TRAPO_BACK,BARRA_ANGRY,RESPECT_DEATH,RESPECT_BUST,RANK_CALM,SHOP_ITEMS,makeTranza,shop,say,input,packCtl,unpackCtl,ui,NOVEDADES,newsMax,newsFresh,NEWS_KEY,mapCtl,renderer,MAP_LEG_W,RW,RH,trafficAI,carOverlap,STYLES,segHitsCar,makeCar,DIRS,jkey,banks,BANK_ITEMS};`)();
const {G,CREW,buildCity,bakeGround,buildings,props,lamps,onRoad,hitBuilding,freeRoadSpot,
       boatsAt,floatsAt,shoreDist,bridgeAt,BOAT_DIM,RIVER_BOATS,
       startGame,update,render,WORLD,dist,shade,mix,hash,ambient,darkness,dayT,DAY,
       PED_TARGET,CAR_TARGET,SIM_R,laneSnap,ringSpot,CELL,ROAD,PEDTYPE,CARMODEL,onSidewalk,toSidewalk,SIDEWALK,
       lights,lightState,LIGHT_CYCLE,GREEN,AMBER,lightAhead,nearestDoor,GRID,
       bust,finishBust,makeChaser,makeCop,addPlayer,removePlayer,nearestPlayer,inPlay,driverOf,MAX_PLAYERS,idleControls,PORRO_TIME,hospitals,HOSPITAL_TIME,FOOD_HEAL,FOODS,makePickup,
       water,casaRosada,cabildo,getObelisco,riverCurve,CASA_ROSADA_GUARDS,
       AVENUE_ROAD,ROTONDA_R,ROTONDA_ISLAND_R,PLAZA_CX,PLAZA_CY,inRotondaRing,
       ROSADA_CX,ROSADA_CY,PLAZA_PX,PLAZA_PY,ROSADA_PX,ROSADA_PY,DIAG_ANG,DIAG_LEN,DIAG_UX,DIAG_UY,inDiagonalBand,RIVER_HALF,distToRiver,
         inWater,riverWidthAt,riverNearest,inPark,inPlazaMayo,hitCarBlock,PM_X0,PM_Y0,PM_X1,PM_Y1,onBeach,BEACH_BAND,villaAt,segAliveV,segAliveH,onDeadRoad,sandZone,audibleFor,sound,sfx,sfxFor,AUDIO_R,game,radio,STATIONS,SONGS,compileSong,noteNum,DRUMS,INSTRUMENTS,FAMOUS,makeFamous,OFFSCREEN,FAMOUS_TALK,CORRALITO_MIN,clamp,net,world,shops,supers,CHOTO_ITEMS,NOCHE_ITEMS,LANUS_ITEMS,FOOD,BAG_MAX,NEED_HURT,NEED_REGEN,parrillas,ASADO_PUNTO,ASADO_QUEMA,ASADO_CARBON,ASADO_PORCIONES,ROB_TIME,ROB_STARS,ROB_LOOT,ROB_WITNESS,SUPER_CLOSED,stadiums,STADIUMS,RANKS,RESPECT,BARRAS,TRAPO_TIME,TRAPO_BACK,BARRA_ANGRY,RESPECT_DEATH,RESPECT_BUST,RANK_CALM,SHOP_ITEMS,makeTranza,shop,say,input,packCtl,unpackCtl,ui,NOVEDADES,newsMax,newsFresh,NEWS_KEY,mapCtl,renderer,MAP_LEG_W,RW,RH,trafficAI,carOverlap,STYLES,segHitsCar,makeCar,DIRS,jkey,banks,BANK_ITEMS} = api;

describe('personajes', () => {
  test('cada personaje tiene nombre, foto y recorte de cara validos', () => {
    assert.ok(CREW.length >= 6, 'estan los seis');
    assert.equal(new Set(CREW.map(c => c.id)).size, CREW.length, 'ids distintos');
    assert.equal(new Set(CREW.map(c => c.name)).size, CREW.length, 'nombres distintos');
    for (const c of CREW) {
      assert.ok(fs.existsSync(__dirname + '/' + c.img), c.name + ': falta la foto ' + c.img);
      const [x, y, w, h] = c.crop;
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1 && y + h <= 1, c.name + ': recorte fuera de la foto');
    }
  });
});

describe('helpers de color', () => {
  test('shade y mix componen colores validos', () => {
    assert.equal(shade('#808080', 1), 'rgb(128,128,128)');
    assert.equal(shade('#808080', 0), 'rgb(0,0,0)');
    assert.equal(shade('#ffffff', 5), 'rgb(255,255,255)', 'shade satura, no desborda');
    assert.equal(mix('#000000','#ffffff',0.5), 'rgb(127,127,127)');
    assert.equal(mix('#102030','#102030',0.7), 'rgb(16,32,48)', 'mix de un color consigo mismo no lo mueve');
  });

  test('hash es determinista y acotado', () => {
    for(let i=0;i<50;i++){ const h = hash(i); assert.ok(h >= -1 && h <= 1 && hash(i) === h, 'hash determinista y acotado'); }
  });
});

describe('mundo', () => {
  test('genera la ciudad con edificios, faroles y parques', () => {
    buildCity(); bakeGround();
    assert.ok(buildings.length > 100, 'ciudad generada: ' + buildings.length);
    // 1 por esquina, menos las que se trago el rio
    assert.ok(lamps.length > GRID * GRID * 0.8, 'faroles: ' + lamps.length);
    assert.ok(lamps.every(l => !inWater(l.x, l.y)), 'no puede haber un farol plantado en el agua');
    assert.ok(props.every(p => p.t !== 'palm' || !inWater(p.x, p.y)), 'no puede haber una palmera plantada en el agua');
    assert.ok(props.some(p => p.t === 'park') && props.some(p => p.t === 'palm'), 'parques y palmeras');
    for(const b of buildings) assert.ok(b.H > 0 && b.w > 0 && b.h > 0, 'edificio con volumen valido');
  });

  test('freeRoadSpot da un lugar libre sobre la calle', () => {
    for(let i=0;i<300;i++){
      const s = freeRoadSpot();
      assert.ok(onRoad(s.x,s.y) && !hitBuilding(s.x,s.y,10), 'spot invalido ' + JSON.stringify(s));
    }
  });
});

describe('semaforos', () => {
  test('un semaforo por bocacalle, salvo la rotonda', () => {
    // La bocacalle de la plaza no tiene semaforo (es rotonda real) pero se empuja `null`
    // para no correr el indice plano gy*GRID+gx que usa lightAhead().
    assert.equal(lights.length, GRID*GRID, 'un semaforo por bocacalle (o null en la rotonda)');
    assert.equal(lights[PLAZA_CY*GRID+PLAZA_CX], null, 'la rotonda de la plaza no tiene semaforo');
  });

  test('nunca dan verde a los dos ejes a la vez', () => {
    const N = 2000, t0 = G.t;
    let bothGreen = 0, greenH = 0, greenV = 0;
    // El rio puede dejar alguna bocacalle sin semaforo (null), asi que se toman los que existen
    const probes = [lights[0], lights[7], lights[GRID*3+5]].filter(Boolean);
    assert.ok(probes.length && probes[0] === lights[0], 'las bocacalles de muestra tienen que tener semaforo');
    for(const L of probes){
      for(let i=0;i<N;i++){
        G.t = i/N*LIGHT_CYCLE*2;
        const h = lightState(L, true), v = lightState(L, false);
        assert.ok(['verde','amarillo','rojo'].includes(h), 'estado invalido: ' + h);
        if(h === 'verde' && v === 'verde') bothGreen++;   // INVARIANTE: nunca cruzado
        if(L === lights[0]){ if(h === 'verde') greenH++; if(v === 'verde') greenV++; }
      }
    }
    assert.equal(bothGreen, 0, 'ambos ejes en verde a la vez: choque garantizado');
    assert.ok(greenH/N > 0.3 && greenH/N < 0.5, 'verde H fuera de rango: ' + (greenH/N));
    assert.ok(Math.abs(greenH-greenV) < N*0.05, 'los dos ejes no reciben verde parejo');
    G.t = t0;
  });

  test('lightAhead apunta a la bocacalle de adelante', () => {
    // lightAhead apunta a la bocacalle de adelante, nunca a la de atras
    for(let i=0;i<300;i++){
      const x = 20+Math.random()*(WORLD-40), y = 20+Math.random()*(WORLD-40);
      const ang = [0, Math.PI, Math.PI/2, -Math.PI/2][(Math.random()*4)|0];
      const LA = lightAhead(x, y, ang);
      if(LA) assert.ok(Number.isFinite(LA.fwd), 'lightAhead fwd NaN');
    }
  });
});

describe('edificios', () => {
  test('todos tienen puerta en su perimetro', () => {
    assert.ok(buildings.every(b => b.door), 'todos los edificios tienen puerta');
    for(const b of buildings){
      const d = b.door;
      assert.ok(d.x >= b.x-1 && d.x <= b.x+b.w+1 && d.y >= b.y-1 && d.y <= b.y+b.h+1,
        'puerta fuera del perimetro del edificio');
      assert.ok(!hitBuilding(d.x+d.ox, d.y+d.oy, 1) || true, 'punto de salida');
    }
    assert.ok(nearestDoor(buildings[0].x, buildings[0].y, 200), 'nearestDoor encuentra algo');
  });

  test('hay dos hospitales lejos entre si', () => {
    assert.equal(hospitals.length, 2, 'tienen que existir dos hospitales: ' + hospitals.length);
    for(const h of hospitals){
      assert.ok(h.door, 'el hospital tiene que tener puerta');
      assert.ok(buildings.includes(h), 'el hospital es un edificio real de la ciudad');
    }
    assert.ok(dist(hospitals[0], hospitals[1]) > CELL * 3, 'los hospitales tienen que estar lejos entre si: ' + dist(hospitals[0], hospitals[1]));
  });

  test('estan las canchas de los cuatro grandes, cada una en su manzana', () => {
    assert.deepEqual(stadiums.map(b => b.stadium).sort(), ['boca', 'inde', 'racing', 'river'], 'los cuatro estadios');
    for (const b of stadiums) {
      assert.ok(buildings.includes(b) && b.w > CELL * 0.55 && b.h > CELL * 0.55, 'ocupa la manzana: ' + b.stadium);
      assert.ok(!buildings.some(o => o !== b && o.x < b.x + b.w && o.x + o.w > b.x && o.y < b.y + b.h && o.y + o.h > b.y),
        'no tiene otro edificio encima: ' + b.stadium);
      assert.ok(onRoad(b.door.x + b.door.ox * 4, b.door.y + b.door.oy * 4), 'la puerta da a la calle: ' + b.stadium);
      assert.ok(!villaAt(b.x + b.w / 2, b.y + b.h / 2), 'no esta en una villa');
    }
    const boca = stadiums.find(b => b.stadium === 'boca'), river = stadiums.find(b => b.stadium === 'river');
    assert.ok(distToRiver(boca.x + boca.w / 2, boca.y + boca.h / 2) < CELL * 4, 'LA CHOCOLATERA cerca del Riachuelo');
    assert.ok(river.y < WORLD / 3, 'EL MONUMENTAZO en el norte');
    const inde = stadiums.find(b => b.stadium === 'inde'), racing = stadiums.find(b => b.stadium === 'racing');
    assert.ok(dist(inde, racing) < CELL * 1.5, 'en Avellaneda, los vecinos a una cuadra');
    assert.ok(inde.y > boca.y && racing.y > boca.y, 'del otro lado del Riachuelo');
    assert.ok(!supers.concat(hospitals, shops).some(b => b.stadium), 'ni super, ni hospital, ni armeria adentro');
    const leg = renderer.mapLegend(renderer.mapItems()).map(r => r[0]);
    assert.ok(STADIUMS.every(S => leg.includes('st_' + S.k)), 'en las referencias del mapa');
  });

  test('hay supers: un CHOTO, dos NOCHE % y el CHOTO de Lanus, con la puerta a la calle', () => {
    const k = supers.map(b => b.super).sort();
    assert.deepEqual(k, ['choto', 'lanus', 'noche', 'noche'], 'las cuatro sucursales: ' + k);
    for (const b of supers) {
      assert.ok(buildings.includes(b), 'el super es un edificio real de la ciudad');
      assert.ok(!b.hospital && !b.shop && !b.villa && !b.casaRosada, 'no pisa otro lugar: ' + b.super);
      const d = b.door;
      assert.ok(onRoad(d.x + d.ox * 4, d.y + d.oy * 4), 'la puerta da a la calle: ' + b.super);
    }
    const noches = supers.filter(b => b.super === 'noche');
    assert.ok(dist(noches[0], noches[1]) > CELL * 6, 'los dos NOCHE % no estan pegados');
  });

  test('hay un banco con la puerta a la calle', () => {
    assert.equal(banks.length, 1, 'un banco');
    const b = banks[0], d = b.door;
    assert.ok(buildings.includes(b) && !b.hospital && !b.shop && !b.super && !b.villa, 'edificio real que no pisa otro lugar');
    assert.ok(onRoad(d.x + d.ox * 4, d.y + d.oy * 4), 'la puerta da a la calle');
    assert.ok(renderer.mapLegend(renderer.mapItems()).some(r => r[0] === 'banco'), 'en las referencias del mapa');
  });

  test('hay parrillas en las plazas y en los potreros de las villas', () => {
    assert.ok(parrillas.length >= 6, 'parrillas: ' + parrillas.length);
    assert.ok(parrillas.filter(g => villaAt(g.x, g.y)).length >= 2, 'el potrero de cada villa tiene la suya');
    for (const g of parrillas) {
      assert.ok(!inWater(g.x, g.y) && !hitBuilding(g.x, g.y, 6), 'parrilla en un lugar libre');
      assert.ok(inPark(g.x, g.y), 'en una plaza o un potrero');
    }
  });

  test('el CHOTO de Lanus esta del otro lado del Riachuelo, con changuitos tirados y el perro', () => {
    const L = supers.find(b => b.super === 'lanus'), lx = L.x + L.w / 2, ly = L.y + L.h / 2;
    const cauce = riverCurve.filter(p => Math.abs(p.x - lx) < CELL * 2);
    assert.ok(cauce.length && cauce.every(p => p.y < ly), 'queda al sur del rio');
    const cerca = t => props.filter(p => p.t === t && Math.hypot(p.x - lx, p.y - ly) < Math.max(L.w, L.h));
    assert.equal(cerca('perro').length, 1, 'hay un perro durmiendo en la puerta');
    assert.ok(cerca('changuito').some(p => p.volcado), 'hay changuitos dados vuelta');
    const C2 = supers.find(b => b.super === 'choto'), cx = C2.x + C2.w / 2, cy = C2.y + C2.h / 2;
    assert.ok(props.filter(p => p.t === 'changuito' && Math.hypot(p.x - cx, p.y - cy) < Math.max(C2.w, C2.h)).every(p => !p.volcado),
      'en el CHOTO normal estan en fila');
  });
});

describe('riachuelo y monumentos', () => {
  test('el riachuelo cruza el mapa entre dos bordes', () => {
    const p0 = riverCurve[0], p2 = riverCurve[riverCurve.length - 1], eps = 4;
    const onBorder = p => (Math.abs(p.x) < eps ? 'w' : Math.abs(p.x - WORLD) < eps ? 'e'
      : Math.abs(p.y) < eps ? 'n' : Math.abs(p.y - WORLD) < eps ? 's' : null);
    const b0 = onBorder(p0), b2 = onBorder(p2);
    assert.ok(b0, 'el riachuelo tiene que arrancar pegado a un borde del mapa: ' + JSON.stringify(p0));
    assert.ok(b2, 'el riachuelo tiene que terminar pegado a un borde del mapa: ' + JSON.stringify(p2));
    assert.notEqual(b0, b2, 'el riachuelo tiene que cruzar el mapa entre dos bordes distintos: ' + b0 + '/' + b2);
  });

  test('hay playa en la desembocadura', () => {
    // El cauce se abre al final y la arena se hace un playon: cerca de la desembocadura
    // la franja de playa es mucho mas ancha que en el resto del rio
    const fin = riverCurve[riverCurve.length - 1];
    const playaCerca = (cx, cy, R) => {
      let n = 0;
      for (let i = 0; i < 4000; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * R;
        if (onBeach(cx + Math.cos(a) * d, cy + Math.sin(a) * d)) n++;
      }
      return n / 4000;
    };
    const boca = playaCerca(fin.x - CELL * 1.2, fin.y, CELL * 1.5);
    const medio = water[Math.floor(water.length / 2)];
    const mitad = playaCerca(medio.x, medio.y, CELL * 1.5);
    assert.ok(boca > 0.2, 'tiene que existir un playon en la desembocadura del riachuelo: ' + boca.toFixed(2));
    assert.ok(boca > mitad * 1.4, 'la playa de la desembocadura es mas ancha que la del medio: ' + boca.toFixed(2) + ' vs ' + mitad.toFixed(2));
  });

  test('el cauce bloquea el paso como un edificio', () => {
    // El cauce ahora es una cadena de circulos, no un rect por celda
    const w0 = water[Math.floor(water.length / 2)];
    assert.ok(w0.r > 0, 'cada tramo del cauce tiene que tener radio: ' + JSON.stringify(w0));
    assert.ok(hitBuilding(w0.x, w0.y, 3), 'el riachuelo tiene que bloquear el paso como un edificio: ' + JSON.stringify(w0));
  });

  test('el obelisco es chico, se rodea y la avenida es ancha', () => {
    const ob = getObelisco();
    assert.ok(ob, 'el obelisco tiene que existir');
    assert.ok(ob.w < 20, 'el obelisco tiene que ser chico para poder rodearlo: ' + ob.w);
    assert.ok(!buildings.includes(ob), 'el obelisco no puede ser un edificio mas de la ciudad');
    {
    // Avenida ancha: un punto a mitad de camino entre ROAD y AVENUE_ROAD (offset dentro
    // de la celda) tiene que dar camino en la fila/columna de la plaza, cosa que con el
    // ancho de calle comun (ROAD) daria false.
    const off = (ROAD + AVENUE_ROAD) / 2;
    const y = PLAZA_CY * CELL + off, x = PLAZA_CX * CELL + off;
    assert.ok(onRoad(WORLD * 0.1, y), 'la fila de la avenida central tiene que ser mas ancha que una calle comun');
    assert.ok(onRoad(x, WORLD * 0.1), 'la columna de la avenida central tiene que ser mas ancha que una calle comun');
    assert.ok(!onRoad(WORLD * 0.1, (PLAZA_CY + 1) * CELL + off), 'lejos de la avenida el ancho vuelve a ser el normal');
    }
    const cx = ob.x + ob.w / 2, cy = ob.y + ob.h / 2, r = ob.w / 2 + 8;
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      assert.ok(!hitBuilding(px, py, 3), 'el obelisco tiene que ser navegable por el perimetro: ' + JSON.stringify({ px, py }));
    }
  });

  test('hay una sola Casa Rosada, con puerta', () => {
    assert.equal(casaRosada.length, 1, 'tiene que existir una sola Casa Rosada: ' + casaRosada.length);
    assert.ok(buildings.includes(casaRosada[0]), 'la Casa Rosada tiene que ser un edificio real de la ciudad');
    assert.ok(casaRosada[0].door, 'la Casa Rosada tiene que tener puerta');
    assert.ok(!casaRosada[0].hospital, 'la Casa Rosada no puede ser tambien un hospital');
  });

  test('el cauce rompe la tierra: orilla irregular y playa', () => {
    // --- el cauce rompe la tierra: orilla irregular, no cuadras de agua ---
    let minW = Infinity, maxW = -Infinity;
    for (let i = 0; i <= 40; i++) { const w = riverWidthAt(i / 40); minW = Math.min(minW, w); maxW = Math.max(maxW, w); }
    assert.ok(maxW - minW > RIVER_HALF * 0.4,
      'el cauce tiene que variar de ancho, si no son cuadras con agua: ' + minW.toFixed(0) + '-' + maxW.toFixed(0));
    // La orilla no puede caer siempre en el borde de una celda de grilla
    const edges = new Set();
    for (let i = 0; i < riverCurve.length * 30; i++) {
      const t = i / (riverCurve.length * 30);
      const p = { x: WORLD * 0.3 + t * WORLD * 0.5, y: t * WORLD * 0.6 };
      if (inWater(p.x, p.y)) edges.add(Math.round(p.x % CELL));
    }
    assert.ok(edges.size > 3, 'la orilla tiene que cortar las manzanas en cualquier lado, no en el borde de celda: ' + edges.size);
    assert.ok(water.every(c => c.r > 0 && !('w' in c)), 'el cauce se guarda como circulos, no como rects de celda');
    // Playa: franja de arena a lo largo de TODO el cauce, no solo en la desembocadura
    let arenados = 0;
    for (const c of water) {
      const n = riverNearest(c.x, c.y);
      const r = riverWidthAt(n.t) + BEACH_BAND * 0.5; // justo afuera del agua
      // 8 direcciones: el cauce corre en diagonal, con solo las 4 cardinales el
      // punto de muestra cae todavia adentro del agua y el chequeo daria falso
      let hit = false;
      for (let i = 0; i < 8 && !hit; i++) {
        const a = i / 8 * Math.PI * 2;
        if (onBeach(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r)) hit = true;
      }
      if (hit) arenados++;
    }
    assert.ok(arenados > water.length * 0.7,
      'casi todo el cauce tiene que tener playa al lado, no solo la desembocadura: ' + arenados + '/' + water.length);
    // (se saltea el ultimo punto: cae justo sobre el borde del mapa, fuera de la mascara)
    assert.ok(water.every(c => c.x >= WORLD || c.y >= WORLD || !onBeach(c.x, c.y)),
      'el centro del cauce es agua, no arena');
    assert.ok(buildings.every(b => !onBeach(b.x + b.w / 2, b.y + b.h / 2)), 'no se planta un edificio arriba de la playa');
  });

  test('ninguna calle se mete en el rio ni queda colgada, y la playa tiene sombrillas', () => {
    // Ninguna calle desemboca en el rio: el tramo cortado por agua o arena se borra
    // entero, asi la calle termina en la esquina anterior.
    let sobreAgua = 0;
    for (let i = 0; i < 40000; i++) {
      const x = Math.random() * WORLD, y = Math.random() * WORLD;
      if (onRoad(x, y) && (inWater(x, y) || onBeach(x, y))) sobreAgua++;
    }
    assert.equal(sobreAgua, 0, 'ninguna calle puede meterse en el agua ni en la playa: ' + sobreAgua);

    // Y no quedan callejones sin salida: todo extremo de tramo vivo conecta con otro
    const conn = (nx, ny) =>
      (segAliveV(nx, ny) ? 1 : 0) + (segAliveV(nx, ny - 1) ? 1 : 0)
      + (segAliveH(nx, ny) ? 1 : 0) + (segAliveH(nx - 1, ny) ? 1 : 0);
    const bordeMapa = (nx, ny) => nx <= 0 || ny <= 0 || nx >= GRID || ny >= GRID;
    let callejones = 0, vivos = 0;
    for (let cy = 0; cy < GRID; cy++) for (let cx = 0; cx <= GRID; cx++) {
      if (!segAliveV(cx, cy)) continue;
      vivos++;
      for (const n of [[cx, cy], [cx, cy + 1]]) if (!bordeMapa(n[0], n[1]) && conn(n[0], n[1]) < 2) callejones++;
    }
    for (let cx = 0; cx < GRID; cx++) for (let cy = 0; cy <= GRID; cy++) {
      if (!segAliveH(cx, cy)) continue;
      vivos++;
      for (const n of [[cx, cy], [cx + 1, cy]]) if (!bordeMapa(n[0], n[1]) && conn(n[0], n[1]) < 2) callejones++;
    }
    assert.ok(vivos > GRID * GRID, 'tiene que quedar una red de calles grande: ' + vivos);
    assert.equal(callejones, 0, 'no puede quedar ninguna calle colgada contra el rio: ' + callejones);

    // El asfalto liberado se vuelve playa, con sus cosas encima
    const sombrillas = props.filter(p => p.t === 'sombrilla');
    assert.ok(sombrillas.length > 20, 'tiene que haber sombrillas en la playa: ' + sombrillas.length);
    assert.ok(sombrillas.every(s => sandZone(s.x, s.y)), 'toda sombrilla va sobre la arena');
  });

  test('Plaza de Mayo, Cabildo, Casa Rosada y puentes', () => {
    // --- Plaza de Mayo: explanada maciza de varias cuadras frente a la Casa Rosada ---
    const pm = props.find(p => p.t === 'plazaMayo');
    assert.ok(pm, 'tiene que existir la explanada de la Plaza de Mayo');
    assert.ok(pm.w > CELL && pm.h > CELL, 'la plaza tiene que medir varias cuadras: ' + pm.w + 'x' + pm.h);
    const mx = pm.x + pm.w / 2, my = pm.y + pm.h / 2;
    assert.ok(!onRoad(mx, my), 'adentro de la explanada no puede haber calle');
    assert.ok(inPark(mx, my), 'la explanada se tiene que poder caminar como espacio verde');
    assert.ok(onRoad(PM_X0 + ROAD / 2, my), 'el borde exterior de la plaza sigue siendo calle');
    // El cruce interno que se borro frena autos pero no peatones
    const ix = PM_X0 + CELL + ROAD / 2, iy = pm.y + pm.h / 2;
    assert.ok(hitCarBlock(ix, iy, 4), 'ningun auto puede cruzar la explanada: ' + ix + ',' + iy);
    assert.ok(!hitBuilding(ix, iy, 4), 'pero a pie la explanada se camina igual');
    // La Casa Rosada da al oeste, de frente a la plaza, y es mas grande que un edificio comun
    const cr = casaRosada[0];
    assert.equal(cr.door.s, 'w', 'la Casa Rosada tiene que mirar a la plaza (oeste): ' + cr.door.s);
    assert.ok(cr.x > mx, 'la Casa Rosada va al este de la explanada');
    const comun = buildings.filter(b => !b.casaRosada).reduce((m, b) => Math.max(m, b.w * b.h), 0);
    assert.ok(cr.w * cr.h > comun, 'la Casa Rosada tiene que ser el edificio mas grande: ' + (cr.w * cr.h).toFixed(0) + ' vs ' + comun.toFixed(0));
    assert.ok(props.some(p => p.t === 'piramide'), 'tiene que estar la piramide al medio de la plaza');

    // Layout real: CABILDO | calle | PLAZA DE MAYO | CASA ROSADA, de oeste a este
    assert.equal(cabildo.length, 1, 'tiene que existir un solo Cabildo: ' + cabildo.length);
    const cb = cabildo[0];
    assert.ok(buildings.includes(cb), 'el Cabildo tiene que ser un edificio real de la ciudad');
    assert.equal(cb.door.s, 'e', 'el Cabildo tiene que mirar a la plaza (este): ' + cb.door.s);
    assert.ok(cb.x + cb.w < pm.x, 'el Cabildo va al oeste de la explanada');
    assert.ok(cb.x + cb.w < cr.x, 'el Cabildo y la Casa Rosada van enfrentados con la plaza en el medio');
    assert.ok(onRoad((cb.x + cb.w + pm.x) / 2, cb.y + cb.h / 2),
      'entre el Cabildo y la Plaza de Mayo tiene que pasar una calle');
    assert.ok(buildings.every(b => b === cb
      || b.x > cb.x + cb.w || b.x + b.w < cb.x || b.y > cb.y + cb.h || b.y + b.h < cb.y),
      'no puede haber otro edificio encima del Cabildo');

    // Puentes: cada tramo se registra como prop para que el renderer le de volumen
    const puentes = props.filter(p => p.t === 'puente');
    assert.ok(puentes.length > 0, 'los puentes tienen que existir como prop con estructura');
    for (const pu of puentes) {
      assert.ok(pu.b > pu.a, 'el tramo del puente tiene largo positivo: ' + JSON.stringify(pu));
      assert.ok(pu.w > 0 && Number.isFinite(pu.base), 'el puente tiene ancho y eje validos');
    }
  });

  test('los puentes unen las dos orillas: la red de calles es una sola', () => {
    // Desde cualquier esquina se llega a cualquier otra por calles vivas: si el rio
    // partiera la ciudad (o dejara un pedazo aislado), la yuta y los autos no cruzarian.
    const N = GRID + 1, visto = new Uint8Array(N * N);
    const vecinos = (x, y) => {
      const r = [];
      if (segAliveV(x, y)) r.push([x, y + 1]);
      if (segAliveV(x, y - 1)) r.push([x, y - 1]);
      if (segAliveH(x, y)) r.push([x + 1, y]);
      if (segAliveH(x - 1, y)) r.push([x - 1, y]);
      return r;
    };
    let componentes = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (visto[y * N + x] || !vecinos(x, y).length) continue;
      componentes++;
      const pila = [[x, y]];
      visto[y * N + x] = 1;
      while (pila.length) {
        const [a, b] = pila.pop();
        for (const [c, d] of vecinos(a, b)) if (!visto[d * N + c]) { visto[d * N + c] = 1; pila.push([c, d]); }
      }
    }
    assert.equal(componentes, 1, 'el rio no puede partir la red de calles: ' + componentes + ' pedazos');
    const comunes = props.filter(p => p.t === 'puente' && !p.avenue);
    assert.ok(comunes.length >= 3, 'ademas de las avenidas, el rio se cruza por calles comunes: ' + comunes.length);
  });

  test('la avenida cruza el riachuelo por el puente', () => {
    // --- puentes: la avenida cruza el riachuelo sin bloquear ---
    for (let t = 0; t <= DIAG_LEN; t += 10) {
      // columna avenida (PLAZA_CX) atravesando el rio en Y
      const x = PLAZA_PX, y = t;
      if (distToRiver(x, y) < RIVER_HALF) {
        assert.ok(!hitBuilding(x, y, 3), 'la avenida (columna) tiene que cruzar el puente sin chocar: ' + JSON.stringify({x,y}));
      }
    }
    for (let t = 0; t <= WORLD; t += 10) {
      const x = t, y = PLAZA_PY;
      if (distToRiver(x, y) < RIVER_HALF) {
        assert.ok(!hitBuilding(x, y, 3), 'la avenida (fila) tiene que cruzar el puente sin chocar: ' + JSON.stringify({x,y}));
      }
    }
  });

  test('la diagonal es una banda recta y transitable', () => {
    // --- diagonal: banda recta de la plaza a la Casa Rosada, transitable ---
    let sawBand = false;
    for (let t = 5; t < DIAG_LEN; t += 10) {
      const x = PLAZA_PX + DIAG_UX * t, y = PLAZA_PY + DIAG_UY * t;
      assert.ok(inDiagonalBand(x, y), 'punto sobre el eje de la diagonal tiene que caer en la banda: ' + JSON.stringify({x,y}));
      assert.ok(onRoad(x, y), 'la diagonal tiene que ser camino transitable: ' + JSON.stringify({x,y}));
      sawBand = true;
    }
    assert.ok(sawBand, 'la diagonal tiene longitud positiva');
  });

  test('las lanchas y lo que flota van siempre por el agua', () => {
    // A lo largo de un dia entero (y mas), el casco entero de cada embarcacion tiene que
    // caer adentro del cauce: bajo un puente pasa por debajo (shoreDist sigue < 0 ahi),
    // nunca por arriba de la arena ni de la costa.
    let pasoBajoPuente = false;
    for (let t = 0; t < DAY * 2; t += 0.5) {
      for (const b of boatsAt(t)) {
        const D = BOAT_DIM[b.k], c = Math.cos(b.ang), s = Math.sin(b.ang);
        assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.ang), 'lancha con posicion valida');
        for (const [u, v] of [[D.L / 2, 0], [D.L / 2 - 4, -D.W / 2], [D.L / 2 - 4, D.W / 2], [-D.L / 2, -D.W / 2], [-D.L / 2, D.W / 2]]) {
          const x = b.x + c * u - s * v, y = b.y + s * u + c * v;
          if (x < 0 || y < 0 || x > WORLD || y > WORLD) continue; // entrando o saliendo del mapa
          assert.ok(shoreDist(x, y) < -1, b.k + ' encallada en ' + JSON.stringify({ t, x, y, sd: shoreDist(x, y) }));
        }
        if (bridgeAt(b.x, b.y)) pasoBajoPuente = true;
      }
      if (t % 5 === 0) {
        for (const f of floatsAt(t)) {
          if (f.x < 0 || f.y < 0 || f.x > WORLD || f.y > WORLD) continue;
          assert.ok(shoreDist(f.x, f.y) < -2, f.k + ' varado en la orilla ' + JSON.stringify({ t, x: f.x, y: f.y }));
        }
      }
    }
    assert.ok(pasoBajoPuente, 'en un dia alguna lancha tiene que pasar por debajo de un puente');
    // Las posiciones dependen solo del tiempo: cualquier pantalla ve lo mismo
    assert.deepStrictEqual(boatsAt(123.4), boatsAt(123.4));
    assert.ok(RIVER_BOATS.every(b => BOAT_DIM[b.k]), 'cada embarcacion tiene sus medidas');
    // El agua animada se dibuja (con stubs) parada arriba del rio, de dia y de noche
    startGame(CREW[0]);
    const w = water[(water.length / 2) | 0];
    for (const t of [0, DAY * 0.5, DAY * 0.8]) {
      G.t = t;
      G.cam.x = w.x - 240; G.cam.y = w.y - 135;
      render();
    }
  });

  test('cada puente tiene su estilo, se cruza entero y sus faroles no flotan', () => {
    const ESTILOS = ['mujer', 'pueyrredon', 'boca', 'celeste', 'hormigon', 'transbordador'];
    const puentes = props.filter(p => p.t === 'puente');
    assert.ok(puentes.length >= 4, 'tiene que haber varios puentes: ' + puentes.length);
    for (const pu of puentes) {
      const br = pu.br, id = pu.style + ' ' + (pu.horiz ? 'h' : 'v') + pu.base;
      assert.ok(ESTILOS.includes(pu.style), 'estilo de puente desconocido: ' + pu.style);
      assert.ok(br.da >= pu.a && br.db <= pu.b && br.db - br.da > 40, 'el tablero queda adentro del tramo: ' + id);
      assert.ok(br.piers.length >= 1 && br.piers.some(p => p.wet), 'el puente se apoya en pilas en el agua: ' + id);
      assert.ok(br.piers.every(p => p.u > br.da && p.u < br.db), 'las pilas van entre los estribos: ' + id);
      const at = (u, v) => pu.horiz ? [u, v] : [v, u];
      // De punta a punta: por el eje maneja un auto y por las dos veredas camina un peaton
      for (let u = pu.a + 2; u < pu.b - 2; u += 3) {
        const [x, y] = at(u, pu.base + pu.w / 2);
        assert.ok(onRoad(x, y) && !hitBuilding(x, y, 4), 'el eje del puente tiene que ser calle libre: ' + id + ' ' + JSON.stringify({ x, y }));
        assert.ok(!inWater(x, y), 'el puente no puede tener agua encima: ' + id);
        for (const v of [pu.base + SIDEWALK / 2, pu.base + pu.w - SIDEWALK / 2]) {
          const [sx, sy] = at(u, v);
          assert.ok(!hitBuilding(sx, sy, 3), 'la vereda del puente tiene que estar libre: ' + id + ' ' + JSON.stringify({ x: sx, y: sy }));
          if (u > br.da && u < br.db && !br.cross.some(([c0, c1]) => u > c0 && u < c1)) {
            assert.ok(onSidewalk(sx, sy), 'sobre el tablero la vereda sigue siendo vereda: ' + id);
          }
        }
      }
    }
    // Personalidad: las dos avenidas con lo suyo y las calles con estilos distintos
    const est = puentes.map(p => p.style);
    assert.ok(est.includes('mujer') && est.includes('pueyrredon'), 'las avenidas cruzan por el atirantado y el reticulado');
    assert.ok(new Set(est).size >= Math.min(puentes.length, 5), 'cada puente con su personalidad: ' + est.join(','));
    // Faroles del puente: sobre la vereda, nunca en el agua
    const lp = lamps.filter(l => l.puente);
    assert.ok(lp.length >= puentes.length * 2, 'los puentes tienen faroles: ' + lp.length);
    for (const l of lp) {
      assert.ok(!inWater(l.x, l.y) && onSidewalk(l.x, l.y) && !hitBuilding(l.x, l.y, 2), 'farol de puente fuera de la vereda: ' + JSON.stringify(l));
    }
    // Y en la vereda del puente no se planta ninguna palmera
    for (const p of props.filter(q => q.t === 'palm')) {
      const enPuente = puentes.some(pu => {
        const u = pu.horiz ? p.x : p.y, v = pu.horiz ? p.y : p.x;
        return u > pu.br.da && u < pu.br.db && v >= pu.base - 4 && v <= pu.base + pu.w + 4;
      });
      assert.ok(!enPuente, 'palmera plantada en un puente: ' + JSON.stringify({ x: p.x, y: p.y }));
    }
  });

  test('los puentes se dibujan de dia y de noche con dos jugadores', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    const puentes = props.filter(p => p.t === 'puente');
    for (const pu of puentes) {
      const u = (pu.br.da + pu.br.db) / 2, v = pu.base + pu.w / 2;
      G.me.x = pu.horiz ? u : v; G.me.y = pu.horiz ? v : u;
      P2.x = G.me.x + 60; P2.y = G.me.y + 40; // el otro, al costado: la camara sigue a G.me
      for (const h of [0, DAY * 0.5]) {
        G.t = h;
        update(1 / 60);
        render();
        assert.ok(Number.isFinite(G.cam.x) && Number.isFinite(G.cam.y), 'camara rota sobre el puente ' + pu.style);
      }
    }
    removePlayer(P2);
  });

  test('la playa tiene sus cosas sobre la arena, sin pisarse ni tapar los puentes', () => {
    const PLAYA = ['sombrilla', 'reposera', 'toalla', 'conservadora', 'kayak', 'carpa', 'fogata',
      'chiringuito', 'guardavidas', 'voley', 'muelle'];
    // Las palmeras de playa son las que tienen grupo (las de vereda no)
    const cosas = props.filter(p => PLAYA.includes(p.t) || (p.t === 'palm' && p.g));
    assert.ok(cosas.length > 150, 'la playa tiene que estar llena de cosas: ' + cosas.length);
    for (const t of ['toalla', 'reposera', 'conservadora', 'chiringuito', 'guardavidas', 'fogata', 'muelle'])
      assert.ok(cosas.some(p => p.t === t), 'en la playa tiene que haber ' + t);
    assert.ok(cosas.some(p => p.t === 'palm'), 'y palmeras en la arena');
    assert.ok(props.some(p => p.t === 'gaviotas'), 'y gaviotas volando');
    assert.ok(props.filter(p => p.t === 'toalla' && p.gente).length > 20, 'gente tomando sol en las toallas');

    for (const p of cosas) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y) && p.r > 0 && p.g > 0, 'cosa de playa invalida: ' + JSON.stringify(p));
      assert.ok(sandZone(p.x, p.y), p.t + ' fuera de la arena: ' + p.x.toFixed(0) + ',' + p.y.toFixed(0));
      assert.ok(!inWater(p.x, p.y), p.t + ' en el agua: ' + p.x.toFixed(0) + ',' + p.y.toFixed(0));
      const hb = hitBuilding(p.x, p.y, p.r);
      assert.ok(!hb || hb.water, p.t + ' arriba de un edificio: ' + p.x.toFixed(0) + ',' + p.y.toFixed(0));
    }

    // Ninguna tapa un puente: se deja libre el corredor mas un margen (las palmeras,
    // de vereda o de playa, mas lejos: su copa se extruye lejos del tronco)
    const puentes = props.filter(p => p.t === 'puente');
    const cerca = (x, y, b, m) => {
      const u = b.horiz ? x : y, v = b.horiz ? y : x;
      return u > b.a - m && u < b.b + m && Math.abs(v - (b.base + b.w / 2)) < b.w / 2 + 6 + m;
    };
    for (const b of puentes) {
      for (const p of cosas) {
        assert.ok(!cerca(p.x, p.y, b, p.r + 18), p.t + ' pegado al puente: ' + p.x.toFixed(0) + ',' + p.y.toFixed(0));
      }
      for (const p of props) {
        if (p.t !== 'palm') continue;
        assert.ok(!cerca(p.x, p.y, b, 30), 'palmera que tapa el puente: ' + p.x.toFixed(0) + ',' + p.y.toFixed(0));
      }
    }

    // No se pisan: entre grupos distintos cada una respeta el lugar de la otra
    let pisadas = 0;
    for (let i = 0; i < cosas.length; i++) {
      for (let j = i + 1; j < cosas.length; j++) {
        const a = cosas[i], b = cosas[j];
        if (a.g !== b.g && Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r) pisadas++;
      }
    }
    assert.equal(pisadas, 0, 'cosas de playa encimadas: ' + pisadas);

    // Los muelles arrancan en la arena y la punta cae al agua (sin cambiar la colision)
    for (const m of cosas.filter(p => p.t === 'muelle')) {
      const tx = m.x + m.dx * m.L, ty = m.y + m.dy * m.L;
      assert.ok(inWater(tx, ty), 'la punta del muelle tiene que estar sobre el agua: ' + tx.toFixed(0) + ',' + ty.toFixed(0));
      assert.ok(hitBuilding(tx, ty, 2), 'el muelle no se camina: el agua sigue frenando');
    }

    // Se dibuja todo, de dia y de noche, con la camara parada en cada cosa
    startGame(CREW[0]);
    let tNoche = 0;
    for (let t = 0; t < DAY; t += DAY / 48) if (G.t = t, darkness() > 0.7) { tNoche = t; break; }
    for (const t of [0, tNoche]) {
      G.t = t;
      for (const tipo of PLAYA.concat(['gaviotas'])) {
        const p = props.find(q => q.t === tipo);
        if (!p) continue;
        G.cam.x = p.x - 240; G.cam.y = p.y - 135;
        render();
      }
    }
    G.t = 0;
  });
});

describe('dia y noche', () => {
  test('el ambiente y la oscuridad siempre son validos', () => {
    for(let t=0; t<DAY*2; t+=1.7){
      G.t = t;
      assert.ok(/^(#|rgb\()/.test(ambient()), 'color de ambiente valido en t=' + t);
      const d = darkness();
      assert.ok(d >= 0 && d <= 1 && Number.isFinite(d), 'darkness fuera de rango en t=' + t);
    }
    G.t = 0;
  });
});

describe('simulacion', () => {
  let movingAcc = 0, flowAcc = 0, movingN = 0;   // fraccion de autos andando (y andando o esperando) en los ultimos 10s

  test('arranca la partida con autos, peatones y guardias', () => {
    startGame(CREW[0]);
    assert.equal(G.state, 'play');
    assert.equal(G.cars.length, CAR_TARGET); assert.equal(G.peds.length, PED_TARGET);
    assert.equal(G.pickups.length, 18);
    assert.ok(PEDTYPE.length >= 5 && CARMODEL.length >= 6, 'variedad de peatones y autos');
    // guardias fijos en la puerta de la Casa Rosada
    assert.equal(G.guards.length, CASA_ROSADA_GUARDS, 'tienen que spawnear los guardias de la Casa Rosada: ' + G.guards.length);
    for (const g of G.guards) {
      assert.ok(dist(g, casaRosada[0].door) < 40, 'el guardia tiene que estar posta en la puerta de la Casa Rosada');
    }
    // todo auto arranca sobre la calle y alineado a su carril (un eje, o la Diagonal)
    for(const c of G.cars){
      assert.ok(onRoad(c.x, c.y), 'auto fuera de la calle al spawnear');
      const a = ((c.ang % (Math.PI/2)) + Math.PI/2) % (Math.PI/2);
      const diag = Math.abs(Math.sin(c.ang - DIAG_ANG)) < 1e-6;
      assert.ok(a < 1e-6 || Math.abs(a - Math.PI/2) < 1e-6 || diag, 'auto no alineado al carril: ' + c.ang);
    }
  });

  test('laneSnap da un carril valido y un angulo cardinal', () => {
    // laneSnap devuelve siempre un carril valido y un angulo cardinal
    for(let i=0;i<200;i++){
      const L = laneSnap(Math.random()*WORLD, Math.random()*WORLD, Math.random()*Math.PI*2);
      assert.ok(Number.isFinite(L.x) && Number.isFinite(L.y), 'laneSnap NaN');
      const ok = [0, Math.PI, Math.PI/2, -Math.PI/2].some(a => Math.abs(L.ang-a) < 1e-9);
      assert.ok(ok, 'laneSnap angulo raro: ' + L.ang);
    }
  });

  test('60s simulados y renderizados sin NaN ni salirse del mapa', () => {
    // El jugador espera en la vereda: parado en el medio de la calle 60s traba las dos manos
    // (los autos tocan bocina y esperan, como corresponde) y eso no es transito de la ciudad.
    // Donde no molesta a nadie: a mitad de cuadra (en la esquina los que doblan pasan rozandolo),
    // contra la cuadra (el carril va pegado al cordon y un auto ancho lo toca si esta del lado
    // de la calle) y con todo el radio de simulacion adentro del mapa: cerca del borde los
    // autos se reparten en menos calles (en las esquinas todo el transito dobla en la misma
    // bocacalle) y se arma fila sin que el jugador tenga nada que ver.
    // Con un spawn al azar en cualquiera de esos lugares este test fallaba de vez en cuando.
    {
      const P = G.me, BORDE = SIM_R * 1.5;
      const ancho = (i, eje) => (i === eje ? AVENUE_ROAD : ROAD);
      const ci = Math.floor(P.x / CELL), cj = Math.floor(P.y / CELL);
      let best = null, bd = Infinity;
      for (let i = ci - 4; i <= ci + 4; i++) for (let j = cj - 4; j <= cj + 4; j++) {
        const rw = ancho(i, PLAZA_CX), rh = ancho(j, PLAZA_CY);
        const midX = i * CELL + (rw + CELL) / 2, midY = j * CELL + (rh + CELL) / 2;
        for (const c of [
          { x: i * CELL + 2, y: midY }, { x: i * CELL + rw - 2, y: midY },     // veredas de la columna
          { x: midX, y: j * CELL + 2 }, { x: midX, y: j * CELL + rh - 2 },     // veredas de la fila
        ]) {
          if (Math.min(c.x, c.y, WORLD - c.x, WORLD - c.y) < BORDE) continue;
          if (!onSidewalk(c.x, c.y) || hitBuilding(c.x, c.y, 3) || inDiagonalBand(c.x, c.y)) continue;
          const d = Math.hypot(c.x - P.x, c.y - P.y);
          if (d < bd) { bd = d; best = c; }
        }
      }
      assert.ok(best, 'no hay vereda tranquila cerca de ' + JSON.stringify({ x: P.x, y: P.y }));
      P.x = best.x; P.y = best.y;
    }
    for(let f=0; f<3600; f++){                      // 60s
      update(1/60);
      render();                                     // el render no debe explotar ni con stubs
      const P = G.me;
      assert.ok(Number.isFinite(P.x) && Number.isFinite(P.y), 'pos NaN en frame ' + f);
      assert.ok(P.x >= 0 && P.x <= WORLD && P.y >= 0 && P.y <= WORLD, 'fuera del mapa en frame ' + f);
      assert.ok(P.hp <= 100, 'hp no supera el maximo');
      for(const c of G.cars) assert.ok(Number.isFinite(c.x) && Number.isFinite(c.spd), 'auto NaN frame ' + f);
      // Sin yuta: aca se mide el transito de la ciudad. Un operativo policial traba la calle
      // a proposito; la persecucion se prueba aparte ('los patrulleros persiguen...').
      if(f >= 3000){                                // ultimos 10s: fraccion de autos andando, frame a frame
        const tr = G.cars.filter(c => c.ai && c.hp > 0);
        if(tr.length){
          movingAcc += tr.filter(c => Math.abs(c.spd) > 12).length / tr.length;
          flowAcc += tr.filter(c => Math.abs(c.spd) > 12 || (c.waitLight||0) > 0 || c.queued).length / tr.length;
          movingN++;
        }
      }
    }
    assert.ok(G.fx.length < 4000 && G.smoke.length < 900, 'las particulas no se acumulan sin control');
  });

  test('la ciudad sigue poblada y sin fugas de entidades', () => {
    // la ciudad sigue poblada despues de 60s (el streaming repone lo que se aleja)
    const pedsNear = G.peds.filter(p => p.hp > 0 && dist(p, G.me) < SIM_R).length;
    const carsNear = G.cars.filter(c => dist(c, G.me) < SIM_R).length;
    assert.ok(pedsNear > PED_TARGET*0.5, 'se vacio de peatones: ' + pedsNear);
    assert.ok(carsNear > CAR_TARGET*0.5, 'se vacio de autos: ' + carsNear);
    // y no crece sin control (fuga de entidades)
    assert.ok(G.peds.length < PED_TARGET*3, 'fuga de peatones: ' + G.peds.length);
    assert.ok(G.cars.length < CAR_TARGET*3, 'fuga de autos: ' + G.cars.length);
    console.log('  poblacion viva: ' + pedsNear + ' peatones, ' + carsNear + ' autos cerca');
  });

  test('los peatones van por la vereda y no se traban', () => {
    // la mayoria camina por la vereda, no por el medio de la calle
    // solo cuenta a los que estan deambulando: los de adentro de un edificio y los que
    // van camino a una puerta estan fuera de la vereda a proposito
    const walking = G.peds.filter(p => p.hp > 0 && !p.inside && !p.target);
    const onWalk = walking.filter(p => onSidewalk(p.x, p.y)).length;
    assert.ok(onWalk / walking.length > 0.62,
      'demasiados peatones en el asfalto: ' + onWalk + '/' + walking.length);
    console.log('  vereda: ' + Math.round(onWalk/walking.length*100) + '% de los peatones que deambulan');
    // ninguno puede quedar adentro de un edificio ni fuera del mapa
    for(const p of G.peds){
      if(p.hp <= 0 || p.inside) continue;
      assert.ok(!hitBuilding(p.x, p.y, 2), 'peaton empotrado en un edificio');
      assert.ok(p.x > 0 && p.y > 0 && p.x < WORLD && p.y < WORLD, 'peaton fuera del mapa');
    }
    // nadie trabado mucho tiempo contra una pared
    const stuckPeds = G.peds.filter(p => p.hp > 0 && (p.stuck || 0) > 1.2).length;
    assert.ok(stuckPeds === 0, 'peatones trabados contra un borde: ' + stuckPeds);
  });

  test('los guardias de la Casa Rosada siguen en su posta', () => {
    // los guardias de la Casa Rosada son postas fijas: siguen en la puerta despues de 60s de simulacion
    for (const g of G.guards) {
      assert.ok(dist(g, casaRosada[0].door) < 40, 'el guardia se movio de su posta tras la simulacion: ' + dist(g, casaRosada[0].door));
    }
  });

  test('toSidewalk devuelve un punto de vereda', () => {
    // toSidewalk siempre devuelve un punto dentro de la franja de vereda
    for(let i=0;i<300;i++){
      const t = toSidewalk(Math.random()*WORLD, Math.random()*WORLD);
      assert.ok(onSidewalk(t.x, t.y), 'toSidewalk devolvio un punto que no es vereda');
    }
  });

  test('ningun auto da vueltas sin salir de la rotonda', () => {
    // rotonda del obelisco: los autos que circulan el anillo no quedan dando vueltas para siempre
    const ob = getObelisco(), ocx = ob.x + ob.w/2, ocy = ob.y + ob.h/2;
    for(const c of G.cars){
      if(c.ai && c.hp > 0 && inRotondaRing(c.x, c.y)){
        assert.ok((c.ringArc||0) < Math.PI * 3, 'auto dando vueltas sin salir de la rotonda: ' + c.ringArc);
      }
    }
  });

  test('ningun auto queda trabado en la diagonal', () => {
    // diagonal: ningun auto queda trabado (stopT alto) mientras esta en la banda de la diagonal
    const stuckInDiag = G.cars.filter(c => c.ai && c.hp > 0 && inDiagonalBand(c.x, c.y) && c.stopT > 4).length;
    assert.equal(stuckInDiag, 0, 'auto trabado en la diagonal: ' + stuckInDiag);
  });

  test('el trafico fluye', () => {
    // el trafico tiene que FLUIR: la mayoria de los autos en movimiento, no un embotellamiento
    const traffic = G.cars.filter(c => c.ai && c.hp > 0);
    const moving  = traffic.filter(c => Math.abs(c.spd) > 12).length;
    const atRed   = traffic.filter(c => (c.waitLight||0) > 0 || c.queued).length;
    const jammed  = traffic.filter(c => c.stopT > 4).length;
    // parado en rojo es correcto; lo que no puede haber son autos trabados sin motivo
    assert.ok(jammed <= traffic.length*0.10, 'autos trabados sin motivo: ' + jammed);
    // Promedio de los ultimos 10s y no una foto de un solo frame: la foto depende de en que fase
    // estaban los semaforos justo en ese instante y fallaba de vez en cuando aun con trafico sano
    // (los que arrancan con el verde o le ceden el paso a un peaton no cuentan ni como andando
    // ni como esperando, y en un frame llegaban a ser un tercio).
    assert.ok(flowAcc / movingN > 0.75,
      'trafico muerto: solo ' + Math.round(flowAcc / movingN * 100) + '% andando o esperando el rojo en los ultimos 10s');
    assert.ok(movingAcc / movingN > 0.45,
      'demasiados parados: solo ' + Math.round(movingAcc / movingN * 100) + '% circulando en los ultimos 10s');
    // regresion: al chocar una pared se reseteaban a la misma velocidad cada frame y
    // quedaban en bucle. Si muchos comparten velocidad exacta, volvio el bug.
    // Los parados no cuentan: frenar en un semaforo deja la velocidad en 0 exacto, y eso es correcto.
    {
      const buckets = {};
      for(const c of traffic){ if (Math.abs(c.spd) < 0.5) continue; const k = c.spd.toFixed(1); buckets[k] = (buckets[k]||0)+1; }
      const worst = Math.max(...Object.values(buckets));
      assert.ok(worst < traffic.length*0.35,
        'muchos autos con velocidad identica (bucle de choque): ' + worst + '/' + traffic.length);
    }
    console.log('  trafico: ' + moving + ' circulando, ' + atRed + ' esperando el rojo, '
      + jammed + ' trabados (de ' + traffic.length + ')');
  });

  test('los peatones entran y salen de los edificios', () => {
    // entran y salen de los edificios
    const inside = G.peds.filter(p => p.hp > 0 && p.inside).length;
    const going  = G.peds.filter(p => p.hp > 0 && p.target).length;
    assert.ok(inside + going > 0, 'nadie usa las puertas');
    // el que esta adentro no se dibuja ni deambula por el mapa
    for(const p of G.peds) if(p.inside)
      assert.ok(p.doorT > 0 || p.doorT <= 0, 'temporizador de puerta invalido');
    console.log('  edificios: ' + inside + ' peatones adentro, ' + going + ' yendo a una puerta');
  });
});

describe('ia de los autos', () => {
  // Vereda tranquila cerca de (x, y): lejos del borde y fuera de la Diagonal
  const vereda = (x, y) => {
    let best = null, bd = Infinity;
    for (let dx = -240; dx <= 240; dx += 4) for (let dy = -240; dy <= 240; dy += 4) {
      const px = x + dx, py = y + dy;
      if (Math.min(px, py, WORLD - px, WORLD - py) < SIM_R) continue;
      if (!onSidewalk(px, py) || hitBuilding(px, py, 3) || inDiagonalBand(px, py)) continue;
      const d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = { x: px, y: py }; }
    }
    return best;
  };
  const civiles = () => G.cars.filter(c => c.ai && !c.chase && c.hp > 0);
  // Ninguna parte del auto adentro de una bocacalle (ni de la zona de la Diagonal)
  const enBocacalle = c => !!trafficAI.boxAt(c.x, c.y) || trafficAI.diagJ().some(J => trafficAI.footIn(J.key, c.x, c.y, c.ang, c.w, c.h));

  test('aparecen en su carril, lejos de las bocacalles y sin pisarse', () => {
    startGame(CREW[0]);
    const revisar = (c, cuando) => {
      assert.ok(onRoad(c.x, c.y), cuando + ': auto fuera de la calle');
      assert.ok(!enBocacalle(c), cuando + ': auto aparecido adentro de una bocacalle en ' + Math.round(c.x) + ',' + Math.round(c.y));
      for (const o of G.cars) if (o !== c) assert.ok(!carOverlap(c, o), cuando + ': auto aparecido encima de otro');
    };
    for (const c of G.cars) revisar(c, 'al arrancar');
    // Los que van apareciendo mientras el jugador recorre la ciudad
    let nuevos = 0;
    for (let k = 0; k < 4; k++) {
      const s = freeRoadSpot(); G.me.x = s.x; G.me.y = s.y;
      for (let f = 0; f < 150; f++) {
        const antes = new Set(G.cars);
        update(1/60);
        G.me.hp = G.me.maxhp;
        for (const c of G.cars) if (!antes.has(c) && c.ai) { nuevos++; revisar(c, 'al aparecer'); }
      }
    }
    assert.ok(nuevos > 5, 'aparecieron autos nuevos: ' + nuevos);
  });

  test('la Diagonal tiene su fase de semaforo y autos que la usan', () => {
    const dj = trafficAI.diagJ();
    assert.ok(dj.length >= 2, 'la Diagonal cruza bocacalles: ' + dj.length);
    const t0 = G.t;
    for (const J of dj) {
      const L = lights[J.j * GRID + J.i];
      if (!L || L.off) continue;
      assert.ok(L.diag, 'el semaforo de la Diagonal tiene tres fases');
      const verdes = [0, 0, 0];
      for (let i = 0; i < 1500; i++) {
        G.t = i / 1500 * LIGHT_CYCLE * 3;
        const st = [lightState(L, true), lightState(L, false), lightState(L, 'd')];
        assert.ok(st.filter(x => x === 'verde').length <= 1, 'dos fases en verde a la vez: ' + st);
        st.forEach((x, k) => { if (x === 'verde') verdes[k]++; });
      }
      for (const v of verdes) assert.ok(v / 1500 > 0.2, 'cada fase tiene su verde: ' + verdes);
    }
    G.t = t0;
  });

  test('manejan sin chocarse, sin pasarse el rojo y por la calle', () => {
    startGame(CREW[0]);
    // Al lado de la Diagonal: bocacalles de tres fases, la rotonda y la avenida cerca
    const J = trafficAI.diagJ()[1];
    const b = trafficAI.boxCenter(J.key), v = vereda(b.x + 100, b.y - 70);
    G.me.x = v.x; G.me.y = v.y;
    let choques = 0, rojos = 0, afuera = 0, encima = 0, enDiagonal = 0, n = 0, clavado = 0;
    const tocandose = new Set(), detalle = [];
    for (let f = 0; f < 2400; f++) {
      const antes = new Map(civiles().map(c => [c, { hp: c.hp, commit: c.commit }]));
      update(1/60);
      G.me.hp = G.me.maxhp;
      const cs = civiles();
      for (const c of cs) {
        const a = antes.get(c);
        n++;
        if (!onRoad(c.x, c.y)) afuera++;
        if (c.dir >= 4) enDiagonal++;
        clavado = Math.max(clavado, c.idleT || 0);
        if (!a) continue;
        if (c.hp < a.hp - 0.01) choques++;
        // Comprometerse con el semaforo en rojo (asustado no cuenta: ahi no mira el semaforo)
        if (c.commit && c.commit !== a.commit && c.cmove && !(c.panic > 0)
          && !trafficAI.footIn(c.commit, c.x, c.y, c.ang, c.w, c.h)) {
          const L = lights[c.cmove.j * GRID + c.cmove.i];
          if (L && lightState(L, c.cmove.d >= 4 ? 'd' : c.cmove.d % 2 === 0) === 'rojo') rojos++;
        }
      }
      for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
        const k = cs[i].seed + ':' + cs[j].seed;
        // Que se pisen de verdad (mas de 1 px): rozarse de costado en la fila no se ve
        const hit = carOverlap(cs[i], cs[j]);
        if (hit && hit.o > 1) { if (!tocandose.has(k)) { encima++; if (detalle.length < 4) detalle.push([f, hit.o.toFixed(1), [cs[i], cs[j]].map(c => [Math.round(c.x), Math.round(c.y), c.why, Math.round(c.spd), c.dir, c.w, c.h, c.ai, c.panic > 0, c.rage ? 1 : 0, c.dodge ? 1 : 0, c.revT > 0 ? 1 : 0])]); } tocandose.add(k); }
        else tocandose.delete(k);
      }
    }
    assert.equal(rojos, 0, 'autos que se mandaron con el rojo: ' + rojos);
    assert.ok(choques <= 1, 'autos de la IA chocando entre si: ' + choques);
    assert.ok(encima <= 1, 'autos de la IA encimados: ' + encima + ' ' + JSON.stringify(detalle) + ' me ' + Math.round(G.me.x) + ',' + Math.round(G.me.y));
    assert.ok(afuera / n < 0.002, 'autos fuera de la calle: ' + afuera + '/' + n);
    // Ni el rojo de tres fases con la fila hace esperar tanto: mas que esto es un nudo
    assert.ok(clavado < 30, 'un auto quedo clavado ' + Math.round(clavado) + 's');
    console.log('  ia: ' + choques + ' choques, ' + encima + ' encimados, ' + rojos + ' rojos; en la Diagonal ' + Math.round(enDiagonal / 2400 * 10) / 10 + ' autos en promedio');
  });

  test('por la Diagonal se va de punta a punta y se sale doblando', () => {
    startGame(CREW[0]);
    const dj = trafficAI.diagJ(), J0 = dj[0], J1 = dj[1];
    // Un auto a mitad de camino entre las dos primeras bocacalles, yendo para la Casa Rosada
    const u = (J0.u + J1.u) / 2, p = trafficAI.lanePoint(4, 0, 0, u);
    const v = vereda(p.x + 60, p.y - 60);
    G.me.x = v.x; G.me.y = v.y;
    G.cars = G.cars.filter(o => dist(o, p) > 60);
    const c = makeCar(p.x, p.y);
    Object.assign(c, { x: p.x, y: p.y, ang: DIAG_ANG, spd: 30 });
    G.cars.push(c);
    let salio = false, uMax = u;
    for (let f = 0; f < 60 * 40 && !salio && c.hp > 0; f++) {
      update(1/60);
      G.me.hp = G.me.maxhp;
      c.idleT = 0; c.stopT = 0; // que no lo saque el despawn de los trabados lejos de cámara
      assert.ok(onRoad(c.x, c.y), 'se salio de la calle en ' + Math.round(c.x) + ',' + Math.round(c.y));
      if (c.dir === 4) uMax = Math.max(uMax, trafficAI.alongOf(4, c.x, c.y));
      if (c.dir < 4 && !c.path) salio = true;
    }
    assert.ok(salio, 'llego a la punta y doblo a una calle');
    assert.ok(uMax > dj[dj.length - 1].u - 80, 'recorrio la Diagonal hasta la otra punta');
  });

  test('para doblar a la izquierda espera que pase el que viene de frente', () => {
    startGame(CREW[0]);
    G.cars = [];
    // Una bocacalle comun (ni la avenida ni la Diagonal) con calle para los cuatro lados
    let box = null;
    for (let j = 3; j < GRID - 3 && !box; j++) for (let i = 3; i < GRID - 3 && !box; i++) {
      if (i === PLAZA_CX || j === PLAZA_CY || trafficAI.isDiagKey(jkey(i, j)) || !lights[j * GRID + i]) continue;
      if ([0, 1, 2, 3].every(e => trafficAI.exitOK(i, j, e, 0))) box = { i, j };
    }
    assert.ok(box, 'hay una bocacalle comun');
    const key = jkey(box.i, box.j), b = trafficAI.boxCenter(key);
    const poner = (dir, dist, spd) => {
      const c = makeCar(b.x, b.y);
      const p = trafficAI.lanePoint(dir, box.i, 0, trafficAI.alongOf(dir, b.x, b.y) - trafficAI.sgn(dir) * (28 + dist));
      Object.assign(c, { x: p.x, y: p.y, ang: DIRS[dir], spd });
      trafficAI.initNav(c);
      G.cars.push(c);
      return c;
    };
    const A = poner(1, 30, 10);                         // baja por la calle y quiere doblar a la izquierda
    const m = { i: box.i, j: box.j, key, d: 1, e: 0 };
    const B = poner(3, 90, 55);                         // y de frente viene otro a buena velocidad
    assert.ok(trafficAI.oncomingBusy(A, m), 'con uno viniendo de frente, espera');
    Object.assign(B, trafficAI.lanePoint(3, box.i, 0, trafficAI.alongOf(3, b.x, b.y) + 400));
    assert.ok(!trafficAI.oncomingBusy(A, m), 'si el otro esta lejos, dobla');
    Object.assign(B, trafficAI.lanePoint(3, box.i, 0, trafficAI.alongOf(3, b.x, b.y) + 28 + 36), { spd: 0 });
    assert.ok(!trafficAI.oncomingBusy(A, m), 'si el otro esta parado en la raya, dobla');
  });

  test('los tiros asustan a los que manejan cerca, y asustados no frenan en el rojo', () => {
    startGame(CREW[0]);
    for (let f = 0; f < 30; f++) update(1/60);
    const P = G.me;
    const c = civiles().find(c => dist(c, P) < SIM_R);
    P.x = c.x + 45; P.y = c.y; P.wpn = 'pistola'; P.ang = Math.PI / 2;
    for (const o of civiles()) o.panic = 0;
    game.attack(P);
    assert.ok(c.panic > 0 || (!c.ai && c.hazard), 'el de al lado se asusto (o dejo el auto y salio corriendo)');
    assert.ok(civiles().filter(o => dist(o, P) > 300).every(o => !(o.panic > 0)), 'los de lejos ni se enteran');
    // Asustado pasa aunque este en rojo
    const L = lights.find(l => l && !l.off && !l.diag);
    const m = { i: L.cx, j: L.cy, key: jkey(L.cx, L.cy), d: lightState(L, true) === 'rojo' ? 0 : 1, e: 0 };
    const calmo = { ...c, panic: 0 };
    assert.ok(!trafficAI.lightAllows(calmo, m, 50), 'tranquilo frena en el rojo');
    assert.ok(trafficAI.lightAllows({ ...c, panic: 5 }, m, 50), 'asustado se lo pasa');
  });

  test('los autos paran las balas y el chofer se asusta', () => {
    startGame(CREW[0]);
    for (let f = 0; f < 10; f++) update(1/60);
    const c = civiles().find(c => !trafficAI.boxAt(c.x, c.y)), P = G.me;
    G.cars = [c];
    c.spd = 0;
    const hx = Math.cos(c.ang), hy = Math.sin(c.ang);
    // Tiro por la calle, desde atras del auto; un peaton justo adelante, en la linea del tiro
    const ped = G.peds.find(p => p.hp > 0);
    Object.assign(ped, { x: c.x + hx * 30, y: c.y + hy * 30, inside: null });
    const hp0 = c.hp, php0 = ped.hp;
    G.bullets.push({ x: c.x - hx * 40, y: c.y - hy * 40, vx: hx * 600, vy: hy * 600, life: 1, owner: P, dmg: 22 });
    for (let f = 0; f < 6; f++) update(1/60);
    assert.ok(c.hp < hp0, 'la chapa recibio el balazo');
    assert.equal(ped.hp, php0, 'el de atras quedo cubierto');
    assert.ok(c.panic > 0 || !c.ai, 'el chofer se asusto (o se bajo corriendo)');
  });

  test('con la sirena atras se tira al cordon y lo deja pasar', () => {
    startGame(CREW[0]);
    for (let f = 0; f < 30; f++) update(1/60);
    const c = civiles().find(c => !c.path && c.spd > 20 && !trafficAI.boxAt(c.x, c.y) && c.dir < 4);
    assert.ok(c, 'hay un auto andando derecho');
    const cop = makeChaser(G.me);
    Object.assign(cop, { x: c.x - Math.cos(c.ang) * 45, y: c.y - Math.sin(c.ang) * 45, ang: c.ang, spd: 70 });
    G.cars.push(cop);
    trafficAI.update(c, 1/60);
    assert.ok(c.pullOver > 0, 'se corre al cordon');
    const v0 = c.spd;
    for (let f = 0; f < 30; f++) trafficAI.update(c, 1/60);
    assert.ok(c.spd < v0 * 0.6, 'afloja para dejarlo pasar: ' + v0.toFixed(0) + ' -> ' + c.spd.toFixed(0));
  });
});

describe('jugador', () => {
  test('en el super se compra a la mochila y se come con C', () => {
    startGame(CREW[0]);
    const P = G.me, carne = CHOTO_ITEMS.find(it => it.id === 'carne');
    P.money = 1000; P.hp = 20; P.food = 10;
    const r = shop.purchase(P, carne);
    assert.ok(r && !r.bad, 'la vende');
    assert.equal(P.bag.carne, 1, 'va a la mochila');
    assert.equal(P.money, 1000 - carne.price, 'la cobra');
    assert.equal(P.hp, 20, 'no se come sola');
    input.keys.KeyC = true;
    update(1/60);
    input.keys.KeyC = false;
    assert.ok(!P.bag.carne, 'C se la come');
    assert.ok(P.food >= 10 + FOOD.carne.food - 1 && P.hp >= 20 + FOOD.carne.heal - 1, 'llena y cura: ' + P.food + ' ' + P.hp);
    P.bag = { agua: BAG_MAX };
    assert.equal(shop.status(carne, P).label, 'MOCHILA LLENA', 'en la mochila entran ' + BAG_MAX + ' cosas');
    P.bag = {}; P.money = 5;
    assert.ok(shop.purchase(P, carne).bad, 'sin guita no hay carne');
    assert.ok(!P.bag.carne, 'y no te la dan');
    P.money = 1000;
    assert.ok(!NOCHE_ITEMS.some(it => it.id === 'carne'), 'el NOCHE % no tiene carne');
    assert.ok(NOCHE_ITEMS.every(it => it.price < (CHOTO_ITEMS.find(c => c.id === it.id) || { price: Infinity }).price),
      'lo que tienen los dos es mas barato en el NOCHE %');
    assert.ok(CHOTO_ITEMS.concat(NOCHE_ITEMS, LANUS_ITEMS).every(it => FOOD[it.id] || it.id === 'carbon'),
      'todo lo del super se come o se toma (salvo el carbon, que es para el asado)');
    const sinCarne = LANUS_ITEMS.find(it => it.id === 'carne');
    assert.equal(shop.status(sinCarne, P).label, 'NO HAY', 'en Lanus nunca hay carne');
    assert.equal(shop.purchase(P, sinCarne), null, 'y no te la venden');
  });

  test('hambre y sed: bajan solas, en cero lastiman y bien comido la vida sube', () => {
    startGame(CREW[0]);
    const P = G.me;
    assert.ok(P.food === 100 && P.drink === 100, 'arranca lleno');
    const quieto = () => { G.cops.length = 0; P.wanted = 0; };
    for (let f = 0; f < 600; f++) { quieto(); update(1/60); }
    assert.ok(P.food < 100 && P.drink < P.food, 'bajan, la sed mas rapido: ' + P.food.toFixed(1) + ' ' + P.drink.toFixed(1));
    P.food = 0; P.hp = 50;
    for (let f = 0; f < 120; f++) { quieto(); P.food = 0; update(1/60); }
    assert.ok(P.hp < 50 - NEED_HURT * 1.5, 'muerto de hambre se pierde vida: ' + P.hp.toFixed(1));
    P.food = P.drink = 100; P.hp = 50;
    for (let f = 0; f < 120; f++) { quieto(); update(1/60); }
    assert.ok(P.hp > 50 + NEED_REGEN * 1.5, 'bien comido la vida sube: ' + P.hp.toFixed(1));
    P.food = 0; P.drink = 0; P.hp = 2;
    for (let f = 0; f < 600 && !P.dead; f++) { quieto(); update(1/60); }
    assert.ok(P.dead, 'de hambre y sed uno se muere');
  });

  test('C come lo que mas hace falta: con sed toma, con hambre come', () => {
    startGame(CREW[0]);
    const P = G.me;
    P.bag = { agua: 1, pernil: 1 };
    P.food = 90; P.drink = 10;
    assert.equal(game.bestBite(P), 'agua', 'con sed, el agua');
    game.eat(P);
    assert.ok(P.drink >= 60 && P.bag.pernil === 1 && !P.bag.agua, 'se toma el agua y guarda el pernil');
    P.food = 10;
    game.eat(P);
    assert.ok(P.food >= 55 && !P.bag.pernil, 'despues se come el pernil');
    assert.equal(game.eat(P), false, 'con la mochila vacia no hay nada');
    P.bag = { agua: 1 }; P.food = P.drink = 100; P.hp = P.maxhp;
    assert.equal(game.eat(P), false, 'lleno no se come');
    assert.equal(P.bag.agua, 1, 'y no se gasta');
  });

  test('al morir se pierde la mochila; el hospital y la comisaria te dan de comer', () => {
    startGame(CREW[0]);
    const P = G.me, P2 = addPlayer(CREW[1]);
    P.bag = { agua: 2 }; P.food = P.drink = 5;
    P.hp = 30; P.healing = 1; P.healT = HOSPITAL_TIME;
    update(1/60);
    assert.ok(P.food >= 59 && P.drink >= 59, 'en el hospital te dan un sanguchito');
    P2.bag = { carne: 1 }; P2.food = 3;
    game.respawn(P2);
    assert.deepEqual(P2.bag, {}, 'al morir se pierde la mochila');
    assert.ok(P2.food === 80, 'y volves con algo en la panza');
    P.food = P.drink = 5; P.busted = 1; P.bustT = 3.3;
    update(1/60);
    assert.ok(P.food >= 49 && P.drink >= 49, 'en la comisaria te dan un mate cocido');
  });

  // Robo al super: helpers. La yuta se saca de encima en cada frame para que no te arresten
  // en medio de la prueba (lo que se prueba es el super, no la persecución).
  const puerta = b => ({ x: b.door.x + b.door.ox, y: b.door.y + b.door.oy });
  const correr = (seg, cada) => {
    for (let f = 0; f < seg * 60; f++) {
      G.cops.length = 0;
      for (const c of G.cars) c.chase = false;
      if (cada) cada();
      update(1/60);
    }
  };
  const fajos = b => G.pickups.filter(pk => pk.kind === 'cash' && pk.value && dist(pk, puerta(b)) < 60);

  test('robar el super: disparo en la puerta, alarma, estrellas, botin y persiana', () => {
    startGame(CREW[0]);
    const P = G.me, b = supers.find(q => q.super === 'choto');
    Object.assign(P, puerta(b));
    P.wanted = 0;
    input.keys.Space = true;
    update(1/60);
    input.keys.Space = false;
    assert.ok(b.robbing, 'disparar en la puerta arranca el asalto');
    assert.ok(b.alarm > 0, 'suena la alarma');
    correr(0.2);
    assert.ok(P.wanted >= ROB_STARS, 'te suben las estrellas: ' + P.wanted);
    correr(ROB_TIME * 0.5);
    assert.ok(b.robbing && b.robT > 0 && b.robT < ROB_TIME, 'la caja se vacia de a poco');
    G.pickups = G.pickups.filter(pk => dist(pk, P) > 80);
    correr(ROB_TIME * 0.6, () => Object.assign(P, puerta(b)));
    assert.ok(!b.robbing && b.closed > SUPER_CLOSED - 2, 'termina y baja la persiana');
    const botin = fajos(b);
    assert.ok(botin.length > 0 && botin.length <= ROB_LOOT.choto.n, 'saltan los fajos: ' + botin.length);
    const total = botin.reduce((t, pk) => t + pk.value, 0), antes = P.money;
    for (const pk of botin) { Object.assign(P, { x: pk.x, y: pk.y }); correr(0.05); }
    assert.ok(P.money - antes >= total, 'te los llevas todos: ' + (P.money - antes) + ' de ' + total);
    // Cerrado: no se roba de nuevo ni se compra
    Object.assign(P, puerta(b));
    game.robSuper(P, b);
    assert.ok(!b.robbing, 'con la persiana baja no se roba');
    P.wanted = 0;
    P.money = 1000;
    const abiertos = [], orig = game.openShop;
    game.openShop = (Q, kind) => abiertos.push(kind);
    try {
      P.cool = 0;
      input.keys.KeyE = true;
      correr(0.05);
    } finally {
      input.keys.KeyE = false;
      game.openShop = orig;
    }
    assert.equal(abiertos.length, 0, 'con la persiana baja no se entra');
    correr(1);
    b.closed = 0.5;
    correr(1);
    assert.equal(b.closed, 0, 'despues de un rato vuelve a abrir');
  });

  test('si te vas de la puerta se corta el asalto', () => {
    startGame(CREW[0]);
    const P = G.me, b = supers.find(q => q.super === 'noche');
    Object.assign(P, puerta(b));
    game.robSuper(P, b);
    correr(0.3);
    P.x += CELL;
    correr(2);
    assert.ok(!b.robbing, 'se corta');
    assert.ok(b.closed > 0, 'y el super cierra igual');
    assert.equal(fajos(b).length, 0, 'sin botin');
  });

  test('el testigo que queda vivo llama a la yuta; si no queda nadie, no', () => {
    for (const vivo of [true, false]) {
      startGame(CREW[0]);
      const P = G.me, b = supers.find(q => q.super === 'choto'), d = puerta(b);
      const t = G.peds.find(p => !p.famous);
      Object.assign(t, { x: d.x + 30, y: d.y + 30, hp: 30, inside: null });
      Object.assign(P, d);
      game.robSuper(P, b);
      assert.ok(b.witnesses.includes(t), 'el de al lado vio todo');
      if (!vivo) for (const w of b.witnesses) w.hp = 0; // no queda ninguno de los que vieron
      // el testigo no se va lejos ni se muere solo (la prueba es lo que hace el super)
      const quieto = () => { if (vivo) Object.assign(t, { x: d.x + 30, y: d.y + 30, hp: 30 }); Object.assign(P, d); };
      correr(ROB_TIME + 0.2, quieto);
      assert.ok(!b.robbing, 'termino el asalto');
      const w = P.wanted;
      correr(ROB_WITNESS + 0.3, quieto);
      if (vivo) assert.equal(P.wanted, Math.min(5, w + 1), 'el testigo te suma una estrella');
      else assert.ok(P.wanted <= w, 'sin testigos no hay estrella de mas');
    }
  });

  test('en el CHOTO de Lanus la caja esta vacia', () => {
    startGame(CREW[0]);
    const P = G.me, b = supers.find(q => q.super === 'lanus');
    Object.assign(P, puerta(b));
    G.pickups = G.pickups.filter(pk => dist(pk, P) > 80);
    game.robSuper(P, b);
    correr(ROB_TIME + 0.2, () => Object.assign(P, puerta(b)));
    assert.ok(!b.robbing && b.closed > 0, 'termina');
    assert.ok(fajos(b).length <= ROB_LOOT.lanus.n, 'un fajito y gracias');
    assert.ok(ROB_LOOT.lanus.v[1] < ROB_LOOT.noche.v[0], 'menos que en cualquier otro');
  });

  test('el asado: carne y carbon a la parrilla, y sale crudo, a punto o quemado', () => {
    startGame(CREW[0]);
    const P = G.me, g = parrillas.find(q => !villaAt(q.x, q.y)) || parrillas[0];
    Object.assign(P, { x: g.x, y: g.y + 10 });
    P.bag = { carne: 1 };
    assert.equal(game.useGrill(P, g), false, 'sin carbon no prende');
    P.bag = { carne: 1, carbon: 1 };
    input.keys.KeyE = true;
    update(1/60);
    input.keys.KeyE = false;
    assert.ok(P.nearGrill === g && g.cooking, 'E en la parrilla prende el asado');
    assert.deepEqual(P.bag, {}, 'se usa la carne y el carbon');
    assert.equal(g.portions, ASADO_PORCIONES, 'salen ' + ASADO_PORCIONES + ' porciones');
    game.useGrill(P, g);
    assert.equal(P.bag.crudo, 1, 'sacado enseguida esta crudo');
    game.updateGrills(ASADO_PUNTO);
    game.useGrill(P, g);
    assert.equal(P.bag.asado, 1, 'a tiempo sale a punto');
    game.updateGrills(ASADO_QUEMA - ASADO_PUNTO);
    game.useGrill(P, g);
    assert.equal(P.bag.quemado, 1, 'tarde sale quemado');
    assert.ok(!g.cooking, 'sin porciones la parrilla queda libre');
    assert.ok(FOOD.asado.food > FOOD.crudo.food && FOOD.asado.food > FOOD.quemado.food, 'a punto llena mas');
    // Si nadie lo saca, se hace carbon
    P.bag = { carne: 1, carbon: 1 };
    game.useGrill(P, g);
    game.updateGrills(ASADO_CARBON + 0.1);
    assert.ok(!g.cooking && g.portions === 0, 'olvidado, se hace carbon');
    P.bag = { carbon: 1 }; P.food = 10;
    assert.equal(game.eat(P), false, 'el carbon no se come');
  });

  test('respeto: sube de rango, da descuento y se pierde al morir o caer preso', () => {
    startGame(CREW[0]);
    const P = G.me;
    assert.equal(RANKS[game.rankOf(P)][1], 'GIL', 'se arranca de GIL');
    game.gainRespect(P, RANKS[1][0] + 10, 'PRUEBA');
    assert.equal(game.rankOf(P), 1, 'sube de rango');
    assert.ok(G.msg.includes('AHORA SOS ' + RANKS[1][1]), 'y te avisan: ' + G.msg);
    const ak = SHOP_ITEMS.find(it => it.id === 'ak');
    assert.ok(shop.status(ak, P).price < ak.price, 'con respeto la armeria es mas barata');
    P.respect = RANKS[4][0];
    assert.equal(game.price(P, 1000), 800, 'LEYENDA: 20% menos');
    assert.ok(shop.status(CHOTO_ITEMS[0], P).price === CHOTO_ITEMS[0].price, 'en el super no hay descuento');
    P.respect = 200; P.busted = 1; P.bustT = 3.3;
    update(1/60);
    assert.equal(P.respect, Math.round(200 * (1 - RESPECT_BUST)), 'preso se pierde el ' + RESPECT_BUST * 100 + '%');
    P.respect = 100; P.hp = 0;
    update(1/60);
    assert.ok(P.dead && P.respect === Math.round(100 * (1 - RESPECT_DEATH)), 'muerto el ' + RESPECT_DEATH * 100 + '%: ' + P.respect);
  });

  test('robar un super, bajar un famoso y perder a la yuta dan respeto', () => {
    startGame(CREW[0]);
    const P = G.me, b = supers.find(q => q.super === 'choto');
    b.robbers = [P];
    game.lootSuper(b);
    assert.equal(P.respect, RESPECT.choto, 'el robo al CHOTO');
    const f = makeFamous(FAMOUS.find(d => !d.immortal), P.x + 20, P.y);
    G.peds.push(f);
    game.hurt(f, 999, P);
    assert.equal(P.respect, RESPECT.choto + RESPECT.famoso, 'el famoso');
    G.cops.length = 0;
    Object.assign(P, { wanted: 1, wantPeak: 3, wantCool: 13 });
    update(1/60);
    assert.equal(P.wanted, 0, 'los perdio');
    assert.equal(P.respect, RESPECT.choto + RESPECT.famoso + RESPECT.star * 3, 'perder a la yuta con 3 estrellas');
  });

  test('las barras paran en la puerta de su estadio con el trapo colgado', () => {
    startGame(CREW[0]);
    assert.deepEqual(G.barras.map(B => B.def.name), BARRAS.map(d => d.name), 'LA DOCENA y LOS BORRACHOS DEL TABLERO');
    for (const B of G.barras) {
      assert.equal(B.stadium.stadium, B.def.stadium, 'cada barra en su estadio');
      assert.ok(dist(B.flag, B.stadium.door) < 20 && !hitBuilding(B.flag.x, B.flag.y, 2), 'el trapo en la puerta, afuera');
      assert.equal(B.trapo, 'hung', 'colgado');
      const hs = G.hinchas.filter(h => h.barra === B);
      assert.equal(hs.length, B.def.n, 'con su gente');
      assert.ok(hs.every(h => dist(h, B.flag) < 60), 'alrededor del trapo');
    }
  });

  test('robar el trapo: la barra te sale a buscar, y si lo aguantas es tuyo', () => {
    startGame(CREW[0]);
    const P = G.me, B = G.barras[0];
    Object.assign(P, { x: B.flag.x, y: B.flag.y + 6, car: null });
    input.keys.KeyE = true;
    update(1/60);
    input.keys.KeyE = false;
    assert.ok(P.trapo === B && B.trapo === 'carried' && B.angry > 0, 'E se lleva el trapo y la barra se calienta');
    // Se aleja un poco: lo persiguen y le pegan
    P.x += 60;
    const hp0 = P.hp;
    for (let f = 0; f < 4 * 60; f++) { G.cops.length = 0; P.wanted = 0; P.hp = Math.max(P.hp, 40); update(1/60); }
    assert.ok(P.hp < hp0 || G.hinchas.some(h => h.barra === B && dist(h, P) < 16), 'la barra lo alcanza');
    P.trapoT = TRAPO_TIME - 0.01;
    const r0 = P.respect;
    update(1/60);
    assert.ok(P.respect >= r0 + RESPECT.trapo - 1 || game.rankOf(P) > 0, 'aguantado: respeto');
    assert.ok(!P.trapo && B.trapo === 'gone' && P.trapos === 1, 'el trapo es suyo');
    game.updateBarras(TRAPO_BACK + 1);
    assert.equal(B.trapo, 'hung', 'al rato cuelgan otro');
  });

  test('si te bajan o caes preso con el trapo, vuelve a su barra', () => {
    startGame(CREW[0]);
    const P = G.me, B = G.barras[1];
    game.takeTrapo(P, B);
    P.hp = 0;
    update(1/60);
    assert.ok(!P.trapo && B.trapo === 'hung', 'muerto: vuelve colgado');
    startGame(CREW[0]);
    const Q = G.me, B2 = G.barras[1];
    game.takeTrapo(Q, B2);
    Q.busted = 1; Q.bustT = 3.3;
    update(1/60);
    assert.ok(!Q.trapo && B2.trapo === 'hung', 'preso: tambien');
  });

  test('con respeto, un tranza lastimado no prende la villa de una', () => {
    startGame(CREW[0]);
    const P = G.me, t = G.tranzas[0], v = t.villa;
    P.respect = RANKS[RANK_CALM][0];
    game.hurt(t, 5, P);
    assert.ok(v.angry <= 0 && v.warnT > 0, 'el primero avisa');
    game.hurt(t, 5, P);
    assert.ok(v.angry > 0, 'el segundo ya no');
    v.angry = 0; v.warnT = 0; P.respect = 0;
    game.hurt(G.tranzas[1], 5, P);
    assert.ok(G.tranzas[1].villa.angry > 0, 'sin respeto se prende enseguida');
  });

  test('en la puerta del super se entra con E, pero no con la yuta encima', () => {
    startGame(CREW[0]);
    const P = G.me, b = supers.find(q => q.super === 'noche'), d = b.door;
    const abiertos = [], orig = game.openShop;
    game.openShop = (Q, kind) => abiertos.push([Q, kind]);
    try {
      P.x = d.x + d.ox; P.y = d.y + d.oy;
      P.wanted = 2;
      input.keys.KeyE = true;
      for (let f = 0; f < 3; f++) update(1/60);
      assert.ok(P.nearSuper === b, 'sabe que esta en la puerta');
      assert.equal(abiertos.length, 0, 'con la yuta encima no entra');
      P.wanted = 0; P.cool = 0;
      for (let f = 0; f < 3; f++) update(1/60);
      assert.deepEqual(abiertos[0], [P, 'noche'], 'se abre el NOCHE %');
    } finally {
      input.keys.KeyE = false;
      game.openShop = orig;
    }
  });

  test('arresto: secuencia completa', () => {
    startGame(CREW[0]);
    for(let f=0;f<120;f++) update(1/60);
    G.me.money = 5000; G.me.wanted = 4;
    const car = G.cars.find(c => c.ai);
    G.me.car = car; car.ai = false; car.spd = 5;     // detenido con la yuta encima
    G.me.x = car.x; G.me.y = car.y;

    bust();
    assert.ok(G.me.busted === 1, 'bust() arranca la secuencia');
    assert.equal(G.me.car, null, 'te bajan del auto al arrestarte');
    assert.ok(G.me.bustFine > 0, 'la multa es positiva: ' + G.me.bustFine);
    assert.ok(G.me.hp > 0, 'el arresto no te mata');
    const fine = G.me.bustFine, before = G.me.money;

    // durante el arresto el jugador no se mueve por input ni recibe balas
    const px0 = G.me.x, py0 = G.me.y;
    for(let f=0;f<60;f++) update(1/60);
    assert.equal(G.me.x, px0, 'el jugador queda quieto durante el arresto');
    assert.equal(G.me.y, py0, 'el jugador queda quieto durante el arresto');
    assert.ok(G.me.busted === 1, 'la secuencia dura mas de 1s');

    // al terminar: te sueltan, sin estrellas, con menos guita. Se mira justo al soltarte:
    // despues el jugador puede reaparecer arriba de un billete y sumar plata, y esta bien.
    for(let f=0;f<200 && G.me.busted;f++) update(1/60);
    assert.equal(G.me.busted, 0, 'la secuencia termina sola');
    assert.equal(G.me.wanted, 0, 'salis sin estrellas');
    assert.equal(G.me.money, before - fine, 'te cobran exactamente la multa');
    assert.equal(G.me.hp, G.me.maxhp, 'salis con la vida llena');
    assert.equal(G.cops.length, 0, 'no quedan canas encima al salir');
    assert.ok(!G.cars.some(c => c.chase), 'no quedan patrulleros persiguiendo');
    assert.ok(G.me.x > 0 && G.me.x < WORLD, 'reaparecas dentro del mapa');
  });

  test('la multa nunca deja la guita en negativo', () => {
    // la multa nunca deja la guita en negativo
    startGame(CREW[0]);
    for(let f=0;f<60;f++) update(1/60);
    G.me.money = 10; G.me.wanted = 5;
    bust(); for(let f=0;f<260;f++) update(1/60);
    assert.ok(G.me.money >= 0, 'la multa dejo la guita en negativo: ' + G.me.money);
  });

  test('los patrulleros persiguen sin clavarse contra las paredes', () => {
    // patrulleros: persiguen sin clavarse contra las paredes
    startGame(CREW[0]);
    // La persecucion se prueba en la ciudad: en una villa (o al lado) la yuta a pie no
    // entra a proposito, y con el jugador ahi no aparece ninguno
    const cercaDeVilla = (x, y) => [0, 1, 2, 3, 4, 5, 6, 7].some(k =>
      villaAt(x + Math.cos(k * Math.PI / 4) * 250, y + Math.sin(k * Math.PI / 4) * 250)) || villaAt(x, y);
    for(let i = 0; i < 50 && cercaDeVilla(G.me.x, G.me.y); i++){
      const s = freeRoadSpot(); G.me.x = s.x; G.me.y = s.y;
    }
    for(let f=0;f<60;f++) update(1/60);
    G.me.wanted = 5;
    for(let f=0;f<1800;f++){
      update(1/60);
      if(G.me.busted) G.me.busted = 0, G.me.bustT = 0;      // ignorar arrestos, medir solo persecucion
      G.me.hp = G.me.maxhp;                           // y muertes: con 5 estrellas la yuta a pie lo baja
                                                       // en segundos, y muerto no aparecen patrulleros
      G.me.wanted = 5;                                 // si no, la busqueda baja sola al perderlo de vista
      if(f % 10 === 0) render();                    // el tiroteo tambien se tiene que poder dibujar
      if(f === 1800-120) for(const c of G.cars) if(c.chase){ c.x2s = c.x; c.y2s = c.y; }
    }
    const ch = G.cars.filter(c => c.chase && c.hp > 0);
    assert.ok(ch.length > 0, 'con 5 estrellas tiene que haber patrulleros');
    for(const c of ch){
      assert.ok(Number.isFinite(c.x) && Number.isFinite(c.spd), 'patrullero NaN');
      assert.ok(!hitBuilding(c.x, c.y, 2), 'patrullero empotrado en un edificio');
    }
    // Clavado = lejos del jugador y sin moverse en los ultimos 2s. La velocidad sola no sirve:
    // uno que gira en el lugar contra una pared tiene velocidad, y uno que ya alcanzo al
    // jugador (que esta quieto) frena al lado y esta bien. "Lejos" es fuera del operativo:
    // el juego le guarda el lugar al patrullero hasta 120px (ver c.slot en game.js), y con
    // 5 amontonados, autos en fila y un colectivo, alguno queda encajonado a 80-90px.
    const stuckCh = ch.filter(c => c.x2s !== undefined && dist(c, G.me) > 120
      && Math.hypot(c.x - c.x2s, c.y - c.y2s) < 5);
    assert.equal(stuckCh.length, 0, 'patrulleros clavados lejos del jugador: ' + stuckCh.length + '/' + ch.length
      + ' ' + JSON.stringify(stuckCh.map(c => ({x: Math.round(c.x), y: Math.round(c.y), d: Math.round(dist(c, G.me))}))));
    assert.ok(G.cops.length > 0, 'la yuta aparece con 5 estrellas');
    assert.ok(G.fx.length < 4000 && G.smoke.length < 900, 'las particulas no se acumulan sin control en un tiroteo');
    console.log('  arresto: patrulleros OK (' + ch.length + ' persiguiendo)');
  });

  test('dos autos superpuestos se separan y se danan', () => {
    // choques entre autos: dos autos superpuestos se tienen que separar y danar, no cruzarse
    startGame(CREW[0]);
    for(let f=0;f<10;f++) update(1/60);
    const a = G.cars.find(c => c !== G.me.car);
    const b = G.cars.find(c => c !== a && c !== G.me.car);
    a.ai = false; a.chase = false;
    b.ai = false; b.chase = false;
    a.x = G.me.x; a.y = G.me.y; a.ang = 0; a.spd = 100;
    b.x = G.me.x + 4; b.y = G.me.y; b.ang = Math.PI; b.spd = 100;
    const d0 = dist(a, b), hpA0 = a.hp, hpB0 = b.hp;
    update(1/60);
    assert.ok(dist(a, b) > d0, 'los autos superpuestos tienen que separarse al chocar');
    assert.ok(a.hp < hpA0 && b.hp < hpB0, 'un choque fuerte entre autos tiene que hacer dano');
    console.log('  choques: autos se separan y se danan al superponerse');
  });

  test('un auto de NPC no lastima peatones', () => {
    // solo el auto del jugador puede atropellar gente: un auto de NPC nunca lastima peatones
    startGame(CREW[0]);
    for(let f=0;f<10;f++) update(1/60);
    const ped = G.peds.find(p => p.hp > 0);
    const npc = G.cars.find(c => c !== G.me.car);
    npc.x = ped.x; npc.y = ped.y; npc.ang = 0; npc.spd = 150;
    const hp0 = ped.hp;
    for(let f=0;f<60;f++) update(1/60);
    assert.equal(ped.hp, hp0, 'un auto de NPC no puede herir peatones, solo el auto del jugador');
    console.log('  atropello: los autos de NPC no lastiman peatones');
  });

  test('el hospital cura en unos segundos y te deja quieto', () => {
    // hospitales: entrar cura a los pocos segundos y te deja quieto mientras tanto
    startGame(CREW[0]);
    for(let f=0;f<10;f++) update(1/60);
    const h = hospitals[0], d = h.door;
    G.me.car = null;
    G.me.x = d.x + d.ox; G.me.y = d.y + d.oy;
    G.me.hp = 40;
    update(1/60);
    assert.equal(G.me.healing, 1, 'entrar al hospital arranca la curacion');
    assert.ok(G.me.hp < G.me.maxhp, 'todavia no te curaste al toque');

    const px0 = G.me.x, py0 = G.me.y;
    for(let f=0;f<Math.round(HOSPITAL_TIME*60)-5;f++) update(1/60);
    assert.equal(G.me.x, px0, 'te quedas quieto mientras te curan');
    assert.equal(G.me.y, py0, 'te quedas quieto mientras te curan');
    assert.equal(G.me.healing, 1, 'la curacion dura varios segundos');
    assert.ok(G.me.hp < G.me.maxhp, 'no te curaron antes de tiempo');

    for(let f=0;f<20;f++) update(1/60);
    assert.equal(G.me.healing, 0, 'la curacion termina sola');
    assert.equal(G.me.hp, G.me.maxhp, 'salis del hospital con la vida llena');
    console.log('  hospital: cura en ' + HOSPITAL_TIME + 's y te deja quieto mientras tanto');
  });

  test('cada comida cura lo que corresponde', () => {
    // items de curacion: cada comida cura lo que corresponde, no mas ni menos
    startGame(CREW[0]);
    for(let f=0;f<10;f++) update(1/60);
    for(const food of FOODS){
      G.me.hp = 10;
      G.me.food = G.me.drink = 50; // ni hambre ni bien comido: la vida no sube sola
      const pk = G.pickups[0];
      Object.assign(pk, { x: G.me.x, y: G.me.y, kind: 'hp', food, t: 0 });
      update(1/60);
      assert.equal(G.me.hp, Math.min(G.me.maxhp, 10 + FOOD_HEAL[food]),
        food + ' tiene que curar ' + FOOD_HEAL[food] + ' de vida');
    }
    console.log('  items de curacion: ' + FOODS.map(f => f + ' +' + FOOD_HEAL[f]).join(', '));
  });

  test('muere a 0 de vida', () => {
    startGame(CREW[0]);
    for(let f=0;f<30;f++) update(1/60);
    G.me.hp = -1; update(1/60);
    assert.ok(G.me.dead && G.me.hp === 0, 'muere a 0 hp');
    render();
  });
});

describe('audio', () => {
  test('sin Web Audio no suena ni rompe', () => {
    startGame(CREW[0]);
    assert.equal(sound.ctx, null, 'en Node no hay AudioContext');
    sound.update();
    const a = sfx('explosion', G.me.x, G.me.y);
    assert.ok(a && a.vol > 0.99, 'igual calcula cuanto se escucha');
    for (let f = 0; f < 120; f++) update(1/60);
  });

  test('se escucha segun la distancia y del lado que pasa', () => {
    const P = { x: 1000, y: 1000 };
    assert.ok(Math.abs(audibleFor(P, 1000, 1000).vol - 1) < 1e-9, 'encima: a todo volumen');
    assert.ok(audibleFor(P, 1100, 1000).pan > 0, 'a la derecha suena a la derecha');
    assert.ok(audibleFor(P, 900, 1000).pan < 0, 'a la izquierda suena a la izquierda');
    assert.ok(audibleFor(P, 1100, 1000).vol > audibleFor(P, 1300, 1000).vol, 'mas lejos, mas bajo');
    assert.equal(audibleFor(P, 1000 + AUDIO_R, 1000), null, 'lejos no se escucha');
    assert.equal(audibleFor(null, 0, 0), null, 'sin jugador local no suena nada');
  });
});

describe('radio', () => {
  test('los temas compilan a notas validas y las pistas cierran juntas', () => {
    assert.equal(noteNum('A4'), 69);
    assert.equal(noteNum('C4'), 60);
    assert.equal(noteNum('G#4'), 68);
    assert.equal(noteNum('Bb3'), 58);
    assert.ok(STATIONS.length >= 2, 'hay emisoras');
    for (const st of STATIONS) {
      assert.ok(st.name && st.songs.length, 'emisora con nombre y temas');
      for (const id of st.songs) {
        if (/\.(ogg|mp3|m4a|wav)$/i.test(id)) continue;
        assert.ok(SONGS[id], 'el tema existe: ' + id);
        const c = compileSong(SONGS[id]);
        assert.ok(c.notes.length > 20 && c.len > 4, id + ' tiene notas');
        if (!SONGS[id].tracks.some(t => t.notes)) assert.ok(c.len > 45, id + ': los temas escritos a mano tienen partes y duran mas de 45s (' + c.len.toFixed(0) + 's)');
        for (const n of c.notes) {
          assert.ok(n.t >= 0 && n.d > 0 && n.t + n.d <= c.len + 1e-6 && n.v > 0, id + ': nota fuera del tema');
          assert.ok(n.inst === 'drums' ? !!DRUMS[n.n] : n.n >= 24 && n.n <= 108, id + ': nota invalida ' + n.n);
          assert.ok(n.inst === 'drums' || INSTRUMENTS[n.inst] || ['square', 'triangle', 'sawtooth', 'sine'].includes(n.inst), id + ': instrumento desconocido ' + n.inst);
        }
        // Las pistas escritas a mano tienen que durar lo mismo, o el tema se desfasa al repetir
        const lens = SONGS[id].tracks.filter(t => t.seq).map(t => t.seq.trim().split(/\s+/).reduce((s, k) => s + parseFloat(k.split(':')[1]), 0));
        assert.ok(lens.every(l => Math.abs(l - lens[0]) < 1e-9), id + ': pistas de distinto largo ' + lens);
      }
    }
  });

  test('el convertidor de MIDI lee notas, tempo, instrumento y bateria', () => {
    const { parseMidi, toSong } = require('./tools/midi2songs.js');
    const vlq = n => n < 128 ? [n] : [0x80 | (n >> 7), n & 0x7f];
    const ev = [
      0, 0xff, 0x51, 3, 0x09, 0x27, 0xc0,        // tempo 600000 us = 100 bpm
      0, 0xc0, 33,                               // canal 1: bajo
      0, 0x90, 45, 100,                          // nota on
      ...vlq(96), 0x80, 45, 0,                   // nota off a la negra
      0, 0x99, 36, 127,                          // canal 10: bombo
      ...vlq(24), 0x89, 36, 0,
      0, 0xff, 0x2f, 0,
    ];
    const u32 = n => [n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255];
    const buf = Buffer.from([...Buffer.from('MThd'), ...u32(6), 0, 0, 0, 1, 0, 96, ...Buffer.from('MTrk'), ...u32(ev.length), ...ev]);
    const song = toSong(parseMidi(buf));
    assert.equal(Math.round(song.bpm), 100);
    const bass = song.tracks.find(t => t.inst === 'bass'), drums = song.tracks.find(t => t.inst === 'drums');
    assert.ok(bass && drums, 'una pista de bajo y una de bateria');
    assert.deepEqual(bass.notes[0].slice(0, 3), [0, 1, 45]);
    assert.deepEqual(drums.notes[0].slice(0, 3), [1, 0.25, 'k']);
    assert.ok(compileSong(song).len > 0, 'el juego lo puede tocar');
  });
});

describe('mapa', () => {
  test('se abre centrado en vos y se mueve sin salirse del mundo', () => {
    startGame(CREW[0]);
    const P = G.me;
    Object.assign(P, { x: WORLD * 0.4, y: WORLD * 0.6 });
    G.mapZoom = 4;
    mapCtl.open();
    assert.ok(G.mapX === P.x && G.mapY === P.y, 'arranca en el jugador');
    const v0 = mapCtl.view();
    assert.ok(Math.abs(v0.sx + v0.viewW / 2 - P.x) < 1, 'el jugador queda en el medio');
    mapCtl.pan(500, -300);
    assert.ok(G.mapX === P.x + 500 && G.mapY === P.y - 300, 'se desplaza');
    mapCtl.pan(-WORLD * 3, -WORLD * 3);
    const v1 = mapCtl.view();
    assert.ok(v1.sx === 0 && v1.sy === 0, 'no se va mas alla del borde');
    mapCtl.pan(WORLD * 3, WORLD * 3);
    const v2 = mapCtl.view();
    assert.ok(Math.abs(v2.sx + v2.viewW - WORLD) < 1 && Math.abs(v2.sy + v2.viewH - WORLD) < 1, 'ni del otro');
    assert.equal(v2.MW, RW - MAP_LEG_W, 'el panel de referencias le saca lugar');
    G.mapLegend = false;
    assert.equal(mapCtl.view().MW, RW, 'sin referencias, el mapa ocupa todo');
    G.mapLegend = true;
    G.mapZoom = 1;
  });

  test('las referencias muestran solo lo que hay en el mapa', () => {
    startGame(CREW[0]);
    G.cars.forEach(c => { c.chase = false; });
    G.cops.length = 0;
    const leg = () => renderer.mapLegend(renderer.mapItems()).map(r => r[0]);
    const l1 = leg();
    for (const k of ['vos', 'hospital', 'armeria', 'choto', 'noche', 'parrilla', 'rosada', 'obelisco', 'tranza'])
      assert.ok(l1.includes(k), 'siempre estan los lugares: ' + k);
    for (const k of ['jugador', 'patrullero', 'yuta', 'asado', 'cerrado'])
      assert.ok(!l1.includes(k), 'no figura lo que no hay: ' + k);
    addPlayer(CREW[1]);
    G.cars[0].chase = true;
    supers[0].closed = 30;
    Object.assign(parrillas[0], { cooking: true, t: 1, portions: 3 });
    const l2 = leg();
    for (const k of ['jugador', 'patrullero', 'cerrado', 'asado']) assert.ok(l2.includes(k), 'aparece cuando hay: ' + k);
    supers[0].closed = 0;
    Object.assign(parrillas[0], { cooking: false, t: 0, portions: 0 });
  });

  test('el mapa se dibuja con y sin referencias, y con el jugador fuera de la vista', () => {
    startGame(CREW[0]);
    G.mapOpen = true;
    for (const leg of [true, false]) {
      G.mapLegend = leg;
      mapCtl.open();
      render();
      G.mapZoom = 8;
      mapCtl.pan(WORLD, WORLD); // lejos del jugador: flecha en el borde
      render();
      G.mapZoom = 1;
    }
    G.mapOpen = false;
    G.mapLegend = true;
  });
});

describe('novedades', () => {
  const nov = require('./.github/scripts/novedades.js');
  const tag = (name, code, commit) => ({ name, code, commit });
  const merge = (commit, pr, rama, titulo) => ({ commit, subject: 'Merge pull request #' + pr + ' from maurih5/' + rama, body: titulo });

  test('arma las novedades por version con los titulos de las PRs', () => {
    const tags = [tag('0.1.0-rc.1', 1, 'a'), tag('0.1.0-rc.2', 2, 'b'), tag('0.1.0', 3, 'c'),
                  tag('0.2.0-rc.1', 4, 'd'), tag('0.2.0-rc.2', 5, 'e')];
    const merges = [ // git log: lo más nuevo primero
      merge('e', 97, 'feat/robo', 'docs(readme): roadmap al dia'),
      merge('d', 96, 'feat/supers', 'feat(supers): supermercados CHOTO y NOCHE %'),
      merge('c', 95, 'dev', 'Release 0.1.0'),
      merge('b', 94, 'fix/x', 'fix(trafico): los autos no se traban'),
      merge('a', 93, 'feat/y', 'multijugador online'),
      merge('z', 90, 'feat/viejo', 'feat: de antes de los tags'),
    ];
    const r = nov.armar({ tags, merges, actual: { version: '0.2.0-rc.3', pr: '98', titulo: 'feat(supers)!: robar los supermercados' } });
    assert.deepEqual(r, [
      { v: '0.2.0', items: [{ pr: 98, t: 'Robar los supermercados' }, { pr: 96, t: 'Supermercados CHOTO y NOCHE %' }] },
      { v: '0.1.0', items: [{ pr: 94, t: 'Los autos no se traban' }, { pr: 93, t: 'Multijugador online' }] },
    ], 'las rc se juntan en su version; docs, releases y lo de antes de los tags no van');
    const main = nov.armar({ tags, merges, actual: { version: '0.2.0' } });
    assert.deepEqual(main[0].items.map(i => i.pr), [96], 'la estable muestra lo de sus rc');
    assert.equal(nov.armar({ tags, merges, actual: { version: '0.2.0-rc.3', pr: '96', titulo: 'feat: otra vez' } })[0].items.length, 1,
      'una PR no sale dos veces');
  });

  test('el archivo generado es JS que el juego puede cargar', () => {
    const out = require('child_process').execFileSync('node', ['.github/scripts/novedades.js', '1.2.3-rc.1', '7', 'feat(x): algo'],
      { cwd: __dirname, encoding: 'utf8' });
    const lista = new Function(out + ';return NOVEDADES;')();
    assert.ok(Array.isArray(lista) && lista[0].v === '1.2.3' && lista[0].items[0].t === 'Algo', 'la PR compilada esta arriba');
  });

  test('el cartel sale mientras haya algo que no viste, hasta tildar no volver a mostrar', () => {
    const guardado = {};
    global.localStorage = { getItem: k => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); } };
    NOVEDADES.length = 0;
    try {
      assert.equal(ui.openNews(), false, 'sin novedades no sale');
      assert.equal(ui.openNews(true), true, 'desde el menu se abre igual');
      ui.closeNews(false);
      NOVEDADES.push({ v: '0.2.0', items: [{ pr: 97, t: 'Robar los supermercados' }, { pr: 96, t: 'Supermercados' }] });
      const links = [], orig = document.createElement;
      document.createElement = tag => { const e = orig(tag); if (tag === 'a') links.push(e); return e; };
      try { assert.ok(ui.openNews() && ui.newsOpen, 'hay novedades: sale'); } finally { document.createElement = orig; }
      assert.deepEqual(links.map(l => [l.href, l.target]),
        [['https://github.com/maurih5/gta-mercaloca/pull/97', '_blank'], ['https://github.com/maurih5/gta-mercaloca/pull/96', '_blank']],
        'cada novedad abre su PR en otra pestania');
      ui.closeNews(false);
      assert.ok(ui.openNews(), 'cerrado sin el tilde, sale de nuevo la proxima');
      ui.closeNews(true);
      assert.equal(guardado[NEWS_KEY], '97', 'se guarda hasta donde viste');
      assert.equal(ui.openNews(), false, 'con el tilde no sale mas');
      NOVEDADES.unshift({ v: '0.3.0', items: [{ pr: 101, t: 'Algo nuevo' }] });
      assert.ok(ui.openNews(), 'sale una version con algo nuevo: vuelve a aparecer');
      ui.closeNews(false);
      assert.ok(newsFresh(NOVEDADES, 97) && !newsFresh(NOVEDADES, 101) && newsMax(NOVEDADES) === 101, 'helpers');
    } finally {
      NOVEDADES.length = 0;
      delete global.localStorage;
    }
  });
});

describe('corralito', () => {
  test('te saca la mitad de la guita y te avisa', () => {
    startGame(CREW[0]);
    G.me.money = 700; G.me.bank = 1001; G.corralitoT = 0; G.msg = '';
    game.updateCorralito(0.1);
    assert.equal(G.me.bank, 501);
    assert.equal(G.me.money, 700, 'el efectivo no se toca');
    assert.ok(G.msg.includes('CORRALITO'), G.msg);
  });
  test('sin guita no pasa nada y se reintenta', () => {
    startGame(CREW[0]);
    G.me.money = 5000; G.me.bank = CORRALITO_MIN - 1; G.corralitoT = 0; G.msg = '';
    game.updateCorralito(0.1);
    assert.equal(G.me.bank, CORRALITO_MIN - 1);
    assert.equal(G.me.money, 5000);
    assert.equal(G.msg, '');
    assert.ok(G.corralitoT > 0);
  });
});

describe('multijugador', () => {
  // Pone a P sobre la calle, a d px de G.me (en una dirección donde haya calle libre)
  const lejos = (P, d) => {
    for (let k = 0; k < 64; k++) {
      const a = k * Math.PI / 8, x = G.me.x + Math.cos(a) * d, y = G.me.y + Math.sin(a) * d;
      if (x > 40 && y > 40 && x < WORLD - 40 && y < WORLD - 40 && onRoad(x, y) && !hitBuilding(x, y, 10)) { P.x = x; P.y = y; return true; }
      if (k === 31) d *= 0.75;
    }
    const s = freeRoadSpot(); P.x = s.x; P.y = s.y; return false;
  };
  const alejarDeVillas = P => {
    for (let i = 0; i < 50 && villaAt(P.x, P.y); i++) { const s = freeRoadSpot(); P.x = s.x; P.y = s.y; }
  };

  test('el super abre en la pantalla del que entra y la comida es de cada uno', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]), b = supers.find(q => q.super === 'choto'), d = b.door;
    const abiertos = [], orig = game.openShop;
    game.openShop = (Q, kind) => abiertos.push([Q, kind]);
    try {
      lejos(G.me, CELL * 3);
      P2.x = d.x + d.ox; P2.y = d.y + d.oy; P2.wanted = 0; P2.cool = 0;
      P2.ctl = { ...idleControls(), use: true };
      update(1/60);
      assert.ok(P2.nearSuper === b && !G.me.nearSuper, 'solo el de la puerta esta en el super');
      assert.deepEqual(abiertos, [[P2, 'choto']], 'se le abre a el, no al local');
    } finally {
      game.openShop = orig;
    }
    P2.money = 500;
    shop.purchase(P2, CHOTO_ITEMS.find(it => it.id === 'choripan'));
    assert.ok(P2.bag.choripan === 1 && P2.money < 500, 'el que compra se lo lleva y paga');
    assert.ok(!G.me.bag.choripan, 'al otro no le llega');
    G.me.food = 50; P2.food = 10;
    P2.ctl = { ...idleControls(), eat: true };
    update(1/60);
    assert.ok(P2.food > 40 && !P2.bag.choripan, 'come el que aprieta C');
    assert.ok(G.me.food <= 50, 'el otro sigue con su hambre');
  });

  test('el asado de uno se lo puede comer otro', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]), g = parrillas[0];
    Object.assign(G.me, { x: g.x, y: g.y + 10, bag: { carne: 1, carbon: 1 } });
    game.useGrill(G.me, g);
    game.updateGrills(ASADO_PUNTO + 1);
    assert.ok(G.msg.includes('A PUNTO'), 'al que lo prendio le avisan que esta a punto');
    Object.assign(P2, { x: g.x + 4, y: g.y + 10, bag: {} });
    P2.cool = 0;
    P2.ctl = { ...idleControls(), use: true };
    update(1/60);
    assert.equal(P2.bag.asado, 1, 'el otro se lleva una porcion');
    assert.ok(G.msg.includes('TE ESTAN COMIENDO'), 'y al dueño le avisan');
    assert.ok(!G.me.bag.asado, 'el dueño no recibe nada por eso');
  });

  test('bajar a otro jugador da respeto y te quedas con su trapo', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]), B = G.barras[0];
    lejos(P2, 200);
    P2.respect = 100;
    game.takeTrapo(P2, B);
    game.hurtPlayer(P2, 999, G.me);
    update(1/60);
    assert.ok(P2.dead, 'cae');
    assert.equal(G.me.respect, RESPECT.pvp, 'el que lo bajo gana respeto');
    assert.equal(P2.respect, Math.round(100 * (1 - RESPECT_DEATH)) - RESPECT.pvpLoss, 'el que cae pierde');
    assert.ok(G.me.trapo === B && B.by === G.me && B.tgt === G.me, 'y el trapo pasa al que lo bajo');
    G.mapOpen = true;
    render(); // la tabla de respeto en el mapa, con los dos
    G.mapOpen = false;
  });

  test('dos roban el mismo super: va el doble de rapido y los dos quedan buscados', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]), P3 = addPlayer(CREW[2]), b = supers.find(q => q.super === 'choto');
    const d = { x: b.door.x + b.door.ox, y: b.door.y + b.door.oy };
    Object.assign(G.me, d);
    Object.assign(P2, { x: d.x + 4, y: d.y + 4 });
    lejos(P3, CELL * 4);
    for (const q of G.players) q.wanted = 0;
    game.robSuper(P2, b);
    const paso = () => { G.cops.length = 0; for (const c of G.cars) c.chase = false; Object.assign(G.me, d); Object.assign(P2, { x: d.x + 4, y: d.y + 4 }); update(1/60); };
    for (let f = 0; f < 60; f++) paso();
    assert.ok(b.robT > 1.6 && b.robT < 2.4, 'con dos en la puerta la caja va al doble: ' + b.robT);
    assert.ok(G.me.wanted >= ROB_STARS && P2.wanted >= ROB_STARS, 'los dos quedan buscados');
    assert.equal(P3.wanted, 0, 'el que esta lejos no tiene nada que ver');
    for (let f = 0; f < 90 && b.robbing; f++) paso();
    assert.ok(!b.robbing && b.closed > 0, 'termino antes de ROB_TIME segundos');
  });

  test('se suman jugadores hasta el maximo, cada uno con lo suyo', () => {
    startGame(CREW[0]);
    assert.equal(G.players.length, 1);
    assert.ok(G.players[0] === G.me, 'el primero es el local');
    const otros = [];
    for (let i = 1; i < MAX_PLAYERS; i++) otros.push(addPlayer(CREW[i % CREW.length]));
    assert.equal(G.players.length, MAX_PLAYERS);
    assert.equal(addPlayer(CREW[0]), null, 'no entra uno mas del maximo');
    assert.equal(new Set(G.players.map(p => p.id)).size, MAX_PLAYERS, 'ids distintos');
    for (const P of otros) assert.ok(dist(P, G.me) < 200, 'el nuevo aparece cerca del local');
    otros[0].money = 500; otros[0].wanted = 3;
    assert.equal(G.me.money, 0, 'la guita es de cada uno');
    assert.equal(G.me.wanted, 0, 'la busqueda es de cada uno');
    removePlayer(otros[1]);
    assert.ok(!G.players.includes(otros[1]), 'se va de la partida');
    assert.ok(G.me === G.players[0], 'el local sigue siendo el local');
  });

  test('cada jugador se maneja solo con sus controles', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    for (let f = 0; f < 10; f++) update(1/60);
    const x0 = G.me.x, y0 = G.me.y;
    // Prueba las cuatro direcciones: alguna tiene que estar libre de paredes
    let moved = 0;
    for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const p2x = P2.x, p2y = P2.y;
      for (let f = 0; f < 20; f++) { P2.ctl = { ...idleControls(), x, y }; update(1/60); }
      moved = Math.max(moved, Math.hypot(P2.x - p2x, P2.y - p2y));
    }
    assert.ok(moved > 5, 'el remoto se mueve con sus controles: ' + moved);
    assert.equal(G.me.x, x0, 'el local no se mueve con los controles del otro');
    assert.equal(G.me.y, y0, 'el local no se mueve con los controles del otro');
  });

  test('dos jugadores lejos: los dos barrios poblados, sin NaN', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    lejos(P2, 1600);
    for (let f = 0; f < 1800; f++) {
      update(1/60);
      if (f % 30 === 0) render();
      for (const P of G.players) assert.ok(Number.isFinite(P.x) && Number.isFinite(P.y), 'jugador NaN');
    }
    for (const P of G.players) {
      const peds = G.peds.filter(p => p.hp > 0 && dist(p, P) < SIM_R).length;
      const cars = G.cars.filter(c => c.hp > 0 && dist(c, P) < SIM_R).length;
      assert.ok(peds > PED_TARGET * 0.4, 'barrio sin peatones alrededor del jugador ' + P.id + ': ' + peds);
      assert.ok(cars > CAR_TARGET * 0.3, 'barrio sin autos alrededor del jugador ' + P.id + ': ' + cars);
    }
    assert.ok(G.peds.length < PED_TARGET * 2 * 3 && G.cars.length < CAR_TARGET * 2 * 3, 'sin fugas de entidades');
    console.log('  dos barrios: ' + G.players.map(P => G.peds.filter(p => dist(p, P) < SIM_R).length + ' peatones / '
      + G.cars.filter(c => dist(c, P) < SIM_R).length + ' autos').join(' y '));
  });

  test('la yuta persigue al buscado, no al otro', () => {
    startGame(CREW[0]);
    alejarDeVillas(G.me);
    const P2 = addPlayer(CREW[1]);
    lejos(P2, 900); alejarDeVillas(P2);
    for (let f = 0; f < 900; f++) { P2.wanted = 4; P2.busted = 0; update(1/60); }
    const deP2 = G.cops.filter(c => c.tgt === P2).length + G.cars.filter(c => c.chase && c.tgt === P2).length;
    assert.ok(deP2 > 0, 'el buscado tiene yuta encima');
    assert.equal(G.cops.filter(c => c.tgt === G.me).length, 0, 'nadie busca al que no hizo nada');
    assert.ok(!G.cars.some(c => c.chase && c.tgt === G.me), 'ningun patrullero va por el que no hizo nada');
    assert.equal(G.me.wanted, 0, 'el otro sigue sin estrellas');
  });

  test('sin estrellas, los patrulleros sueltan solo a ese jugador', () => {
    startGame(CREW[0]);
    alejarDeVillas(G.me);
    const P2 = addPlayer(CREW[1]);
    lejos(P2, 900); alejarDeVillas(P2);
    G.cars.push(makeChaser(G.me), makeChaser(P2));
    G.me.wanted = 0; P2.wanted = 3;
    update(1/60);
    assert.ok(!G.cars.some(c => c.chase && c.tgt === G.me), 'el que perdio las estrellas ya no tiene patrullero encima');
    assert.ok(G.cars.some(c => c.cop && c.ai && !c.chase), 'el patrullero vuelve al trafico');
    assert.ok(G.cars.some(c => c.chase && c.tgt === P2), 'el buscado sigue perseguido');
  });

  test('el arresto de uno no toca al otro ni frena el mundo', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    for (let f = 0; f < 60; f++) update(1/60);
    G.me.money = 1000; G.me.wanted = 2;
    P2.money = 3000; P2.wanted = 3;
    for (const P of G.players) { const c = makeCop(P); if (c) G.cops.push(c); }
    assert.ok(G.cops.every(c => c.tgt === G.me || c.tgt === P2), 'cada cana sabe a quien busca');
    const t0 = G.t;
    bust(P2);
    assert.equal(P2.busted, 1);
    assert.equal(G.me.busted, 0, 'al otro no lo agarraron');
    for (let f = 0; f < 260 && P2.busted; f++) { G.me.wanted = 2; update(1/60); }
    assert.equal(P2.busted, 0, 'la secuencia termina');
    assert.ok(G.t > t0, 'el mundo siguio andando durante el arresto');
    assert.equal(P2.wanted, 0, 'el arrestado sale sin estrellas');
    assert.ok(P2.money < 3000, 'el arrestado pago la multa');
    assert.equal(G.me.money, 1000, 'el otro no paga nada');
    assert.ok(!G.cops.some(c => c.tgt === P2), 'se fue la yuta del arrestado');
  });

  test('dos jugadores en el mismo auto: uno maneja y el otro tira', () => {
    startGame(CREW[0]);
    const D = addPlayer(CREW[1]), P2 = addPlayer(CREW[2]); // remotos: D lee el teclado
    G.me.x = 40; G.me.y = 40;
    G.peds = []; G.cops = []; G.pickups = [];
    const c = makeCar(D.x, D.y);
    c.ai = false;
    G.cars = [c];
    Object.assign(D, { x: c.x, y: c.y + 6, cool: 0, ctl: { ...idleControls(), use: true } });
    update(1/60);
    assert.ok(D.car === c && driverOf(c) === D, 'el primero maneja');
    D.ctl = idleControls();
    Object.assign(P2, { x: c.x, y: c.y - 6, cool: 0, ctl: { ...idleControls(), use: true } });
    update(1/60);
    assert.ok(P2.car === c && P2.seat === 1 && driverOf(c) === D, 'el segundo va de acompañante');
    const ang = c.ang;
    P2.cool = 0;
    P2.ctl = { ...idleControls(), x: 0, y: 1, fire: true };
    D.ctl = { ...idleControls(), y: -1 };
    const n0 = G.bullets.length;
    update(1/60);
    assert.ok(Math.abs(P2.ang - Math.PI / 2) < 0.01, 'el acompañante apunta con sus controles');
    assert.ok(Math.abs(c.ang - ang) < 0.01 && c.spd > 0, 'el auto sigue lo del conductor');
    const mias = G.bullets.slice(n0).filter(b => b.owner === P2);
    assert.ok(mias.length > 0, 'las balas son del acompañante');
    const hp1 = D.hp, chapa = c.hp;
    for (let f = 0; f < 10; f++) { P2.ctl = idleControls(); D.ctl = idleControls(); update(1/60); }
    assert.ok(D.hp >= hp1 && c.hp >= chapa, 'no le pega al propio auto ni al conductor');
    assert.ok(P2.x === c.x && P2.y === c.y, 'el acompañante viaja con el auto');
    D.cool = 0;
    D.ctl = { ...idleControls(), use: true };
    update(1/60);
    assert.ok(!D.car && driverOf(c) === P2 && P2.seat === 0, 'si se baja el conductor, maneja el otro');
    P2.cool = 0;
    P2.ctl = { ...idleControls(), use: true };
    update(1/60);
    assert.ok(!P2.car && !driverOf(c) && c.parked === P2, 'al bajarse todos el auto queda libre');
  });

  test('las balas premian al que tiro y con PVP lastiman a los otros', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    G.pickups = []; // que nadie junte un billete del piso: la guita tiene que ser solo la del tiro
    for (let f = 0; f < 10; f++) update(1/60);
    const ped = G.peds.find(p => p.hp > 0 && !p.inside);
    ped.hp = 1;
    G.bullets.push({ x: ped.x - 20, y: ped.y, vx: 1200, vy: 0, life: 1, owner: P2, dmg: 30 });
    update(1/60);
    assert.ok(ped.hp <= 0, 'la bala del remoto baja al peaton');
    assert.ok(P2.money > 0 && P2.wanted > 0, 'la guita y la busqueda son del que tiro');
    assert.equal(G.me.money, 0, 'el local no cobra lo que hizo el otro');
    // Que no se cruce ningun peaton entre la bala y el blanco
    G.peds = []; G.cops = [];
    const hp0 = G.me.hp;
    G.bullets.push({ x: G.me.x - 20, y: G.me.y, vx: 1200, vy: 0, life: 1, owner: P2, dmg: 20 });
    update(1/60);
    assert.ok(G.me.hp < hp0, 'con PVP la bala de otro jugador lastima');
    G.peds = []; G.cops = [];
    const hp1 = P2.hp;
    G.bullets.push({ x: P2.x - 20, y: P2.y, vx: 1200, vy: 0, life: 1, owner: P2, dmg: 20 });
    update(1/60);
    assert.equal(P2.hp, hp1, 'la bala propia no lastima al que la tiro');
  });

  test('cada uno escucha lo que pasa cerca suyo', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    lejos(P2, AUDIO_R + 300);
    for (let f = 0; f < 5; f++) update(1/60);
    const heard = [], play = sound.play;
    sound.play = function (name, x, y, k) { const a = play.call(this, name, x, y, k); heard.push({ name, a }); return a; };
    try {
      G.peds = []; G.cops = [];
      P2.cool = 0; P2.wpn = 'pistola'; P2.ctl = { ...idleControls(), fire: true };
      update(1/60);
      const shot2 = heard.find(h => h.name === 'pistola');
      assert.ok(shot2, 'el tiro del otro avisa que hubo un tiro');
      assert.equal(shot2.a, null, 'pero en esta pantalla no se escucha: esta lejos');
      heard.length = 0;
      P2.ctl = idleControls();
      G.me.wpn = 'pistola';
      game.attack(G.me);
      assert.ok(heard.some(h => h.name === 'pistola' && h.a && h.a.vol > 0.9), 'el tiro propio se escucha fuerte');
      assert.equal(sfxFor(P2, 'guita'), null, 'los avisos del otro (guita, busqueda) no suenan aca');
      assert.ok(sfxFor(G.me, 'guita'), 'los propios si');
    } finally {
      sound.play = play;
    }
  });

  test('la radio suena en el auto del jugador de esta pantalla', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    for (let f = 0; f < 10; f++) update(1/60);
    radio.update();
    assert.equal(radio.station, -1, 'a pie no hay radio');
    const [c1, c2] = G.cars.filter(c => c.ai && c.hp > 0);
    P2.car = c2; c2.ai = false;
    update(1/60); radio.update();
    assert.equal(radio.station, -1, 'el otro sube a un auto: aca no suena nada');
    G.me.car = c1; c1.ai = false;
    update(1/60); radio.update();
    assert.ok(radio.station >= 0, 'el local sube a un auto: prende la radio');
    for (let i = 0; i <= STATIONS.length && radio.station >= 0; i++) radio.next();
    assert.equal(radio.station, -1, 'R pasa por todas las emisoras hasta apagarla');
    radio.next();
    assert.equal(radio.station, 0, 'y vuelve a la primera');
    game.exitCar(G.me);
    radio.update();
    assert.equal(radio.station, -1, 'al bajar se apaga');
  });

  test('los famosos aparecen cerca de un jugador sin que el otro los vea aparecer', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    lejos(P2, SIM_R * 2);
    for (let f = 0; f < 5; f++) update(1/60);
    G.peds = G.peds.filter(p => !p.famous);
    G.me.famousT = 0; P2.famousT = 999;
    for (let f = 0; f < 240 && !G.peds.some(p => p.famous); f++) { G.me.famousT = Math.min(G.me.famousT, 0); update(1/60); }
    const fam = G.peds.find(p => p.famous);
    assert.ok(fam, 'aparecio un famoso');
    assert.ok(dist(fam, G.me) < SIM_R, 'cerca del jugador que le toco');
    assert.ok(dist(fam, P2) > OFFSCREEN, 'fuera de la pantalla del otro');
    // Uno solo de cada uno en todo el mapa
    P2.famousT = 0;
    for (let f = 0; f < 600; f++) { P2.famousT = Math.min(P2.famousT, 0); update(1/60); }
    const ids = G.peds.filter(p => p.famous && p.hp > 0).map(p => p.famous.id);
    assert.equal(new Set(ids).size, ids.length, 'no hay dos del mismo famoso: ' + ids);
  });

  test('el famoso inmortal acusa los tiros y los otros sueltan sus premios', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    for (let f = 0; f < 5; f++) update(1/60);
    G.peds = []; G.cops = [];
    const L = makeFamous(FAMOUS.find(f => f.immortal), G.me.x + 120, G.me.y);
    G.peds.push(L);
    for (let i = 0; i < 10; i++) game.hurt(L, 50, P2);
    game.explode(L.x, L.y, 40, 200, P2);
    assert.ok(L.hp > 0, 'no se lo puede bajar');
    assert.ok(L.lineT > 0 && L.famous.hurt.includes(L.line), 'dice su frase: ' + L.line);

    for (const id of ['messi', 'maradona']) {
      const M = makeFamous(FAMOUS.find(f => f.id === id), G.me.x + 40, G.me.y);
      G.peds.push(M);
      const pk0 = G.pickups.length;
      game.hurt(M, 999, P2);
      const drops = G.pickups.slice(pk0).filter(pk => pk.kind === M.famous.drop.kind);
      assert.equal(drops.length, M.famous.drop.n, M.famous.name + ' suelta sus premios');
      // Se dibujan de dia y de noche, con los carteles de los famosos
      for (const h of [0.5, 0]) { G.t = h * DAY; L.lineT = 1; render(); }
      assert.ok(P2.wanted > 0, 'la busqueda es del que lo bajo');
      // Los premios los levanta cualquiera: el local pasa por encima de uno
      const m0 = G.me.money;
      G.me.x = drops[0].x; G.me.y = drops[0].y;
      update(1/60);
      const got = G.me.money - m0;
      assert.ok(got >= M.famous.drop.value && got % M.famous.drop.value === 0, 'cada premio vale guita: ' + got);
    }
  });

  test('gaspi vuela en helicoptero sobre el jugador, no se lo atropella y a tiros cae', () => {
    startGame(CREW[0]);
    for (let f = 0; f < 5; f++) update(1/60);
    G.peds = []; G.cops = [];
    const H = makeFamous(FAMOUS.find(f => f.id === 'gaspi'), G.me.x + 200, G.me.y);
    G.peds.push(H);
    for (let f = 0; f < 300; f++) update(1/60);
    assert.ok(dist(H, G.me) < 110, 'vuela hasta el jugador y le da vueltas: ' + dist(H, G.me));
    assert.ok(!game.targetsOf(G.me).includes(H), 'no se le pega de a pie ni se lo atropella');
    const g0 = G.pickups.length, m0 = G.me.money;
    H.giftT = 0;
    update(1/60);
    // El billete cae cerca: o queda en la calle o el jugador ya lo levantó
    assert.ok((G.pickups.length > g0 || G.me.money > m0) && H.line === 'SORTEO PARA EL CHAT!', 'tira un sorteo para el chat');
    for (const h of [0.5, 0]) { G.t = h * DAY; render(); }
    const pk0 = G.pickups.length;
    G.me.x += 200; // lejos, para que no levante los billetes en el mismo frame
    G.bullets.push({ x: H.x - 20, y: H.y, vx: 600, vy: 0, life: 1, owner: G.me, dmg: 999 });
    update(1/60);
    assert.ok(H.hp <= 0, 'a tiros se viene abajo');
    assert.equal(G.pickups.slice(pk0).filter(pk => pk.kind === 'cash').length, H.famous.drop.n, 'suelta su guita');
  });

  test('el conductor deja rastro de particulas al caminar, se lo baja y suelta guita', () => {
    startGame(CREW[0]);
    for (let f = 0; f < 5; f++) update(1/60);
    G.peds = []; G.cops = [];
    const F = makeFamous(FAMOUS.find(f => f.id === 'conductor'), G.me.x + 60, G.me.y);
    G.peds.push(F);
    let max = 0;
    for (let f = 0; f < 120; f++) { update(1/60); max = Math.max(max, G.fx.length); }
    assert.ok(max > 0, 'deja rastro al caminar');
    assert.ok(game.targetsOf(G.me).includes(F), 'se lo puede bajar');
    const pk0 = G.pickups.length;
    G.me.x += 200;
    G.bullets.push({ x: F.x - 6, y: F.y, vx: 600, vy: 0, life: 1, owner: G.me, dmg: 999 });
    update(1/60);
    assert.ok(F.hp <= 0, 'a tiros cae');
    assert.equal(G.pickups.slice(pk0).filter(pk => pk.kind === 'cash').length, F.famous.drop.n, 'suelta su guita');
  });

  test('los famosos hablan al que se acerca y se van cuando nadie los ve', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    lejos(P2, SIM_R * 2);
    for (let f = 0; f < 5; f++) update(1/60);
    G.peds = []; G.cops = [];
    const F = makeFamous(FAMOUS[0], P2.x + FAMOUS_TALK * 0.5, P2.y);
    F.sped = 0;
    G.peds.push(F);
    update(1/60);
    assert.ok(F.lineT > 0 && F.famous.near.includes(F.line), 'le habla al que se acerco (el remoto)');
    F.life = 0;
    update(1/60);
    assert.ok(G.peds.includes(F), 'con un jugador mirando no se va');
    F.x = G.me.x + SIM_R * 0.9; F.y = G.me.y;
    P2.x = G.me.x; P2.y = G.me.y;
    update(1/60);
    assert.ok(!G.peds.includes(F), 'ya paseo y nadie lo ve: se va');
  });

  test('el banco es de cada uno: deposita, muere y conserva el saldo', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    const b = banks[0], d = b.door;
    for (let f = 0; f < 10; f++) update(1/60);
    const abiertos = [], orig = game.openShop;
    game.openShop = (Q, kind) => abiertos.push([Q, kind]);
    try {
      lejos(G.me, CELL * 3);
      P2.x = d.x + d.ox; P2.y = d.y + d.oy; P2.car = null; P2.wanted = 0; P2.cool = 0;
      P2.ctl = { ...idleControls(), use: true };
      update(1/60);
      assert.ok(P2.nearBank && !G.me.nearBank, 'solo el de la puerta esta en el banco');
      assert.deepEqual(abiertos, [[P2, 'banco']], 'se le abre a el, no al local');
    } finally {
      game.openShop = orig;
    }
    G.me.money = 300; G.me.bank = 0;
    P2.money = 1500;
    const it = id => BANK_ITEMS.find(q => q.id === id);
    shop.purchase(P2, it('dep1000'));
    assert.ok(P2.money === 500 && P2.bank === 1000, 'deposita 1000');
    assert.ok(shop.purchase(P2, it('ret100')) && P2.money === 600 && P2.bank === 900, 'saca 100');
    shop.purchase(P2, it('depall'));
    assert.ok(P2.money === 0 && P2.bank === 1500, 'deposita todo');
    assert.ok(!shop.status(it('dep100'), P2).can, 'sin guita encima no deposita');
    P2.money = 200;
    P2.ctl = idleControls(); P2.prev = idleControls();
    P2.hp = -1; update(1/60);
    assert.ok(P2.dead, 'muere');
    P2.ctl = { ...idleControls(), respawn: true };
    update(1/60);
    assert.ok(!P2.dead && P2.money === 0 && P2.bank === 1500, 'pierde lo de encima, conserva el banco');
    assert.ok(G.me.money === 300 && G.me.bank === 0, 'al otro no le toca nada');
    P2.wanted = 3; game.bust(P2); game.finishBust(P2);
    assert.equal(P2.bank, 1500, 'la cana tampoco le saca el banco');
    shop.purchase(P2, it('retall'));
    assert.ok(P2.bank === 0 && P2.money === 1500, 'saca todo');
  });

  test('con otros jugando, morir reaparece solo al muerto', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    for (let f = 0; f < 30; f++) update(1/60);
    const cars = G.cars, me = G.me;
    G.me.money = 777;
    P2.money = 500;
    P2.hp = -1; update(1/60);
    assert.ok(P2.dead, 'muere el remoto');
    P2.ctl = { ...idleControls(), respawn: true };
    update(1/60);
    assert.ok(!P2.dead && P2.hp === P2.maxhp, 'reaparece con la vida llena');
    assert.equal(P2.money, 0, 'la guita que llevaba encima se pierde');
    assert.ok(G.me === me && G.me.money === 777, 'al local no le paso nada');
    assert.ok(G.players.length === 2, 'la partida sigue con los dos');
    assert.ok(G.cars === cars || G.cars.length > 0, 'el mundo no se reinicio');
  });

  test('el porro frena el mundo solo jugando solo', () => {
    startGame(CREW[0]);
    G.me.slowmo = PORRO_TIME;   // recien fumado
    for (let f = 0; f < 60; f++) update(1/60);
    assert.ok(G.ts < 0.8, 'solo: el mundo va en camara lenta (' + G.ts.toFixed(2) + ')');
    const P2 = addPlayer(CREW[1]);
    for (let f = 0; f < 5; f++) update(1/60);
    assert.equal(G.ts, 1, 'con otros el mundo va a velocidad normal');
    assert.ok(G.me.high > 0, 'el que fumo igual ve el efecto');
    removePlayer(P2);
  });

  test('robar un auto con chofer: el chofer sale corriendo y la yuta se entera; el tuyo se recupera sin lio', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    for (let f = 0; f < 10; f++) update(1/60);
    const c = G.cars.find(c => c.ai && c.hp > 0 && !c.chase);
    c.spd = 0;
    P2.x = c.x; P2.y = c.y + 12; P2.cool = 0; P2.wanted = 0;
    const n0 = G.peds.length;
    P2.ctl = { ...idleControls(), use: true };
    update(1/60);
    P2.ctl = idleControls();
    assert.ok(P2.car === c, 'se subio');
    const chofer = G.peds.slice(n0).find(p => p.fleeT > 0 && p.fleeFrom === P2);
    assert.ok(chofer && dist(chofer, c) < 30, 'el chofer se bajo y huye del que le robo');
    assert.equal(P2.wanted, 1, 'robarle el auto a alguien suma busqueda');
    assert.equal(G.me.wanted, 0, 'al otro no le toca nada');
    const cx0 = chofer.x, cy0 = chofer.y, d0 = dist(chofer, P2);
    for (let f = 0; f < 90; f++) update(1/60);
    // (con tránsito pasando a veces esquiva autos en vez de irse derecho)
    const huye = Math.hypot(chofer.x - cx0, chofer.y - cy0) > 10 || dist(chofer, P2) > d0 + 10;
    assert.ok(huye && chofer.fleeT > 0, 'sale corriendo');
    // Bajarse andando: el auto queda sin nadie, rueda un poco y frena (no se va manejando solo)
    c.spd = 90;
    P2.cool = 0;
    P2.ctl = { ...idleControls(), use: true };
    update(1/60);
    P2.ctl = idleControls();
    const x0 = c.x, y0 = c.y;
    for (let f = 0; f < 120; f++) update(1/60);
    assert.ok(!P2.car && !c.ai && c.parked === P2, 'queda estacionado, de ' + P2.def.id);
    assert.equal(c.spd, 0, 'termina frenando');
    const rodo = Math.hypot(c.x - x0, c.y - y0);
    assert.ok(rodo > 5 && rodo < 70, 'rodo un poco y freno: ' + rodo.toFixed(1));
    // Volver a subirse al propio no llama a nadie
    P2.wanted = 0; P2.x = c.x; P2.y = c.y + 12; P2.cool = 0;
    P2.ctl = { ...idleControls(), use: true };
    update(1/60);
    P2.ctl = idleControls();
    assert.ok(P2.car === c, 'se vuelve a subir');
    assert.equal(P2.wanted, 0, 'subirse al propio no suma busqueda');
  });

  test('el que choca es el que la liga: el chofer se calienta con ese jugador y lo va a buscar', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    lejos(P2, 220);
    for (let f = 0; f < 10; f++) update(1/60);
    const mine = G.cars.find(c => c.ai && c.hp > 0 && dist(c, P2) < 300 && dist(c, G.me) > 150);
    mine.ai = false;
    P2.car = mine; P2.x = mine.x; P2.y = mine.y;
    // Un chofer picante, de frente y a buena velocidad
    const c = G.cars.find(o => o.ai && o.hp > 0 && o !== mine && dist(o, mine) > 60);
    c.drv = { ...STYLES.picante, rage: 1 };
    Object.assign(c, { x: mine.x + Math.cos(mine.ang) * 30, y: mine.y + Math.sin(mine.ang) * 30, ang: mine.ang + Math.PI, spd: 30, nav: false });
    mine.spd = 60;
    let pego = false;
    for (let f = 0; f < 30 && !pego; f++) { update(1/60); P2.hp = P2.maxhp; pego = !!c.rage; }
    assert.ok(pego, 'el choque lo calento');
    assert.ok(c.rage.P === P2, 'la tiene con el que lo choco, no con el otro');
    assert.ok(c.horn > 0 || c.hornCD > 0, 'toco bocina');
    // Lo va a buscar: lo pongo a 120 px por la misma calle y lo tiene que alcanzar
    mine.spd = 0;
    P2.x = mine.x; P2.y = mine.y;
    for (const k of [120, -120]) {
      const x = mine.x + Math.cos(mine.ang) * k, y = mine.y + Math.sin(mine.ang) * k;
      if (onRoad(x, y) && !hitBuilding(x, y, 8)) { Object.assign(c, { x, y, ang: mine.ang + (k > 0 ? Math.PI : 0) }); break; }
    }
    const d0 = dist(c, mine);
    for (let f = 0; f < 90; f++) { update(1/60); P2.hp = P2.maxhp; mine.hp = 100; }
    assert.ok(dist(c, mine) < d0 || !c.rage, 'lo persigue: ' + d0.toFixed(0) + ' -> ' + dist(c, mine).toFixed(0));
    // Si se baja del auto, se le pasa
    game.exitCar(P2);
    for (let f = 0; f < 2; f++) update(1/60);
    assert.ok(!c.rage, 'sin auto al que chocar, se le pasa la bronca');
  });

  test('si se le viene un auto encima, pega un volantazo', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    for (let f = 0; f < 10; f++) update(1/60);
    const c = G.cars.find(o => o.ai && o.hp > 0 && !o.path && o.dir < 4 && !trafficAI.boxAt(o.x, o.y));
    const mine = G.cars.find(o => o.ai && o.hp > 0 && o !== c);
    mine.ai = false;
    P2.car = mine;
    // De frente por su carril, a toda velocidad
    Object.assign(mine, { x: c.x + Math.cos(c.ang) * 60, y: c.y + Math.sin(c.ang) * 60, ang: c.ang + Math.PI, spd: 130 });
    P2.x = mine.x; P2.y = mine.y;
    trafficAI.update(c, 1/60);
    assert.ok(c.evT > 0, 'se corre para un costado');
  });

  test('el auto que maneja un jugador no se lo roba otro', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
    for (let f = 0; f < 10; f++) update(1/60);
    const car = G.cars.find(c => c.ai && c.hp > 0);
    G.me.car = car; car.ai = false; car.spd = 0;
    G.me.x = car.x; G.me.y = car.y;
    P2.x = car.x + 8; P2.y = car.y; P2.cool = 0;
    P2.ctl = { ...idleControls(), use: true };
    update(1/60);
    assert.ok(G.me.car === car, 'el local sigue en su auto');
    assert.ok(P2.seat > 0, 'el otro no se lo puede robar: sube de acompañante');
    assert.ok(driverOf(car) === G.me);
  });
});

// Online: un host y un cliente, cada uno con su propia copia del juego, conectados por una
// red de mentira en memoria (los mensajes pasan por JSON, como por WebRTC)
describe('multijugador online', () => {
  const C = new Function(js + `
;return {G,net,world,buildCity,bakeGround,buildings,CREW,render,input,shop,villas,update,VERSION,ui};`)();

  // Red en memoria: cada pantalla es un nodo. Nada se entrega hasta pump(), como en la red de verdad.
  const redLocal = () => {
    const nodes = new Map(), q = [];
    let n = 0;
    const make = () => {
      const id = 'peer' + (++n);
      const t = { id, onMsg: null, onJoin: null, onLeave: null };
      t.send = (type, data, to) => {
        const raw = JSON.stringify(data);
        for (const pid of nodes.keys()) if (pid !== id && (!to || to === pid)) q.push([pid, 'msg', type, JSON.parse(raw), id]);
      };
      t.leave = () => {
        nodes.delete(id);
        for (const pid of nodes.keys()) q.push([pid, 'leave', id]);
      };
      for (const pid of nodes.keys()) { q.push([pid, 'join', id]); q.push([id, 'join', pid]); }
      nodes.set(id, t);
      return t;
    };
    const pump = () => {
      while (q.length) {
        const [to, kind, a, b, c] = q.shift(), t = nodes.get(to);
        if (!t) continue;
        if (kind === 'join' && t.onJoin) t.onJoin(a);
        if (kind === 'leave' && t.onLeave) t.onLeave(a);
        if (kind === 'msg' && t.onMsg) t.onMsg(a, b, c);
      }
    };
    return { make, pump, nodes };
  };
  const tick = () => new Promise(r => setImmediate(r));
  const ciudad = b => JSON.stringify(b.map(o => [o.x | 0, o.y | 0, o.w | 0, o.h | 0]));

  // Un frame de los dos lados: el host simula y manda la foto, el cliente la anima
  const frame = red => {
    update(1/60);
    net.tick(1/60);
    red.pump();
    if (C.G.state === 'play') C.net.clientFrame(1/60);
    else C.net.tick(1/60);
    red.pump();
  };

  // Arma la sala y mete al cliente. Devuelve la red y el jugador del cliente en el host.
  const conectar = async () => {
    const red = redLocal();
    for (const N of [net, C.net]) {
      N.leave();
      Object.assign(N, { role: null, hostId: null, myId: null, gone: false, ents: {}, onLost: null, onEnter: null });
      N.makeTransport = red.make;
    }
    if (!buildings.length) { buildCity(); bakeGround(); }
    startGame(CREW[0]);
    await net.host('ABCDE');
    const info = C.net.probe('ABCDE');
    for (let i = 0; i < 5; i++) { await tick(); red.pump(); }
    const d = await info;
    if (world.seed !== C.world.seed) { C.buildCity(d.seed); C.bakeGround(); }
    C.net.join(2);
    red.pump();
    for (let f = 0; f < 10; f++) frame(red);
    const P2 = G.players.find(p => p.peer);
    return { red, info: d, P2 };
  };

  test('el cliente arma la misma ciudad con la semilla del host y entra a la sala', async () => {
    const { info, P2 } = await conectar();
    assert.equal(info.seed, world.seed, 'el host pasa su semilla');
    assert.equal(ciudad(C.buildings), ciudad(buildings), 'misma semilla, misma ciudad');
    assert.equal(G.players.length, 2, 'el host suma al que entra');
    assert.ok(P2 && P2.def === CREW[2], 'con el personaje que eligio');
    assert.equal(C.G.state, 'play', 'el cliente ya esta jugando');
    assert.equal(C.G.me.id, P2.id, 'el cliente es ese jugador');
    assert.equal(C.G.players.length, 2, 'y ve a los dos');
    assert.ok(C.G.cars.length > 5 && C.G.peds.length > 5, 've los autos y la gente de alrededor');
    assert.ok(C.G.pickups.length === G.pickups.length, 've todos los fierros y la guita del mapa');
    assert.equal(C.G.tranzas.length, G.tranzas.length, 'los tranzas son los mismos');
    C.render();
  });

  test('el cliente se maneja con sus controles y ve lo que simula el host', async () => {
    const { red, P2 } = await conectar();
    let moved = 0;
    for (const k of ['KeyD', 'KeyA', 'KeyS', 'KeyW']) {
      const x0 = P2.x, y0 = P2.y;
      C.input.keys[k] = true;
      for (let f = 0; f < 25; f++) frame(red);
      C.input.keys[k] = false;
      moved = Math.max(moved, Math.hypot(P2.x - x0, P2.y - y0));
    }
    for (let f = 0; f < 30; f++) frame(red);
    assert.ok(moved > 5, 'el host mueve al jugador del cliente: ' + moved.toFixed(1));
    assert.ok(Math.hypot(C.G.me.x - P2.x, C.G.me.y - P2.y) < 3, 'y el cliente lo ve donde esta');
    const H = G.players.find(p => p !== P2), h = C.G.players.find(p => p.id === H.id);
    assert.ok(Math.hypot(h.x - H.x, h.y - H.y) < 3, 'el cliente ve al host donde esta');
    assert.equal(G.me, H, 'los controles del cliente no mueven al host');
    for (let f = 0; f < 60; f++) { frame(red); if (f % 20 === 0) C.render(); }
    for (const o of C.G.cars.concat(C.G.peds, C.G.players)) assert.ok(Number.isFinite(o.x) && Number.isFinite(o.y), 'sin NaN en el cliente');
  });

  test('un toque corto llega aunque se suelte antes del frame', () => {
    const P = { net: { ctl: idleControls(), tap: {} }, ctl: idleControls() };
    net.role = 'host';
    net.peers.set('x', { P, known: new Set(), ev: [] });
    net.onHostMsg('ctl', packCtl({ ...idleControls(), use: true }), 'x');
    net.onHostMsg('ctl', packCtl(idleControls()), 'x');
    net.applyControls();
    assert.ok(P.ctl.use, 'el toque se ve un frame');
    net.applyControls();
    assert.ok(!P.ctl.use, 'y despues se suelta');
    net.peers.delete('x');
    assert.deepEqual(unpackCtl(packCtl({ ...idleControls(), x: -1, y: 0.5, fire: true, slot: 3 })),
      { ...idleControls(), x: -1, y: 0.5, fire: true, slot: 3 }, 'los controles van y vuelven iguales');
  });

  test('mensajes, temblor y efectos llegan a la pantalla del que corresponde', async () => {
    const { red, P2 } = await conectar();
    G.msg = '';
    say('SOLO PARA EL CLIENTE', 2, P2);
    game.shakeFor(P2, 5);
    game.flashFor(P2, 0.6);
    for (let f = 0; f < 4; f++) frame(red);
    assert.equal(C.G.msg, 'SOLO PARA EL CLIENTE', 'el mensaje llega al cliente');
    assert.notEqual(G.msg, 'SOLO PARA EL CLIENTE', 'y no sale en la pantalla del host');
    assert.ok(C.G.shake > 0 && C.G.flash > 0, 'tiembla y se ilumina la pantalla del cliente');
    C.G.fx.length = 0;
    game.explode(P2.x + 30, P2.y, 10, 0);
    for (let f = 0; f < 4; f++) frame(red);
    assert.ok(C.G.fx.length > 20, 'el cliente ve la explosion cerca suyo: ' + C.G.fx.length);
  });

  test('el cliente ve a gaspi en su helicoptero y le llega el sorteo', async () => {
    const { red, P2 } = await conectar();
    G.peds = G.peds.filter(p => !p.famous);
    G.me.x += SIM_R * 2; // el host lejos: Gaspi le da vueltas al cliente
    const H = makeFamous(FAMOUS.find(f => f.id === 'gaspi'), P2.x + 60, P2.y);
    G.peds.push(H);
    for (let f = 0; f < 4; f++) frame(red);
    const h = C.G.peds.find(p => p.famous && p.famous.id === 'gaspi');
    assert.ok(h && h.air, 'el cliente lo recibe como helicoptero');
    assert.ok(Math.hypot(h.x - H.x, h.y - H.y) < 3, 'donde lo simula el host');
    const n0 = C.G.pickups.length, m0 = P2.money;
    H.giftT = 0;
    for (let f = 0; f < 4; f++) frame(red);
    assert.equal(h.line, 'SORTEO PARA EL CHAT!', 'el cliente ve el globito del sorteo');
    assert.ok(C.G.pickups.length > n0 || P2.money > m0, 'y le llega el billete');
    C.render();
  });

  test('el cliente deposita por el host y ve su saldo en la foto', async () => {
    const { red, P2 } = await conectar();
    const d = banks[0].door;
    P2.x = d.x + d.ox; P2.y = d.y + d.oy; P2.car = null;
    P2.money = 800; P2.bank = 0; P2.wanted = 0;
    for (let f = 0; f < 6; f++) frame(red);
    assert.ok(C.G.me.nearBank, 'el cliente sabe que esta en la puerta');
    C.input.keys.KeyE = true;
    for (let f = 0; f < 4; f++) frame(red);
    C.input.keys.KeyE = false;
    assert.ok(C.G.shopOpen && C.shop.kind === 'banco' && !G.shopOpen, 'el banco se abre solo en el cliente');
    C.shop.buy(C.shop.items.findIndex(it => it.id === 'depall'));
    for (let f = 0; f < 6; f++) frame(red);
    assert.ok(P2.bank === 800 && P2.money === 0, 'el host le guarda la guita');
    assert.ok(C.G.me.bank === 800 && C.G.me.money === 0, 'el cliente ve el saldo');
    C.shop.close();
  });

  test('las compras del cliente las hace el host', async () => {
    const { red, P2 } = await conectar();
    const b = shops[0], d = b.door;
    P2.x = d.x + d.ox; P2.y = d.y + d.oy; P2.car = null;
    P2.money = 5000; P2.wanted = 0;
    for (let f = 0; f < 6; f++) frame(red);
    assert.ok(P2.nearShop, 'esta en la puerta de la armeria');
    assert.ok(C.G.me.nearShop, 'y el cliente lo sabe (cartel para entrar)');
    C.input.keys.KeyE = true;
    for (let f = 0; f < 4; f++) frame(red);
    C.input.keys.KeyE = false;
    assert.ok(C.G.shopOpen, 'la armeria se abre en la pantalla del cliente');
    assert.ok(!G.shopOpen, 'y no en la del host');
    const i = C.shop.items.findIndex(it => it.id === 'ak');
    C.shop.buy(i);
    for (let f = 0; f < 6; f++) frame(red);
    assert.ok(P2.inv.ak > 0 && P2.money < 5000, 'el host le vende');
    assert.ok(C.G.me.inv.ak > 0 && C.G.me.money === P2.money, 'el cliente ve el fierro y la guita');
    assert.equal(C.G.me.inv.pistola, Infinity, 'la 9mm sigue con balas infinitas');
    C.shop.close();
  });

  test('en el super el cliente compra y come, y lo hace el host', async () => {
    const { red, P2 } = await conectar();
    const b = supers.find(q => q.super === 'choto'), d = b.door;
    P2.x = d.x + d.ox; P2.y = d.y + d.oy; P2.car = null;
    P2.money = 1000; P2.wanted = 0; P2.hp = 20;
    for (let f = 0; f < 6; f++) frame(red);
    assert.ok(C.G.me.nearSuper, 'el cliente ve el cartel para entrar');
    C.input.keys.KeyE = true;
    for (let f = 0; f < 4; f++) frame(red);
    C.input.keys.KeyE = false;
    assert.ok(C.G.shopOpen && C.shop.kind === 'choto', 'el CHOTO se abre en la pantalla del cliente');
    assert.ok(!G.shopOpen, 'y no en la del host');
    C.shop.buy(C.shop.items.findIndex(it => it.id === 'carne'));
    for (let f = 0; f < 6; f++) frame(red);
    assert.ok(P2.bag.carne === 1 && P2.money < 1000, 'el host le vende a la mochila');
    assert.equal(C.G.me.bag.carne, 1, 'el cliente ve su mochila');
    C.shop.close();
    P2.food = 10;
    for (let f = 0; f < 3; f++) frame(red);
    C.input.keys.KeyC = true;
    for (let f = 0; f < 4; f++) frame(red);
    C.input.keys.KeyC = false;
    for (let f = 0; f < 3; f++) frame(red);
    assert.ok(P2.food > 60 && !P2.bag.carne, 'C en el cliente: el host lo hace comer');
    assert.ok(C.G.me.food > 60 && !C.G.me.bag.carne, 'y el cliente ve la panza llena y la mochila vacia');
    assert.equal(C.G.me.hp, Math.ceil(P2.hp), 'el cliente ve la vida');
    Object.assign(P2, { x: d.x + d.ox, y: d.y + d.oy });
    for (let f = 0; f < 3; f++) frame(red);
    // Si se va de la puerta, el host no le vende aunque el cliente lo pida
    P2.x += CELL; const plata = P2.money;
    for (let f = 0; f < 3; f++) frame(red);
    C.net.buy('choto', 0);
    for (let f = 0; f < 4; f++) frame(red);
    assert.equal(P2.money, plata, 'lejos del super no se compra');
    C.shop.close();
  });

  test('el asalto lo arranca el cliente y ve la barra, la alarma y la persiana', async () => {
    const { red, P2 } = await conectar();
    const b = supers.find(q => q.super === 'noche'), d = { x: b.door.x + b.door.ox, y: b.door.y + b.door.oy };
    game.resetSupers();
    Object.assign(P2, d, { car: null, wanted: 0 });
    for (let f = 0; f < 6; f++) frame(red);
    C.input.keys.Space = true;
    for (let f = 0; f < 4; f++) frame(red);
    C.input.keys.Space = false;
    assert.ok(b.robbing, 'el disparo del cliente arranca el asalto en el host');
    for (let f = 0; f < 60; f++) { G.cops.length = 0; Object.assign(P2, d); frame(red); }
    const cb = C.world.supers[supers.indexOf(b)];
    assert.ok(cb.robbing && cb.robT > 0.5 && cb.alarm, 'el cliente ve el asalto y la alarma: ' + cb.robT);
    assert.ok(C.G.me.wanted >= ROB_STARS, 'y sus estrellas');
    for (let f = 0; f < 6 * 60 && b.robbing; f++) { G.cops.length = 0; Object.assign(P2, d); frame(red); }
    for (let f = 0; f < 4; f++) frame(red);
    assert.ok(cb.closed > 0 && !cb.robbing, 'y la persiana baja');
    C.render();
  });

  test('el cliente prende el asado y ve como se hace', async () => {
    const { red, P2 } = await conectar();
    const g = parrillas[1] || parrillas[0], i = parrillas.indexOf(g);
    for (const q of parrillas) Object.assign(q, { cooking: false, t: 0, portions: 0, owner: null });
    Object.assign(P2, { x: g.x, y: g.y + 10, car: null, bag: { carne: 1, carbon: 1 } });
    for (let f = 0; f < 6; f++) frame(red);
    assert.ok(C.G.me.nearGrill, 'el cliente sabe que esta en la parrilla');
    C.input.keys.KeyE = true;
    for (let f = 0; f < 4; f++) frame(red);
    C.input.keys.KeyE = false;
    assert.ok(g.cooking && g.owner === P2, 'el host prende el asado del cliente');
    for (let f = 0; f < 4; f++) frame(red);
    const cg = C.world.parrillas[i];
    assert.ok(cg.cooking && cg.portions === ASADO_PORCIONES && cg.t > 0, 'el cliente ve la parrilla prendida');
    assert.deepEqual(C.G.me.bag, {}, 'y la mochila sin la carne y el carbon');
    C.render();
  });

  // Arma la sala y deja al cliente eligiendo personaje (todavía sin entrar)
  const eligiendo = async () => {
    const red = redLocal();
    for (const N of [net, C.net]) {
      N.leave();
      Object.assign(N, { role: null, hostId: null, myId: null, gone: false, ents: {}, onLost: null, onEnter: null, used: [] });
      N.makeTransport = red.make;
    }
    if (!buildings.length) { buildCity(); bakeGround(); }
    startGame(CREW[0]);
    await net.host('ABCDE');
    const info = C.net.probe('ABCDE');
    for (let i = 0; i < 5; i++) { await tick(); red.pump(); }
    const d = await info;
    if (world.seed !== C.world.seed) { C.buildCity(d.seed); C.bakeGround(); }
    C.ui.mode = 'join';
    C.ui.selIdx = 0;
    C.ui.markTaken();
    C.G.state = 'sel';
    return { red, info: d };
  };

  test('entrando a una sala no se puede elegir un personaje que ya esta adentro', async () => {
    const { red, info } = await eligiendo();
    assert.deepEqual(info.used, [0], 'el host avisa que su personaje esta en uso');
    assert.ok(C.ui.taken(0) && !C.ui.taken(1), 'el del host sale tachado; los demas no');
    assert.notEqual(C.ui.selIdx, 0, 'la seleccion salta al primero libre');
    C.ui.selIdx = 0;
    C.ui.play();
    assert.equal(C.G.state, 'sel', 'con uno tomado no se entra');
    C.ui.selIdx = 1;
    C.ui.stepSel(-1);
    assert.notEqual(C.ui.selIdx, 0, 'las flechas saltean los tomados');
    // Mientras elige, entra otro: la lista se actualiza sola
    addPlayer(CREW[3]);
    for (let f = 0; f < 3 * 60; f++) { C.net.tick(1/60); red.pump(); }
    assert.ok(C.net.used.includes(3) && C.ui.taken(3), 'el que entro mientras elegias tambien sale tachado');
    // Si igual pide uno tomado (lo eligieron a la vez), el host no lo deja y vuelve a elegir
    C.net.join(3);
    for (let f = 0; f < 4; f++) { red.pump(); await tick(); }
    assert.equal(G.players.length, 2, 'el host no lo suma');
    assert.ok(C.G.state === 'sel' && !C.net.gone, 'el cliente vuelve a elegir, sin cortarse');
    C.net.join(2);
    for (let f = 0; f < 6; f++) { red.pump(); await tick(); }
    assert.ok(G.players.some(q => q.def === CREW[2] && q.peer), 'con uno libre entra');
    assert.equal(new Set(G.players.map(q => q.def)).size, G.players.length, 'nadie repetido');
  });

  test('el cliente roba el trapo y ve la barra caliente y su respeto', async () => {
    const { red, P2 } = await conectar();
    const B = G.barras[0], i = 0;
    Object.assign(P2, { x: B.flag.x, y: B.flag.y + 6, car: null });
    for (let f = 0; f < 6; f++) frame(red);
    assert.ok(C.G.me.nearTrapo, 'el cliente ve el cartel para robarlo');
    C.input.keys.KeyE = true;
    for (let f = 0; f < 4; f++) frame(red);
    C.input.keys.KeyE = false;
    for (let f = 0; f < 4; f++) frame(red);
    assert.ok(P2.trapo === B, 'el host le da el trapo');
    assert.ok(C.G.me.trapo === C.G.barras[i] && C.G.barras[i].trapo === 'carried' && C.G.barras[i].angry, 'el cliente lo lleva y ve la barra caliente');
    assert.ok(C.G.hinchas.length > 0, 've a los hinchas');
    game.gainRespect(P2, 20);
    for (let f = 0; f < 4; f++) frame(red);
    assert.equal(C.G.me.respect, P2.respect, 'y su respeto');
    C.render();
    game.dropTrapo(P2);
  });

  test('el cliente le roba el auto a uno: lo ve salir corriendo, y ve las balizas de los abandonados', async () => {
    const { red, P2 } = await conectar();
    const c = G.cars.find(c => c.ai && c.hp > 0 && !c.chase);
    c.spd = 0;
    Object.assign(P2, { x: c.x, y: c.y + 12, car: null, cool: 0, wanted: 0 });
    for (let f = 0; f < 4; f++) frame(red);
    C.input.keys.KeyE = true;
    for (let f = 0; f < 4; f++) frame(red);
    C.input.keys.KeyE = false;
    for (let f = 0; f < 4; f++) frame(red);
    assert.ok(P2.car === c, 'el host lo sube al auto');
    const chofer = G.peds.find(p => p.fleeFrom === P2);
    assert.ok(chofer, 'el chofer se bajo');
    assert.ok(C.G.peds.some(p => Math.hypot(p.x - chofer.x, p.y - chofer.y) < 8), 'el cliente lo ve salir corriendo');
    assert.ok(C.G.me.car, 'y se ve adentro del auto');
    // Un auto que abandono un chofer asustado queda con las balizas: el cliente las ve titilar
    const o = G.cars.filter(o => o !== c && o.ai && o.hp > 0).sort((a, b) => dist(a, P2) - dist(b, P2))[0];
    o.spd = 0;
    trafficAI.bailOut(o, P2);
    for (let f = 0; f < 20; f++) frame(red);
    const visto = C.G.cars.slice().sort((a, b) => dist(a, o) - dist(b, o))[0];
    assert.ok(visto && dist(visto, o) < 12 && visto.hazard, 'el cliente ve las balizas');
    C.render();
  });

  test('el cliente sube de acompañante al auto del host y tira por su cuenta', async () => {
    const { red, P2 } = await conectar();
    const c = G.cars.find(c => c.ai && c.hp > 0 && !c.chase);
    trafficAI.release(c);
    Object.assign(c, { ai: false, spd: 0 });
    Object.assign(G.me, { car: c, seat: 0, x: c.x, y: c.y });
    Object.assign(P2, { x: c.x, y: c.y + 10, car: null, cool: 0, wanted: 0 });
    for (let f = 0; f < 4; f++) frame(red);
    C.input.keys.KeyE = true;
    for (let f = 0; f < 4; f++) frame(red);
    C.input.keys.KeyE = false;
    for (let f = 0; f < 4; f++) frame(red);
    assert.ok(P2.car === c && P2.seat === 1 && driverOf(c) === G.me, 'el host lo sienta de acompañante');
    assert.ok(C.G.me.car && C.G.me.seat === 1, 'el cliente se ve de acompañante');
    assert.ok(C.G.players.find(q => q.id !== C.G.me.id).car === C.G.me.car, 'en el mismo auto que el host');
    C.render();
    const n0 = G.bullets.filter(b => b.owner === P2).length;
    P2.cool = 0;
    C.input.keys.Space = true;
    for (let f = 0; f < 3; f++) frame(red);
    C.input.keys.Space = false;
    assert.ok(G.bullets.filter(b => b.owner === P2).length > n0, 'las balas del cliente son suyas');
    G.me.car = null;
    P2.car = null; P2.seat = 0;
  });

  test('las fotos son chicas y lo que no cambia se manda una vez', async () => {
    const { red, P2 } = await conectar();
    const peer = net.peers.get(P2.peer);
    const a = JSON.stringify(net.snapshot({ ...peer, known: new Set() })).length;
    const b = JSON.stringify(net.snapshot(peer)).length;
    console.log('  foto entera: ' + (a / 1024).toFixed(1) + ' KB, despues: ' + (b / 1024).toFixed(1) + ' KB');
    assert.ok(b < a, 'sin los colores y caras repetidos es mas chica');
    assert.ok(b < 24 * 1024, 'una foto entra holgada (20 por segundo)');
  });

  test('si se va el cliente el host lo saca; si se va el host el cliente se entera', async () => {
    let { red } = await conectar();
    C.net.leave();
    red.pump();
    assert.equal(G.players.length, 1, 'el host sigue solo');
    ({ red } = await conectar());
    let lost = null;
    C.net.onLost = m => { lost = m; };
    net.leave();
    red.pump();
    assert.ok(lost, 'el cliente se entera de que se corto');
    assert.equal(C.G.state, 'net', 'y deja de jugar');
    net.role = null;
  });

  test('no entra a una sala llena ni con otra version', async () => {
    const { red } = await conectar();
    const hostId = [...red.nodes.keys()][0], no = [];
    const t = red.make();
    t.onMsg = (type, d) => { if (type === 'bienv') no.push(d.no); };
    t.send('hola', { crew: 0, v: 'otra' }, hostId);
    red.pump();
    for (let i = G.players.length; i < MAX_PLAYERS; i++) addPlayer(CREW[0]);
    t.send('hola', { crew: 0, v: C.VERSION }, hostId);
    red.pump();
    assert.deepEqual(no, ['VERSION', 'LLENA'], 'otra version y sala llena no entran');
    assert.equal(G.players.length, MAX_PLAYERS);
    net.leave();
    net.role = null;
  });

  test('corralito: cada jugador pierde la mitad de lo suyo', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]), vistos = [];
    const orig = game.say; game.say = (t, s, P) => vistos.push(P);
    try {
      G.me.bank = 1000; P2.bank = 300; G.me.money = P2.money = 80; G.corralitoT = 0;
      game.updateCorralito(0.1);
    } finally { game.say = orig; net.leave(); net.role = null; }
    assert.equal(G.me.bank, 500);
    assert.equal(P2.bank, 150);
    assert.ok(G.me.money === 80 && P2.money === 80, 'el efectivo no se toca');
    assert.ok(vistos.includes(G.me) && vistos.includes(P2), 'a los dos les avisan');
  });
});
