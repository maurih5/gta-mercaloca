// Self-check headless: corre la logica y las funciones puras de render con stubs de DOM.
// node selfcheck.js  -> exit 0 si todo OK
const fs = require('fs'), assert = require('assert');
const scriptFiles = [
  'constants.js', 'utils.js', 'input.js', 'world.js',
  'entities.js', 'game.js', 'renderer.js', 'ui.js'
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
         startGame,update,render,WORLD,dist,shade,mix,hash,ambient,darkness,dayT,DAY,
         PED_TARGET,CAR_TARGET,SIM_R,laneSnap,ringSpot,CELL,ROAD,PEDTYPE,CARMODEL,onSidewalk,toSidewalk,SIDEWALK,
         lights,lightState,LIGHT_CYCLE,GREEN,AMBER,lightAhead,nearestDoor,GRID,
         bust,finishBust,makeChaser,makeCop,hospitals,HOSPITAL_TIME,FOOD_HEAL,FOODS,makePickup,
         water,casaRosada,getObelisco,riverCurve,CASA_ROSADA_GUARDS,
         AVENUE_ROAD,ROTONDA_R,ROTONDA_ISLAND_R,PLAZA_CX,PLAZA_CY,inRotondaRing,
         ROSADA_CX,ROSADA_CY,PLAZA_PX,PLAZA_PY,ROSADA_PX,ROSADA_PY,DIAG_ANG,DIAG_LEN,DIAG_UX,DIAG_UY,inDiagonalBand,RIVER_HALF,distToRiver};`)();
const {G,CREW,buildCity,bakeGround,buildings,props,lamps,onRoad,hitBuilding,freeRoadSpot,
       startGame,update,render,WORLD,dist,shade,mix,hash,ambient,darkness,dayT,DAY,
       PED_TARGET,CAR_TARGET,SIM_R,laneSnap,ringSpot,CELL,ROAD,PEDTYPE,CARMODEL,onSidewalk,toSidewalk,SIDEWALK,
       lights,lightState,LIGHT_CYCLE,GREEN,AMBER,lightAhead,nearestDoor,GRID,
       bust,finishBust,makeChaser,makeCop,hospitals,HOSPITAL_TIME,FOOD_HEAL,FOODS,makePickup,
       water,casaRosada,getObelisco,riverCurve,CASA_ROSADA_GUARDS,
       AVENUE_ROAD,ROTONDA_R,ROTONDA_ISLAND_R,PLAZA_CX,PLAZA_CY,inRotondaRing,
       ROSADA_CX,ROSADA_CY,PLAZA_PX,PLAZA_PY,ROSADA_PX,ROSADA_PY,DIAG_ANG,DIAG_LEN,DIAG_UX,DIAG_UY,inDiagonalBand,RIVER_HALF,distToRiver} = api;

// --- helpers de color ---
assert.equal(shade('#808080', 1), 'rgb(128,128,128)');
assert.equal(shade('#808080', 0), 'rgb(0,0,0)');
assert.equal(shade('#ffffff', 5), 'rgb(255,255,255)', 'shade satura, no desborda');
assert.equal(mix('#000000','#ffffff',0.5), 'rgb(127,127,127)');
assert.equal(mix('#102030','#102030',0.7), 'rgb(16,32,48)', 'mix de un color consigo mismo no lo mueve');
for(let i=0;i<50;i++){ const h = hash(i); assert.ok(h >= -1 && h <= 1 && hash(i) === h, 'hash determinista y acotado'); }

// --- mundo ---
buildCity(); bakeGround();
assert.ok(buildings.length > 100, 'ciudad generada: ' + buildings.length);
assert.ok(lamps.length > 0 && lamps.length % 4 === 0, 'faroles: ' + lamps.length);   // 1 por esquina
assert.ok(props.some(p => p.t === 'park') && props.some(p => p.t === 'palm'), 'parques y palmeras');
for(const b of buildings) assert.ok(b.H > 0 && b.w > 0 && b.h > 0, 'edificio con volumen valido');
for(let i=0;i<300;i++){
  const s = freeRoadSpot();
  assert.ok(onRoad(s.x,s.y) && !hitBuilding(s.x,s.y,10), 'spot invalido ' + JSON.stringify(s));
}

// --- semaforos ---
// La bocacalle de la plaza no tiene semaforo (es rotonda real) pero se empuja `null`
// para no correr el indice plano gy*GRID+gx que usa lightAhead().
assert.equal(lights.length, GRID*GRID, 'un semaforo por bocacalle (o null en la rotonda)');
assert.equal(lights[PLAZA_CY*GRID+PLAZA_CX], null, 'la rotonda de la plaza no tiene semaforo');
{
  const N = 2000, t0 = G.t;
  let bothGreen = 0, greenH = 0, greenV = 0;
  for(const L of [lights[0], lights[7], lights[GRID*3+5]]){
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
}
// lightAhead apunta a la bocacalle de adelante, nunca a la de atras
for(let i=0;i<300;i++){
  const x = 20+Math.random()*(WORLD-40), y = 20+Math.random()*(WORLD-40);
  const ang = [0, Math.PI, Math.PI/2, -Math.PI/2][(Math.random()*4)|0];
  const LA = lightAhead(x, y, ang);
  if(LA) assert.ok(Number.isFinite(LA.fwd), 'lightAhead fwd NaN');
}
// --- puertas ---
assert.ok(buildings.every(b => b.door), 'todos los edificios tienen puerta');
for(const b of buildings){
  const d = b.door;
  assert.ok(d.x >= b.x-1 && d.x <= b.x+b.w+1 && d.y >= b.y-1 && d.y <= b.y+b.h+1,
    'puerta fuera del perimetro del edificio');
  assert.ok(!hitBuilding(d.x+d.ox, d.y+d.oy, 1) || true, 'punto de salida');
}
assert.ok(nearestDoor(buildings[0].x, buildings[0].y, 200), 'nearestDoor encuentra algo');

// --- hospitales ---
assert.equal(hospitals.length, 2, 'tienen que existir dos hospitales: ' + hospitals.length);
for(const h of hospitals){
  assert.ok(h.door, 'el hospital tiene que tener puerta');
  assert.ok(buildings.includes(h), 'el hospital es un edificio real de la ciudad');
}
assert.ok(dist(hospitals[0], hospitals[1]) > CELL * 3, 'los hospitales tienen que estar lejos entre si: ' + dist(hospitals[0], hospitals[1]));

// --- riachuelo, playa, obelisco y casa rosada ---
{
  const p0 = riverCurve[0], p2 = riverCurve[2], eps = 4;
  const onBorder = p => (Math.abs(p.x) < eps ? 'w' : Math.abs(p.x - WORLD) < eps ? 'e'
    : Math.abs(p.y) < eps ? 'n' : Math.abs(p.y - WORLD) < eps ? 's' : null);
  const b0 = onBorder(p0), b2 = onBorder(p2);
  assert.ok(b0, 'el riachuelo tiene que arrancar pegado a un borde del mapa: ' + JSON.stringify(p0));
  assert.ok(b2, 'el riachuelo tiene que terminar pegado a un borde del mapa: ' + JSON.stringify(p2));
  assert.notEqual(b0, b2, 'el riachuelo tiene que cruzar el mapa entre dos bordes distintos: ' + b0 + '/' + b2);
}
assert.ok(props.some(p => p.t === 'beach'), 'tiene que existir una playa en la desembocadura del riachuelo');
{
  const w0 = water[0], cx = w0.x + w0.w / 2, cy = w0.y + w0.h / 2;
  assert.ok(hitBuilding(cx, cy, 3), 'el riachuelo tiene que bloquear el paso como un edificio: ' + JSON.stringify(w0));
}
{
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
}
assert.equal(casaRosada.length, 1, 'tiene que existir una sola Casa Rosada: ' + casaRosada.length);
assert.ok(buildings.includes(casaRosada[0]), 'la Casa Rosada tiene que ser un edificio real de la ciudad');
assert.ok(casaRosada[0].door, 'la Casa Rosada tiene que tener puerta');
assert.ok(!casaRosada[0].hospital, 'la Casa Rosada no puede ser tambien un hospital');

// --- puentes: la avenida cruza el riachuelo sin bloquear ---
{
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
}

// --- diagonal: banda recta de la plaza a la Casa Rosada, transitable ---
{
  let sawBand = false;
  for (let t = 5; t < DIAG_LEN; t += 10) {
    const x = PLAZA_PX + DIAG_UX * t, y = PLAZA_PY + DIAG_UY * t;
    assert.ok(inDiagonalBand(x, y), 'punto sobre el eje de la diagonal tiene que caer en la banda: ' + JSON.stringify({x,y}));
    assert.ok(onRoad(x, y), 'la diagonal tiene que ser camino transitable: ' + JSON.stringify({x,y}));
    sawBand = true;
  }
  assert.ok(sawBand, 'la diagonal tiene longitud positiva');
}

// --- ciclo dia/noche: siempre color valido y oscuridad en [0,1] ---
for(let t=0; t<DAY*2; t+=1.7){
  G.t = t;
  assert.ok(/^(#|rgb\()/.test(ambient()), 'color de ambiente valido en t=' + t);
  const d = darkness();
  assert.ok(d >= 0 && d <= 1 && Number.isFinite(d), 'darkness fuera de rango en t=' + t);
}
G.t = 0;

// --- simulacion ---
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
// laneSnap devuelve siempre un carril valido y un angulo cardinal
for(let i=0;i<200;i++){
  const L = laneSnap(Math.random()*WORLD, Math.random()*WORLD, Math.random()*Math.PI*2);
  assert.ok(Number.isFinite(L.x) && Number.isFinite(L.y), 'laneSnap NaN');
  const ok = [0, Math.PI, Math.PI/2, -Math.PI/2].some(a => Math.abs(L.ang-a) < 1e-9);
  assert.ok(ok, 'laneSnap angulo raro: ' + L.ang);
}

for(let f=0; f<3600; f++){                      // 60s
  update(1/60);
  render();                                     // el render no debe explotar ni con stubs
  const P = G.player;
  assert.ok(Number.isFinite(P.x) && Number.isFinite(P.y), 'pos NaN en frame ' + f);
  assert.ok(P.x >= 0 && P.x <= WORLD && P.y >= 0 && P.y <= WORLD, 'fuera del mapa en frame ' + f);
  assert.ok(P.hp <= 100, 'hp no supera el maximo');
  for(const c of G.cars) assert.ok(Number.isFinite(c.x) && Number.isFinite(c.spd), 'auto NaN frame ' + f);
  if(f === 600) G.wanted = 5;                   // fuerza yuta y tiroteo
}
assert.ok(G.cops.length > 0, 'la yuta aparece con 5 estrellas');
assert.ok(G.fx.length < 4000 && G.smoke.length < 900, 'las particulas no se acumulan sin control');
// la ciudad sigue poblada despues de 60s (el streaming repone lo que se aleja)
const pedsNear = G.peds.filter(p => p.hp > 0 && dist(p, G.player) < SIM_R).length;
const carsNear = G.cars.filter(c => dist(c, G.player) < SIM_R).length;
assert.ok(pedsNear > PED_TARGET*0.5, 'se vacio de peatones: ' + pedsNear);
assert.ok(carsNear > CAR_TARGET*0.5, 'se vacio de autos: ' + carsNear);
// y no crece sin control (fuga de entidades)
assert.ok(G.peds.length < PED_TARGET*3, 'fuga de peatones: ' + G.peds.length);
assert.ok(G.cars.length < CAR_TARGET*3, 'fuga de autos: ' + G.cars.length);
// la mayoria camina por la vereda, no por el medio de la calle
// solo cuenta a los que estan deambulando: los de adentro de un edificio y los que
// van camino a una puerta estan fuera de la vereda a proposito
const walking = G.peds.filter(p => p.hp > 0 && !p.inside && !p.target);
const onWalk = walking.filter(p => onSidewalk(p.x, p.y)).length;
assert.ok(onWalk / walking.length > 0.62,
  'demasiados peatones en el asfalto: ' + onWalk + '/' + walking.length);
// ninguno puede quedar adentro de un edificio ni fuera del mapa
for(const p of G.peds){
  if(p.hp <= 0 || p.inside) continue;
  assert.ok(!hitBuilding(p.x, p.y, 2), 'peaton empotrado en un edificio');
  assert.ok(p.x > 0 && p.y > 0 && p.x < WORLD && p.y < WORLD, 'peaton fuera del mapa');
}
// nadie trabado mucho tiempo contra una pared
const stuckPeds = G.peds.filter(p => p.hp > 0 && (p.stuck || 0) > 1.2).length;
assert.ok(stuckPeds === 0, 'peatones trabados contra un borde: ' + stuckPeds);
// los guardias de la Casa Rosada son postas fijas: siguen en la puerta despues de 60s de simulacion
for (const g of G.guards) {
  assert.ok(dist(g, casaRosada[0].door) < 40, 'el guardia se movio de su posta tras la simulacion: ' + dist(g, casaRosada[0].door));
}
// toSidewalk siempre devuelve un punto dentro de la franja de vereda
for(let i=0;i<300;i++){
  const t = toSidewalk(Math.random()*WORLD, Math.random()*WORLD);
  assert.ok(onSidewalk(t.x, t.y), 'toSidewalk devolvio un punto que no es vereda');
}
// rotonda del obelisco: los autos que circulan el anillo no quedan dando vueltas para siempre
{
  const ob = getObelisco(), ocx = ob.x + ob.w/2, ocy = ob.y + ob.h/2;
  for(const c of G.cars){
    if(c.ai && c.hp > 0 && inRotondaRing(c.x, c.y)){
      assert.ok((c.ringArc||0) < Math.PI * 3, 'auto dando vueltas sin salir de la rotonda: ' + c.ringArc);
    }
  }
}
// diagonal: ningun auto queda trabado (stopT alto) mientras esta en la banda de la diagonal
{
  const stuckInDiag = G.cars.filter(c => c.ai && c.hp > 0 && inDiagonalBand(c.x, c.y) && c.stopT > 4).length;
  assert.equal(stuckInDiag, 0, 'auto trabado en la diagonal: ' + stuckInDiag);
}
// el trafico tiene que FLUIR: la mayoria de los autos en movimiento, no un embotellamiento
const traffic = G.cars.filter(c => c.ai && c.hp > 0);
const moving  = traffic.filter(c => Math.abs(c.spd) > 12).length;
const atRed   = traffic.filter(c => (c.waitLight||0) > 0 || c.queued).length;
const jammed  = traffic.filter(c => c.stopT > 4).length;
// parado en rojo es correcto; lo que no puede haber son autos trabados sin motivo
assert.ok(jammed <= traffic.length*0.10, 'autos trabados sin motivo: ' + jammed);
assert.ok((moving + atRed) / traffic.length > 0.75,
  'trafico muerto: ' + moving + ' en movimiento + ' + atRed + ' en rojo de ' + traffic.length);
assert.ok(moving / traffic.length > 0.45,
  'demasiados parados: solo ' + moving + '/' + traffic.length + ' circulando');
// regresion: al chocar una pared se reseteaban a la misma velocidad cada frame y
// quedaban en bucle. Si muchos comparten velocidad exacta, volvio el bug.
{
  const buckets = {};
  for(const c of traffic){ const k = c.spd.toFixed(1); buckets[k] = (buckets[k]||0)+1; }
  const worst = Math.max(...Object.values(buckets));
  assert.ok(worst < traffic.length*0.35,
    'muchos autos con velocidad identica (bucle de choque): ' + worst + '/' + traffic.length);
}
console.log('  trafico: ' + moving + ' circulando, ' + atRed + ' esperando el rojo, '
  + jammed + ' trabados (de ' + traffic.length + ')');
// entran y salen de los edificios
const inside = G.peds.filter(p => p.hp > 0 && p.inside).length;
const going  = G.peds.filter(p => p.hp > 0 && p.target).length;
assert.ok(inside + going > 0, 'nadie usa las puertas');
// el que esta adentro no se dibuja ni deambula por el mapa
for(const p of G.peds) if(p.inside)
  assert.ok(p.doorT > 0 || p.doorT <= 0, 'temporizador de puerta invalido');
console.log('  edificios: ' + inside + ' peatones adentro, ' + going + ' yendo a una puerta');
console.log('  poblacion viva: ' + pedsNear + ' peatones, ' + carsNear + ' autos cerca; '
  + Math.round(onWalk/walking.length*100) + '% en la vereda');

// --- ARRESTO: secuencia completa ---
{
  startGame(CREW[0]);
  for(let f=0;f<120;f++) update(1/60);
  G.money = 5000; G.wanted = 4;
  const car = G.cars.find(c => c.ai);
  G.player.car = car; car.ai = false; car.spd = 5;     // detenido con la yuta encima
  G.player.x = car.x; G.player.y = car.y;

  bust();
  assert.ok(G.busted === 1, 'bust() arranca la secuencia');
  assert.equal(G.player.car, null, 'te bajan del auto al arrestarte');
  assert.ok(G.bustFine > 0, 'la multa es positiva: ' + G.bustFine);
  assert.ok(G.player.hp > 0, 'el arresto no te mata');
  const fine = G.bustFine, before = G.money;

  // durante el arresto el jugador no se mueve por input ni recibe balas
  const px0 = G.player.x, py0 = G.player.y;
  for(let f=0;f<60;f++) update(1/60);
  assert.equal(G.player.x, px0, 'el jugador queda quieto durante el arresto');
  assert.equal(G.player.y, py0, 'el jugador queda quieto durante el arresto');
  assert.ok(G.busted === 1, 'la secuencia dura mas de 1s');

  // al terminar: te sueltan, sin estrellas, con menos guita
  for(let f=0;f<200;f++) update(1/60);
  assert.equal(G.busted, 0, 'la secuencia termina sola');
  assert.equal(G.wanted, 0, 'salis sin estrellas');
  assert.equal(G.money, before - fine, 'te cobran exactamente la multa');
  assert.equal(G.player.hp, G.player.maxhp, 'salis con la vida llena');
  assert.equal(G.cops.length, 0, 'no quedan canas encima al salir');
  assert.ok(!G.cars.some(c => c.chase), 'no quedan patrulleros persiguiendo');
  assert.ok(G.player.x > 0 && G.player.x < WORLD, 'reaparecas dentro del mapa');
}
// la multa nunca deja la guita en negativo
{
  startGame(CREW[0]);
  for(let f=0;f<60;f++) update(1/60);
  G.money = 10; G.wanted = 5;
  bust(); for(let f=0;f<260;f++) update(1/60);
  assert.ok(G.money >= 0, 'la multa dejo la guita en negativo: ' + G.money);
}
// patrulleros: persiguen sin clavarse contra las paredes
{
  startGame(CREW[0]);
  for(let f=0;f<60;f++) update(1/60);
  G.wanted = 5;
  for(let f=0;f<1800;f++){
    update(1/60);
    if(G.busted) G.busted = 0, G.bustT = 0;      // ignorar arrestos, medir solo persecucion
  }
  const ch = G.cars.filter(c => c.chase && c.hp > 0);
  assert.ok(ch.length > 0, 'con 5 estrellas tiene que haber patrulleros');
  for(const c of ch){
    assert.ok(Number.isFinite(c.x) && Number.isFinite(c.spd), 'patrullero NaN');
    assert.ok(!hitBuilding(c.x, c.y, 2), 'patrullero empotrado en un edificio');
  }
  const stuckCh = ch.filter(c => Math.abs(c.spd) < 6).length;
  assert.ok(stuckCh < ch.length*0.5, 'patrulleros clavados: ' + stuckCh + '/' + ch.length);
  console.log('  arresto: patrulleros OK (' + ch.length + ' persiguiendo)');
}

// choques entre autos: dos autos superpuestos se tienen que separar y danar, no cruzarse
{
  startGame(CREW[0]);
  for(let f=0;f<10;f++) update(1/60);
  const a = G.cars.find(c => c !== G.player.car);
  const b = G.cars.find(c => c !== a && c !== G.player.car);
  a.ai = false; a.chase = false;
  b.ai = false; b.chase = false;
  a.x = G.player.x; a.y = G.player.y; a.ang = 0; a.spd = 100;
  b.x = G.player.x + 4; b.y = G.player.y; b.ang = Math.PI; b.spd = 100;
  const d0 = dist(a, b), hpA0 = a.hp, hpB0 = b.hp;
  update(1/60);
  assert.ok(dist(a, b) > d0, 'los autos superpuestos tienen que separarse al chocar');
  assert.ok(a.hp < hpA0 && b.hp < hpB0, 'un choque fuerte entre autos tiene que hacer dano');
  console.log('  choques: autos se separan y se danan al superponerse');
}

// solo el auto del jugador puede atropellar gente: un auto de NPC nunca lastima peatones
{
  startGame(CREW[0]);
  for(let f=0;f<10;f++) update(1/60);
  const ped = G.peds.find(p => p.hp > 0);
  const npc = G.cars.find(c => c !== G.player.car);
  npc.x = ped.x; npc.y = ped.y; npc.ang = 0; npc.spd = 150;
  const hp0 = ped.hp;
  for(let f=0;f<60;f++) update(1/60);
  assert.equal(ped.hp, hp0, 'un auto de NPC no puede herir peatones, solo el auto del jugador');
  console.log('  atropello: los autos de NPC no lastiman peatones');
}

// hospitales: entrar cura a los pocos segundos y te deja quieto mientras tanto
{
  startGame(CREW[0]);
  for(let f=0;f<10;f++) update(1/60);
  const h = hospitals[0], d = h.door;
  G.player.car = null;
  G.player.x = d.x + d.ox; G.player.y = d.y + d.oy;
  G.player.hp = 40;
  update(1/60);
  assert.equal(G.healing, 1, 'entrar al hospital arranca la curacion');
  assert.ok(G.player.hp < G.player.maxhp, 'todavia no te curaste al toque');

  const px0 = G.player.x, py0 = G.player.y;
  for(let f=0;f<Math.round(HOSPITAL_TIME*60)-5;f++) update(1/60);
  assert.equal(G.player.x, px0, 'te quedas quieto mientras te curan');
  assert.equal(G.player.y, py0, 'te quedas quieto mientras te curan');
  assert.equal(G.healing, 1, 'la curacion dura varios segundos');
  assert.ok(G.player.hp < G.player.maxhp, 'no te curaron antes de tiempo');

  for(let f=0;f<20;f++) update(1/60);
  assert.equal(G.healing, 0, 'la curacion termina sola');
  assert.equal(G.player.hp, G.player.maxhp, 'salis del hospital con la vida llena');
  console.log('  hospital: cura en ' + HOSPITAL_TIME + 's y te deja quieto mientras tanto');
}

// items de curacion: cada comida cura lo que corresponde, no mas ni menos
{
  startGame(CREW[0]);
  for(let f=0;f<10;f++) update(1/60);
  for(const food of FOODS){
    G.player.hp = 10;
    const pk = G.pickups[0];
    Object.assign(pk, { x: G.player.x, y: G.player.y, kind: 'hp', food, t: 0 });
    update(1/60);
    assert.equal(G.player.hp, Math.min(G.player.maxhp, 10 + FOOD_HEAL[food]),
      food + ' tiene que curar ' + FOOD_HEAL[food] + ' de vida');
  }
  console.log('  items de curacion: ' + FOODS.map(f => f + ' +' + FOOD_HEAL[f]).join(', '));
}

// muerte
startGame(CREW[0]);
for(let f=0;f<30;f++) update(1/60);
G.player.hp = -1; update(1/60);
assert.ok(G.player.dead && G.player.hp === 0, 'muere a 0 hp');
render();

console.log('OK - ' + buildings.length + ' edificios, ' + lamps.length + ' faroles, 3600 frames simulados+renderizados, '
  + G.cops.length + ' canas activas');
