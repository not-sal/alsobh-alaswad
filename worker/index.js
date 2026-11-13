// الصبح الأسود on Cloudflare, at not-sal.com/alsobh/.
// The page comes from static assets. Every room is a Durable Object that runs the game itself:
// it holds the cards, plays the bots, keeps the clock, and sends each phone only what that
// player may see. No phone holds anyone else's secrets, so nobody can peek or cheat.
import LE from './engine.js';

const PREFIX = '/alsobh';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === PREFIX || url.pathname === '/') return Response.redirect(url.origin + PREFIX + '/' + url.search, 301);
    const m = url.pathname.match(/\/ws\/([\w-]{1,40})$/);
    if (m) {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected a websocket', { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};

const MAX = 16 * 1024;
const IDLE_MS = 6 * 3600 * 1000; // a room nobody touched for six hours can be made again
const BOT_NAMES = LE.BOT_NAMES;
const clean = (s) => String(s || '').replace(/[\u0000-\u001f​-‏‪-‮]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const okId = (s) => typeof s === 'string' && /^[\w-]{6,40}$/.test(s);

export class Room {
  constructor(state) {
    this.state = state;
    this.st = null; // { code, lobby:[{nick,bot,cid,host}], opts, G, hostCid, at, secs:{cid:secret} }
    this.h = { hold: 0, lastRev: 0, lastShow: 0, lastTn: null, awSig: '', awAt: 0, botAt: {}, tKey: '', tAt: 0, miss: {}, missAt: '', errs: {}, acks: {}, gone: {} };
    this.timer = null;
    this.bq = null;
    this.saveT = null;
    this.state.blockConcurrencyWhile(async () => {
      this.st = (await this.state.storage.get('st')) || null;
      if (this.st && this.st.G) { this.h.lastShow = this.st.G.fi; this.h.lastRev = this.st.G.fi; this.h.lastTn = this.st.G.turnN; this.h.tAt = Date.now(); }
    });
  }

  async fetch(request) {
    if (this.state.getWebSockets().length >= 40) return new Response('room is full', { status: 429 });
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ cid: null });
    this.run();
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  // ---------- sockets ----------
  socks(cid) { return this.state.getWebSockets().filter((ws) => { const a = ws.deserializeAttachment(); return a && a.cid && (!cid || a.cid === cid); }); }
  online(cid) { return this.socks(cid).length > 0; }
  send(ws, o) { try { ws.send(JSON.stringify(o)); } catch (e) { /* closing */ } }

  async webSocketMessage(ws, data) {
    if (data === 'ping') { this.send(ws, 'pong'); return; }
    if (typeof data !== 'string' || data.length > MAX) return;
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    const a = ws.deserializeAttachment() || {};
    if (m.t === 'create' || m.t === 'join') return this.hello(ws, m);
    if (!a.cid || !this.st) return;
    const cid = a.cid;
    if (m.t === 'act') return this.onAct(cid, m);
    if (m.t === 'lb') return this.onLobby(cid, m);
  }
  async webSocketClose(ws) { this.bye(ws); }
  async webSocketError(ws) { this.bye(ws); }
  bye(ws) {
    const a = ws.deserializeAttachment() || {};
    try { ws.close(1000, 'bye'); } catch (e) { /* closed */ }
    if (a.cid) { this.h.gone[a.cid] = Date.now(); this.changed(); }
  }

  hello(ws, m) {
    const cid = m.cid, sec = m.sec, nick = clean(m.nick);
    if (!okId(cid) || !okId(sec) || !nick) return this.send(ws, { t: 'nope', why: 'bad' });
    const fresh = !this.st || Date.now() - (this.st.at || 0) > IDLE_MS;
    if (m.t === 'create') {
      if (!fresh) return this.send(ws, { t: 'nope', why: 'exists' });
      this.st = { code: String(m.code || ''), lobby: [{ nick, bot: false, cid, host: true }], opts: { timer: 40, diff: 'normal', speed: 'normal' }, G: null, hostCid: cid, at: Date.now(), secs: { [cid]: sec } };
      this.h = Object.assign(this.h, { miss: {}, errs: {}, acks: {}, gone: {} });
    } else {
      if (fresh) return this.send(ws, { t: 'nope', why: 'missing' });
      const known = this.st.secs[cid];
      if (known && known !== sec) return this.send(ws, { t: 'nope', why: 'taken' });
      if (!known) {
        // a new phone: a seat in the lobby, or watching if the game already started
        if (!this.st.G) {
          if (this.st.lobby.length >= 12) return this.send(ws, { t: 'nope', why: 'full' });
          let n = nick;
          if (this.st.lobby.some((x) => x.nick === n)) n = (n + ' ' + (this.st.lobby.length + 1)).slice(0, 16);
          this.st.lobby.push({ nick: n, bot: false, cid });
        }
        this.st.secs[cid] = sec;
      }
    }
    ws.serializeAttachment({ cid });
    delete this.h.gone[cid];
    this.st.at = Date.now();
    this.send(ws, { t: 'ok', code: this.st.code });
    this.changed(true);
  }

  // ---------- lobby ----------
  isHost(cid) { return this.st && this.st.hostCid === cid; }
  botName() {
    const used = new Set(this.st.lobby.map((x) => x.nick));
    const free = BOT_NAMES.filter((n) => !used.has(n));
    return free.length ? free[Math.floor(Math.random() * free.length)] : 'بوت ' + (this.st.lobby.length + 1);
  }
  onLobby(cid, m) {
    const st = this.st;
    if (!this.isHost(cid)) return;
    if (m.op === 'addbot' && !st.G && st.lobby.length < 12) st.lobby.push({ nick: this.botName(), bot: true, cid: 'bot' + Math.random().toString(36).slice(2, 8) });
    else if (m.op === 'rmbot' && !st.G) st.lobby = st.lobby.filter((x) => !(x.bot && x.cid === m.cid));
    else if (m.op === 'opts' && !st.G) {
      const o = m.opts || {};
      if ([0, 40, 60, 90].includes(o.timer)) st.opts.timer = o.timer;
      if (['easy', 'normal', 'hard'].includes(o.diff)) st.opts.diff = o.diff;
      if (['normal', 'fast'].includes(o.speed)) st.opts.speed = o.speed;
    } else if (m.op === 'start' && !st.G) {
      st.lobby = st.lobby.filter((x) => x.bot || this.online(x.cid));
      if (st.lobby.length < 4 || st.lobby.length > 12) return this.err(cid, 'تحتاجون من 4 إلى 12 لاعب');
      st.G = LE.newGame(st.lobby.map((x) => ({ nick: x.nick, bot: x.bot, cid: x.cid })), { diff: st.opts.diff, speed: st.opts.speed });
      this.h = Object.assign(this.h, { hold: 0, lastRev: 0, lastShow: 0, lastTn: null, awSig: '', botAt: {}, tKey: '', tAt: Date.now(), miss: {}, missAt: '' });
    } else if (m.op === 'again' && st.G && st.G.phase === 'over') {
      st.G = null;
      st.lobby = st.lobby.filter((x) => x.bot || this.online(x.cid));
    } else return;
    this.changed(true);
  }

  // ---------- game ----------
  pid(cid) { return this.st.G ? this.st.G.players.findIndex((p) => p.cid === cid) : -1; }
  err(cid, msg, aid) { for (const ws of this.socks(cid)) this.send(ws, { t: 'err', m: msg, aid: aid || 0 }); }
  onAct(cid, m) {
    const G = this.st.G;
    const aid = typeof m.aid === 'number' ? m.aid : 0;
    if (aid && aid <= (this.h.acks[cid] || 0)) { this.changed(); return; }
    if (aid) this.h.acks[cid] = aid;
    if (!G || !m.a || typeof m.a !== 'object') { this.changed(); return; }
    const pid = this.pid(cid);
    if (pid < 0) { this.changed(); return; }
    const P = G.players[pid];
    if (m.a.t !== 'chat') { this.h.miss[pid] = 0; if (P.auto) { P.auto = false; P.awayAuto = false; } }
    if (m.a.t === 'back') { this.h.awSig = ''; this.changed(); return; }
    const r = LE.act(G, pid, m.a);
    if (!r.ok) this.err(cid, r.err, aid);
    this.changed();
  }
  timerKey(G) {
    if (G.phase === 'turn') return G.pending ? `p${G.turnN}:${G.pending.who}:${G.pending.k}:${G.pq.length}` : `t${G.turnN}`;
    if (G.phase === 'night_confess') return `n${G.nightN}`;
    return G.phase;
  }
  delayFor(G, P) {
    if ((G.phase === 'dawn' || G.phase === 'night_pick') && G.sec) {
      if (G.sec.k === 'ready') return 400;
      const lead = Math.max(0, G.sec.at + 2600 - Date.now());
      return lead + (G.sec.k === 'c' ? 1800 + Math.random() * 3600 : 1600 + Math.random() * 3400);
    }
    if (G.phase === 'night_confess') return 1300 + Math.random() * 2600;
    if (G.pending) return 2200 + Math.random() * 800;
    return G.tmode === 'choose' ? 2000 + Math.random() * 1400 : 1900 + Math.random() * 900;
  }
  runBot(pid, forced) {
    const G = this.st.G;
    let a = null;
    try { a = LE.botAct(G, pid); } catch (e) { a = null; }
    let r = a ? LE.act(G, pid, a) : { ok: false };
    if (!r.ok) r = LE.act(G, pid, LE.anyAct(G, pid));
    const P = G.players[pid];
    if (forced && r.ok && P && !P.bot) {
      if (P.cid) this.err(P.cid, 'خلصت مهلتك، البوت لعب عنك');
      if (this.h.missAt !== pid + '@' + this.h.tKey) {
        this.h.missAt = pid + '@' + this.h.tKey;
        this.h.miss[pid] = (this.h.miss[pid] || 0) + 1;
        if (this.h.miss[pid] >= 2 && !P.auto) { P.auto = true; P.awayAuto = true; }
      }
    }
    this.changed();
  }
  tick() {
    const st = this.st;
    const G = st && st.G;
    // the lobby keeps a host who is here
    if (st && !this.online(st.hostCid) && (Date.now() - (this.h.gone[st.hostCid] || 0) > 20000)) {
      const next = (G ? G.players : st.lobby).find((x) => !x.bot && x.cid && this.online(x.cid));
      if (next && next.cid !== st.hostCid) { st.hostCid = next.cid; st.lobby.forEach((x) => { x.host = x.cid === next.cid; }); this.changed(); }
    }
    if (!G || G.phase === 'over') return;
    const H = this.h, now0 = Date.now();
    const nr = G.fx.filter((f) => f.k === 'reveal' && f.i > (H.lastRev || 0));
    if (nr.length) { H.lastRev = nr[nr.length - 1].i; H.hold = Math.max(H.hold || 0, now0) + (nr.length === 1 ? 5200 : Math.min(14000, nr.length * 3100)); }
    const ns = G.fx.filter((f) => f.i > (H.lastShow || 0));
    if (ns.length) {
      H.lastShow = ns[ns.length - 1].i;
      let add = 0, drew = false;
      for (const f of ns) { if (f.k === 'play') add += 3900; else if (f.k === 'black') add += 3300; else if (f.k === 'peek') add += 2800; else if (f.k === 'ab') add += 3700; else if (f.k === 'consp') add += 2700 + (f.mv ? f.mv.length : 4) * 430; else if (f.k === 'draw' && !drew) { add += 2500; drew = true; } }
      if (add) H.hold = Math.max(H.hold || 0, now0) + add;
    }
    if (G.turnN !== H.lastTn) { if (H.lastTn != null && G.phase === 'turn') H.hold = Math.max(H.hold || 0, now0) + 2700; H.lastTn = G.turnN; }
    if (now0 < (H.hold || 0)) return;
    if (G.sec && LE.expire(G)) { H.awSig = ''; this.changed(); return; }
    const aw = LE.awaiting(G);
    const sig = [G.phase, G.turnN, G.tmode, G.tplays, G.pq.length, G.pending ? G.pending.who : '', aw.join(',')].join('|');
    const now = Date.now();
    if (sig !== H.awSig) { H.awSig = sig; H.awAt = now; H.botAt = {}; }
    const tk = this.timerKey(G);
    if (tk !== H.tKey) { H.tKey = tk; H.tAt = now; if (st.opts.timer) { this.changed(); return; } }
    for (const pid of aw) {
      const P = G.players[pid];
      const away = !P.bot && !this.online(P.cid) && now - H.awAt > 12000;
      if (away && !P.auto) { P.auto = true; P.awayAuto = true; }
      const timeout = !!st.opts.timer && !G.sec && !P.bot && now - H.tAt > st.opts.timer * 1000;
      if (!(P.bot || P.auto || away || timeout)) continue;
      if (H.botAt[pid] == null) H.botAt[pid] = H.awAt + (P.bot || P.auto ? this.delayFor(G, P) : 0);
      if (now < H.botAt[pid]) continue;
      this.runBot(pid, timeout && !P.bot && !P.auto);
      if (G.sec && G.sec.k !== 'ready') H.botAt[pid] = Date.now() + 2400 + Math.random() * 3600;
      return;
    }
  }
  run() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      try { this.tick(); } catch (e) { /* keep going */ }
      // nobody here and nothing to play: let the room sleep
      if (!this.state.getWebSockets().length) { clearInterval(this.timer); this.timer = null; this.save(true); }
    }, 250);
  }

  // ---------- views ----------
  pub() {
    const st = this.st;
    if (!st.G) return { ph: 'lobby', code: st.code, op: st.opts, hc: st.hostCid, lb: st.lobby.map((x) => ({ n: x.nick, b: x.bot ? 1 : 0, cid: x.cid, h: x.cid === st.hostCid ? 1 : 0, cn: x.bot || this.online(x.cid) ? 1 : 0 })) };
    const G = st.G;
    const p = LE.pubView(G);
    p.code = st.code; p.op = st.opts; p.hc = st.hostCid;
    p.cn = G.players.map((q) => (q.bot || this.online(q.cid) ? 1 : 0));
    p.dq = [];
    if (st.opts.timer && G.phase !== 'over' && !G.sec) {
      const aw = LE.awaiting(G).filter((i) => !G.players[i].bot && !G.players[i].auto);
      if (aw.length) p.tl = Math.max(0, Math.round(st.opts.timer - (Date.now() - this.h.tAt) / 1000));
    }
    return p;
  }
  priv(cid) {
    const base = { ack: this.h.acks[cid] || 0 };
    const G = this.st.G;
    if (!G) return base;
    const pid = this.pid(cid);
    return Object.assign(base, pid >= 0 ? LE.privView(G, pid) : { spec: 1 });
  }
  changed(now) {
    if (!this.st) return;
    this.st.at = Date.now();
    this.save();
    if (now) { clearTimeout(this.bq); this.bq = null; this.broadcast(); return; }
    if (this.bq) return;
    this.bq = setTimeout(() => { this.bq = null; this.broadcast(); }, 80);
  }
  broadcast() {
    if (!this.st) return;
    const pub = this.pub();
    const ps = JSON.stringify(pub);
    for (const ws of this.state.getWebSockets()) {
      const a = ws.deserializeAttachment();
      if (!a || !a.cid) continue;
      try { ws.send('{"t":"v","pub":' + ps + ',"priv":' + JSON.stringify(this.priv(a.cid)) + '}'); } catch (e) { /* closing */ }
    }
  }
  save(now) {
    const go = () => { this.saveT = null; if (this.st) this.state.storage.put('st', this.st).catch(() => {}); };
    if (now) { clearTimeout(this.saveT); go(); return; }
    if (!this.saveT) this.saveT = setTimeout(go, 1500);
  }
}
