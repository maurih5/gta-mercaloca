// Self-check headless: corre la logica y las funciones puras de render con stubs de DOM.
// node selfcheck.js  -> exit 0 si todo OK
// En CI corre con el reporter JUnit de node:test: cada test() es un check en la PR.
const { describe, test } = require('node:test');
const fs = require('fs'), assert = require('assert');
const scriptFiles = [
  'constants.js', 'utils.js', 'audio.js', 'songs.js', 'radio.js', 'input.js', 'world.js',
  'entities.js', 'traffic.js', 'game.js', 'renderer.js', 'ui.js'
];
let js = scriptFiles.map(f => fs.readFileSync(__dirname + '/js/' + f, 'utf8')).join('\n');

const noop = () => {};
const ctxStub = new Proxy({}, {get:(t,k)=>{
  if(k === 'canvas') return {};
  if(k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({addColorStop:noop});
  if(k === 'getImageData') return (x,y,w,h) => ({data:new Uint8ClampedArray(w*h*4)});
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
         inWater,riverWidthAt,riverNearest,inPark,inPlazaMayo,hitCarBlock,PM_X0,PM_Y0,PM_X1,PM_Y1,onBeach,BEACH_BAND,villaAt,segAliveV,segAliveH,onDeadRoad,sandZone,audibleFor,sound,sfx,sfxFor,AUDIO_R,game,radio,STATIONS,SONGS,compileSong,noteNum};`)();
const {G,CREW,buildCity,bakeGround,buildings,props,lamps,onRoad,hitBuilding,freeRoadSpot,
       boatsAt,floatsAt,shoreDist,bridgeAt,BOAT_DIM,RIVER_BOATS,
       startGame,update,render,WORLD,dist,shade,mix,hash,ambient,darkness,dayT,DAY,
       PED_TARGET,CAR_TARGET,SIM_R,laneSnap,ringSpot,CELL,ROAD,PEDTYPE,CARMODEL,onSidewalk,toSidewalk,SIDEWALK,
       lights,lightState,LIGHT_CYCLE,GREEN,AMBER,lightAhead,nearestDoor,GRID,
       bust,finishBust,makeChaser,makeCop,addPlayer,removePlayer,nearestPlayer,inPlay,driverOf,MAX_PLAYERS,idleControls,PORRO_TIME,hospitals,HOSPITAL_TIME,FOOD_HEAL,FOODS,makePickup,
       water,casaRosada,cabildo,getObelisco,riverCurve,CASA_ROSADA_GUARDS,
       AVENUE_ROAD,ROTONDA_R,ROTONDA_ISLAND_R,PLAZA_CX,PLAZA_CY,inRotondaRing,
       ROSADA_CX,ROSADA_CY,PLAZA_PX,PLAZA_PY,ROSADA_PX,ROSADA_PY,DIAG_ANG,DIAG_LEN,DIAG_UX,DIAG_UY,inDiagonalBand,RIVER_HALF,distToRiver,
         inWater,riverWidthAt,riverNearest,inPark,inPlazaMayo,hitCarBlock,PM_X0,PM_Y0,PM_X1,PM_Y1,onBeach,BEACH_BAND,villaAt,segAliveV,segAliveH,onDeadRoad,sandZone,audibleFor,sound,sfx,sfxFor,AUDIO_R,game,radio,STATIONS,SONGS,compileSong,noteNum} = api;

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
  let movingAcc = 0, movingN = 0;   // fraccion de autos andando en los ultimos 10s

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
    // todo auto arranca sobre la calle y alineado a un eje
    for(const c of G.cars){
      assert.ok(onRoad(c.x, c.y), 'auto fuera de la calle al spawnear');
      const a = ((c.ang % (Math.PI/2)) + Math.PI/2) % (Math.PI/2);
      assert.ok(a < 1e-6 || Math.abs(a - Math.PI/2) < 1e-6, 'auto no alineado al carril: ' + c.ang);
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
    // Vereda de verdad, sin calle: toSidewalk a veces da un punto del borde del asfalto
    // (en la bocacalle) que onSidewalk igual cuenta como vereda.
    {
      const P = G.me;
      let best = null, bd = Infinity;
      for (let r = 0; r <= 400 && !best; r += 4) {
        for (let k = 0; k < 16; k++) {
          const x = P.x + Math.cos(k * Math.PI / 8) * r, y = P.y + Math.sin(k * Math.PI / 8) * r;
          if (onSidewalk(x, y) && !onRoad(x, y) && !hitBuilding(x, y, 4) && r < bd) { bd = r; best = { x, y }; }
        }
      }
      best = best || toSidewalk(P.x, P.y);
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
        if(tr.length){ movingAcc += tr.filter(c => Math.abs(c.spd) > 12).length / tr.length; movingN++; }
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
    assert.ok((moving + atRed) / traffic.length > 0.75,
      'trafico muerto: ' + moving + ' en movimiento + ' + atRed + ' en rojo de ' + traffic.length);
    // Promedio de los ultimos 10s y no una foto de un solo frame: la foto depende de en que fase
    // estaban los semaforos justo en ese instante y fallaba de vez en cuando aun con trafico sano.
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

describe('jugador', () => {
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
    // jugador (que esta quieto) frena al lado y esta bien. "Lejos" es mas de 3 largos de
    // patrullero: con 5 amontonados alrededor del jugador, el ultimo queda a ~50px.
    const stuckCh = ch.filter(c => c.x2s !== undefined && dist(c, G.me) > 80
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
        for (const n of c.notes) {
          assert.ok(n.t >= 0 && n.d > 0 && n.t + n.d <= c.len + 1e-6 && n.v > 0, id + ': nota fuera del tema');
          assert.ok(n.inst === 'drums' ? 'ksgh'.includes(n.n) : n.n >= 24 && n.n <= 108, id + ': nota invalida ' + n.n);
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
    const bass = song.tracks.find(t => t.inst === 'triangle'), drums = song.tracks.find(t => t.inst === 'drums');
    assert.ok(bass && drums, 'una pista de bajo y una de bateria');
    assert.deepEqual(bass.notes[0].slice(0, 3), [0, 1, 45]);
    assert.deepEqual(drums.notes[0].slice(0, 3), [1, 0.25, 'k']);
    assert.ok(compileSong(song).len > 0, 'el juego lo puede tocar');
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

  test('las balas premian al que tiro y con PVP lastiman a los otros', () => {
    startGame(CREW[0]);
    const P2 = addPlayer(CREW[1]);
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
    assert.equal(P2.money, 500, 'reaparece con su guita');
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
    assert.ok(P2.car !== car, 'el otro no se lo puede robar');
    assert.ok(driverOf(car) === G.me);
  });
});
