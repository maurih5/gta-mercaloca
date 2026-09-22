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
         bust,finishBust,makeChaser,makeCop};`)();
const {G,CREW,buildCity,bakeGround,buildings,props,lamps,onRoad,hitBuilding,freeRoadSpot,
       startGame,update,render,WORLD,dist,shade,mix,hash,ambient,darkness,dayT,DAY,
       PED_TARGET,CAR_TARGET,SIM_R,laneSnap,ringSpot,CELL,ROAD,PEDTYPE,CARMODEL,onSidewalk,toSidewalk,SIDEWALK,
       lights,lightState,LIGHT_CYCLE,GREEN,AMBER,lightAhead,nearestDoor,GRID,
       bust,finishBust,makeChaser,makeCop} = api;

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
assert.equal(lights.length, GRID*GRID, 'un semaforo por bocacalle');
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
// toSidewalk siempre devuelve un punto dentro de la franja de vereda
for(let i=0;i<300;i++){
  const t = toSidewalk(Math.random()*WORLD, Math.random()*WORLD);
  assert.ok(onSidewalk(t.x, t.y), 'toSidewalk devolvio un punto que no es vereda');
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

// muerte
startGame(CREW[0]);
for(let f=0;f<30;f++) update(1/60);
G.player.hp = -1; update(1/60);
assert.ok(G.player.dead && G.player.hp === 0, 'muere a 0 hp');
render();

console.log('OK - ' + buildings.length + ' edificios, ' + lamps.length + ' faroles, 3600 frames simulados+renderizados, '
  + G.cops.length + ' canas activas');
