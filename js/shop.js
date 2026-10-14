/* =========================================================================
   GTA MERCALOCA - Tiendas: armería (fierros, balas, chaleco), tranza de la villa, supers y el banco
   ========================================================================= */

const SHOP_KINDS = {
  armeria: { title: 'FIERROS DEL BARRIO', sub: 'ARMERIA · sin preguntas, sin factura', items: SHOP_ITEMS },
  tranza:  { title: 'EL TRANZA', sub: 'BUNKER · pagas y te vas, no hagas lio', items: TRANZA_ITEMS },
  choto:   { title: 'CHOTO', sub: 'SUPERMERCADO · yo te conozco', items: CHOTO_ITEMS, super: true },
  noche:   { title: 'NOCHE %', sub: 'SUPERMERCADO · precios bajos, gondolas vacias', items: NOCHE_ITEMS, super: true },
  lanus:   { title: 'CHOTO LANUS', sub: 'SUCURSAL LANUS · hoy no hay carne (de nuevo)', items: LANUS_ITEMS, super: true },
  banco:   { title: 'BANCO DEL BARRIO', sub: 'BANCO · lo de adentro no te lo saca nadie', items: BANK_ITEMS, bank: true },
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
      el.classList.toggle('super', !!K.super);
      el.classList.toggle('banco', !!K.bank);
      el.classList.add('on');
    }
  }

  close() {
    G.shopOpen = false;
    const el = $('shop');
    if (el) el.classList.remove('on');
    // Que las teclas usadas en el menú no disparen ni suban al auto al volver
    keys.Space = keys.Enter = keys.KeyE = false;
    if (G.me) G.me.cool = 0.5;
  }

  // Qué se puede hacer con cada ítem según lo que ya tiene el jugador.
  // La ventana es del jugador local (G.me); en red la compra la hace el host (purchase)
  status(it, P = G.me) {
    if (it.dep) {
      const n = it.dep > 0 ? Math.min(it.dep, P.money) : Math.min(-it.dep, P.bank);
      return n > 0 ? { can: true, n, label: '$' + n } : { can: false, label: it.dep > 0 ? 'SIN GUITA' : 'SIN SALDO' };
    }
    if (inBag(it.id)) {
      if (it.out) return { can: false, label: 'NO HAY' };
      const n = P.bag[it.id] || 0;
      return game.bagCount(P) >= BAG_MAX
        ? { can: false, label: 'MOCHILA LLENA' }
        : { can: true, price: it.price, label: '$' + it.price + (n ? ' (' + n + ')' : '') };
    }
    // Armería y tranzas: con respeto sale más barato (game.price)
    const pr = game.price(P, it.price);
    if (it.id === 'porro') {
      return P.porros >= PORRO_MAX
        ? { can: false, label: 'BOLSILLO LLENO' }
        : { can: true, price: pr, label: '$' + pr + ' (' + P.porros + '/' + PORRO_MAX + ')' };
    }
    if (it.id === 'chaleco') {
      return P.armor >= 100
        ? { can: false, label: 'PUESTO' }
        : { can: true, price: pr, label: '$' + pr };
    }
    const owned = it.id in P.inv;
    if (WEAPONS[it.id].melee) {
      return owned ? { can: false, label: 'YA LO TENES' } : { can: true, price: pr, label: '$' + pr };
    }
    if (owned) {
      const rf = game.price(P, it.refill);
      return { can: true, price: rf, label: '+' + it.ammo + ' BALAS $' + rf };
    }
    return { can: true, price: pr, label: '$' + pr };
  }

  buy(i) {
    if (!this.status(this.items[i]).can) return;
    // Conectado a la sala de otro: le pide la compra al host, que contesta con el cartel
    if (net.client) {
      net.buy(this.kind, i);
      return;
    }
    const r = this.purchase(G.me, this.items[i]);
    if (r) this.say(r.msg, r.bad);
    this.render();
  }

  // Le vende it a P (le cobra y le da lo que compró). Devuelve el cartel para la tienda.
  purchase(P, it) {
    const st = it && this.status(it, P);
    if (!st || !st.can) return null;
    if (it.dep) {
      const n = it.dep > 0 ? st.n : -st.n;
      P.money -= n;
      P.bank += n;
      return { msg: (n > 0 ? 'DEPOSITASTE $' : 'SACASTE $') + Math.abs(n) + '. EN EL BANCO: $' + P.bank };
    }
    if (P.money < st.price) return { msg: 'NO TE ALCANZA LA GUITA', bad: true };
    P.money -= st.price;
    if (inBag(it.id)) {
      P.bag[it.id] = (P.bag[it.id] || 0) + 1;
      return { msg: 'A LA MOCHILA (' + game.bagCount(P) + '/' + BAG_MAX + '). C PARA COMERLO' };
    }
    if (it.id === 'porro') {
      P.porros++;
      return { msg: 'UNO MAS AL BOLSILLO. APRETA F PARA FUMAR' };
    }
    if (it.id === 'chaleco') {
      P.armor = 100;
      return { msg: 'CHALECO PUESTO' };
    }
    const refill = it.id in P.inv;
    game.giveWeapon(P, it.id, it.ammo || 0);
    P.wpn = it.id;
    return { msg: refill ? 'BALAS CARGADAS' : WEAPONS[it.id].name + ' COMPRADA' };
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
    const K = SHOP_KINDS[this.kind];
    const off = K.bank ? '  BANCO $' + G.me.bank : !K.super && game.rankOf(G.me) > 0 ? '  -' + Math.round(RANK_DISCOUNT * game.rankOf(G.me) * 100) + '% POR RESPETO' : '';
    if (money) money.textContent = '$' + G.me.money + off;
    list.innerHTML = '';
    this.items.forEach((it, i) => {
      const st = this.status(it);
      const F = FOOD[it.id];
      const name = it.name || (WEAPONS[it.id] ? WEAPONS[it.id].name : it.id.toUpperCase()
        + (F ? (F.food ? ' +' + F.food + ' HAMBRE' : '') + (F.drink ? ' +' + F.drink + ' SED' : '') : ''));
      const row = document.createElement('div');
      row.className = 'shop-row' + (i === this.sel ? ' sel' : '') + (st.can ? '' : ' off');

      const icon = document.createElement('canvas');
      icon.width = 28;
      icon.height = 16;
      icon.className = 'shop-icon';
      if (it.dep) {
        const g = icon.getContext('2d');
        g.fillStyle = '#2f8a3a';
        g.fillRect(6, 3, 16, 10);
        g.fillStyle = '#7de07d';
        g.fillRect(12, 6, 4, 4);
      } else if (inBag(it.id)) foodIcon(icon.getContext('2d'), it.id, 14, 8);
      else weaponIcon(icon.getContext('2d'), it.id, 14, 8);

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
