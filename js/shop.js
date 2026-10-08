/* =========================================================================
   GTA MERCALOCA - Tiendas: armería (fierros, balas, chaleco) y tranza de la villa
   ========================================================================= */

const SHOP_KINDS = {
  armeria: { title: 'FIERROS DEL BARRIO', sub: 'ARMERIA · sin preguntas, sin factura', items: SHOP_ITEMS },
  tranza:  { title: 'EL TRANZA', sub: 'BUNKER · pagas y te vas, no hagas lio', items: TRANZA_ITEMS },
};

class ShopManager {
  constructor() {
    this.sel = 0;
    this.kind = 'armeria';
    this.items = SHOP_ITEMS;
    if (typeof addEventListener !== 'undefined') {
      addEventListener('keydown', e => this.onKey(e));
    }
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.bind());
      } else {
        this.bind();
      }
    }
  }

  bind() {
    const close = $('shop-close');
    if (close) close.onclick = () => this.close();
  }

  open(kind = 'armeria') {
    const K = SHOP_KINDS[kind];
    G.shopOpen = true;
    this.kind = kind;
    this.items = K.items;
    this.sel = 0;
    this.say('');
    const title = $('shop-title'), sub = $('shop-sub');
    if (title) title.textContent = K.title;
    if (sub) sub.textContent = K.sub;
    this.render();
    const el = $('shop');
    if (el) {
      el.classList.toggle('tranza', kind === 'tranza');
      el.classList.add('on');
    }
  }

  close() {
    G.shopOpen = false;
    const el = $('shop');
    if (el) el.classList.remove('on');
    // Que las teclas usadas en el menú no disparen ni suban al auto al volver
    keys.Space = keys.Enter = keys.KeyE = false;
    if (G.player) G.player.cool = 0.5;
  }

  // Qué se puede hacer con cada ítem según lo que ya tiene el jugador
  status(it) {
    const P = G.player;
    if (it.id === 'porro') {
      return P.porros >= PORRO_MAX
        ? { can: false, label: 'BOLSILLO LLENO' }
        : { can: true, price: it.price, label: '$' + it.price + ' (' + P.porros + '/' + PORRO_MAX + ')' };
    }
    if (it.id === 'chaleco') {
      return P.armor >= 100
        ? { can: false, label: 'PUESTO' }
        : { can: true, price: it.price, label: '$' + it.price };
    }
    const owned = it.id in P.inv;
    if (WEAPONS[it.id].melee) {
      return owned ? { can: false, label: 'YA LO TENES' } : { can: true, price: it.price, label: '$' + it.price };
    }
    if (owned) {
      return { can: true, price: it.refill, label: '+' + it.ammo + ' BALAS $' + it.refill };
    }
    return { can: true, price: it.price, label: '$' + it.price };
  }

  buy(i) {
    const it = this.items[i], st = this.status(it), P = G.player;
    if (!st.can) return;
    if (G.money < st.price) {
      this.say('NO TE ALCANZA LA GUITA', true);
      return;
    }
    G.money -= st.price;
    if (it.id === 'porro') {
      P.porros++;
      this.say('UNO MAS AL BOLSILLO. APRETA F PARA FUMAR');
    } else if (it.id === 'chaleco') {
      P.armor = 100;
      this.say('CHALECO PUESTO');
    } else {
      const refill = it.id in P.inv;
      game.giveWeapon(P, it.id, it.ammo || 0);
      P.wpn = it.id;
      this.say(refill ? 'BALAS CARGADAS' : WEAPONS[it.id].name + ' COMPRADA');
    }
    this.render();
  }

  say(t, bad) {
    const el = $('shop-msg');
    if (!el) return;
    el.textContent = t;
    el.classList.toggle('bad', !!bad);
  }

  render() {
    const list = $('shop-list'), money = $('shop-money');
    if (!list) return;
    if (money) money.textContent = '$' + G.money;
    list.innerHTML = '';
    this.items.forEach((it, i) => {
      const st = this.status(it);
      const name = WEAPONS[it.id] ? WEAPONS[it.id].name : it.id.toUpperCase();
      const row = document.createElement('div');
      row.className = 'shop-row' + (i === this.sel ? ' sel' : '') + (st.can ? '' : ' off');

      const icon = document.createElement('canvas');
      icon.width = 28;
      icon.height = 16;
      icon.className = 'shop-icon';
      weaponIcon(icon.getContext('2d'), it.id, 14, 8);

      const info = document.createElement('div');
      info.className = 'shop-info';
      info.innerHTML = '<div class="shop-name"></div><div class="shop-desc"></div>';
      info.firstChild.textContent = name;
      info.lastChild.textContent = it.desc;

      const btn = document.createElement('button');
      btn.className = 'shop-buy';
      btn.textContent = st.label;
      btn.disabled = !st.can;
      btn.onclick = e => {
        e.stopPropagation();
        this.sel = i;
        this.buy(i);
      };

      row.onclick = () => {
        this.sel = i;
        this.render();
      };
      row.append(icon, info, btn);
      list.appendChild(row);
    });
    const selRow = list.children[this.sel];
    if (selRow && selRow.scrollIntoView) selRow.scrollIntoView({ block: 'nearest' });
  }

  onKey(e) {
    if (!G.shopOpen) return;
    const n = this.items.length;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.sel = (this.sel + 1) % n;
      this.render();
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.sel = (this.sel - 1 + n) % n;
      this.render();
    } else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      this.buy(this.sel);
    } else if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Backspace') {
      this.close();
    }
  }
}

const shop = new ShopManager();
