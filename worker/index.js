// الصبح الأسود on Cloudflare, at not-sal.com/alsobh/: the game page from static assets, and one
// Durable Object per room that relays messages between the phones over WebSockets.
// The game encrypts private data itself; the server only passes it along.
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

const MAX = 64 * 1024; // one message; the game sends well under 8 KB

export class Room {
  constructor(state) {
    this.state = state;
    // keep-alive pings are answered without waking the room up
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  async fetch() {
    if (this.state.getWebSockets().length >= 40) return new Response('room is full', { status: 429 });
    const pair = new WebSocketPair();
    this.state.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ p: null, s: {} });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  list(skip) {
    const out = [];
    for (const ws of this.state.getWebSockets()) {
      if (ws === skip) continue;
      const a = ws.deserializeAttachment();
      if (a && a.p) out.push({ p: a.p, s: a.s || {} });
    }
    return out;
  }
  sendAll(obj, skip) {
    const msg = JSON.stringify(obj);
    for (const ws of this.state.getWebSockets()) {
      if (ws === skip) continue;
      try { ws.send(msg); } catch (e) { /* closing */ }
    }
  }
  async webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > MAX) return;
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    const a = ws.deserializeAttachment() || {};
    if (m.t === 'hi' || m.t === 'pr') {
      a.p = String(m.p || a.p || '').slice(0, 40);
      a.s = m.s && typeof m.s === 'object' ? m.s : {};
      if (JSON.stringify(a.s).length > 2048) a.s = {};
      ws.serializeAttachment(a);
      this.sendAll({ t: 'peers', l: this.list() });
    } else if (m.t === 'e' && a.p && typeof m.k === 'string') {
      this.sendAll({ t: 'e', k: m.k.slice(0, 20), d: m.d, p: a.p }, ws);
    }
  }
  async webSocketClose(ws) { this.gone(ws); }
  async webSocketError(ws) { this.gone(ws); }
  gone(ws) {
    try { ws.serializeAttachment({ p: null }); } catch (e) { /* closed */ }
    try { ws.close(1000, 'bye'); } catch (e) { /* closed */ }
    this.sendAll({ t: 'peers', l: this.list(ws) }, ws);
  }
}
