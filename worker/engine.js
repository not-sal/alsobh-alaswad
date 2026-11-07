/* الصبح الأسود — game engine (host-authoritative). Pure JS, no DOM. */
(function (root) {
  'use strict';

  const T = {
    ACC: { n: 'اتهام', c: 'red', v: 1, q: 35, d: 'اتهام واحد على لاعب. إذا تجمعت 7 اتهامات قدامه، اللي حط الاتهام الأخير يكشف له ورقة محاكمة.' },
    EVI: { n: 'دليل', c: 'red', v: 3, q: 6, d: 'يحسب 3 اتهامات مرة وحدة.' },
    WIT: { n: 'شاهد', c: 'red', v: 7, q: 1, d: 'يحسب 7 اتهامات: تنكشف ورقة محاكمة على طول.' },
    ALI: { n: 'فزعة', c: 'green', q: 3, d: 'تشيل لين 3 اتهامات من قدام لاعب (ما تنلعب على نفسك).' },
    ROB: { n: 'سرقة', c: 'green', q: 1, d: 'تاخذ كل الأوراق اللي بيد لاعب وتعطيها لاعب ثاني (مو لنفسك).' },
    SCA: { n: 'الناقة', c: 'green', q: 2, d: 'تنقل كل الأوراق الملعوبة قدام لاعب (الحمراء والزرقاء وريح شوي والقطة) للاعب ثاني.' },
    STO: { n: 'ريح شوي', c: 'green', q: 3, d: 'اللاعب يفوّت دوره الجاي، وبعدها تنحرق. إذا انلعبت عليه ثنتين يفوّت دورين.' },
    CUR: { n: 'إعفاء', c: 'green', q: 1, d: 'تحرق ورقة زرقاء من قدام لاعب، حتى القطة السوداء.' },
    ARS: { n: 'حريقة', c: 'green', q: 1, d: 'تحرق كل الأوراق اللي بيد لاعب.' },
    PIE: { n: 'حصن', c: 'blue', q: 1, d: 'ما ينلعب على صاحبه أي ورقة حمراء. (الناقة تقدر تنقل له اتهامات.)' },
    ASY: { n: 'السلاح', c: 'blue', q: 1, d: 'صاحبه ما ينقتل بالليل. وحدة بس في اللعبة كلها.' },
    MAT: { n: 'ارتباط', c: 'blue', q: 2, d: 'إذا انلعبت الورقتين على لاعبين، صاروا مربوطين: إذا مات واحد يموت الثاني. إذا تجمعت الثنتين على نفس اللاعب تنحرقان.' },
    NIG: { n: 'الليل', c: 'black', q: 0, d: 'ينزل الليل: الخونة يختارون ضحية، والشايب يحمي واحد، وبعدها كل واحد يقرر يعترف أو يخاطر.' },
    CON: { n: 'المؤامرة', c: 'black', q: 0, d: 'اللي قدامه القطة السوداء تنكشف له ورقة، وبعدين كل لاعب ياخذ ورقة محاكمة من اللي على يساره.' },
    CAT: { n: 'القطة السوداء', c: 'cat', q: 0, d: 'يحطها الخونة بالفجر قدام واحد ويبدأ الدور منه. بعدها مثل الورقة الزرقاء: إذا انسحبت المؤامرة تنكشف ورقة من صاحبها. «إعفاء» تحرقها و«الناقة» تنقلها، وإذا انحرقت ترجع مع الأوراق وتنلعب على لاعب.' },
  };
  const RED = { ACC: 1, EVI: 1, WIT: 1 };
  const BLUE = { PIE: 1, ASY: 1, MAT: 1 };

  const CHARS = {
    saleh: { n: 'صالح', t: 'المحقق', d: 'مرة وحدة باللعبة، في دوره يختار لاعب ويشوف ورقتين عشوائية من أوراق محاكمته المقلوبة. محد يدري وش شاف.' },
    khaled: { n: 'خالد', t: 'الحرامي', d: 'مرة وحدة باللعبة، في دوره ينشل ورقتين عشوائية من يد أي لاعب لنفسه، والدور يكمل عادي.' },
    nawaf: { n: 'نواف', t: 'الصلب', d: 'إذا تجمعت عليه الاتهامات، هو اللي يختار أي ورقة تنكشف من أوراقه، مو اللي اتهمه.' },
    abdullah: { n: 'عبدالله', t: 'أبو سبعة أرواح', d: 'أول مرة يغتالونه الخونة بالليل يقوم حي، بس تنكشف منه ورقة عشوائية للكل.' },
    ali: { n: 'علي', t: 'المستعجل', d: 'مرة وحدة باللعبة، في دوره يقول «ما أصبر»: إذا خلّص دوره ياخذ دور ثاني على طول.' },
    abuazouz: { n: 'أبو عزوز', t: 'الوصية', d: 'إذا مات يكتب وصيته: يختار لاعب، وتنفتح له ورقتين عشوائية من أوراقه، ويختار وحدة منها تنكشف للكل.' },
    noura: { n: 'نورة', t: 'الطبيبة', d: 'مرة وحدة باللعبة، بالليل تختار لاعب (غيرها) وتعالجه بالسر: إذا اغتالوه الخونة يقوم حي.' },
    azouz: { n: 'عزوز', t: 'الشقي', d: 'مرة وحدة باللعبة، في دوره ياخذ القطة السوداء من قدام صاحبها ويحطها قدام أي لاعب يبيه.' },
    hamad: { n: 'العم حمد', t: 'كبير المجلس', d: 'مرة وحدة باللعبة، في دوره يقول «دوّروا»: كل لاعب يعطي كل الأوراق اللي بيده للي على يساره.' },
  };
  // abilities you press yourself, and when
  const ACTIVE = { saleh: 'turn', khaled: 'turn', ali: 'turn', hamad: 'turn', noura: 'night', azouz: 'turn', abuazouz: 'death' };
  const CHAR_IDS = Object.keys(CHARS);
  const TRIAL = { 4: [18, 1], 5: [23, 1], 6: [27, 2], 7: [32, 2], 8: [29, 2], 9: [33, 2], 10: [27, 2], 11: [30, 2], 12: [33, 2] };
  const TN = { I: 'مسالم', W: 'خائن', C: 'شايب' };
  const BOT_NAMES = ['مطلق', 'فهيد', 'دحيم', 'سعود', 'حمدان', 'مشعل', 'عبيد', 'نايف', 'ضاري', 'بندر', 'مساعد', 'هزاع'];

  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const ok = () => ({ ok: true });
  const err = (m) => ({ ok: false, err: m || 'ما يصير' });

  // ---------- helpers ----------
  const typeOf = (G, id) => G.cards[id];
  const hasF = (G, p, t) => p.front.some((id) => G.cards[id] === t);
  const unrev = (p) => p.trial.map((c, i) => (c.r ? -1 : i)).filter((i) => i >= 0);
  const isCon = (p) => p.alive && p.trial.some((c) => c.t === 'C' && !c.r);
  const thresh = () => 7;
  const cardVal = (G, id) => (T[G.cards[id]].v || 0) * (G.dbl[id] ? 2 : 1);
  function redSum(G, p) { let s = 0; for (const id of p.front) if (RED[G.cards[id]]) s += cardVal(G, id); return s; }
  function catHolder(G) { const p = G.players.find((q) => q.front.includes(0)); return p ? p.id : null; }
  function leftOf(G, i) { const n = G.players.length; for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (G.players[j].alive) return j; } return i; }
  const nm = (G, i) => G.players[i].nick;
  // timed secret stages at dawn and night: wait for everyone's intro, the traitors (20s), then the constable (10s)
  const STAGE_MS = { ready: 60000, w: 20000, c: 10000 };
  const LEAD = 2600; // the darkness animation plays first
  const clock = () => Date.now();

  function log(G, t, m) { if (G.quiet) return; t = t.replace(/^\s+/, ''); const e = { i: ++G.li, t }; if (m) e.m = m; G.log.push(e); if (G.log.length > 40) G.log.shift(); }
  function ev(G, k, title, body, extra) { G.evs.push(Object.assign({ i: ++G.ei, k, title, body: body || '' }, extra || {})); if (G.evs.length > 8) G.evs.shift(); }
  function note(G, pid, t) { const p = G.players[pid]; p.notes.push({ i: ++G.ni, t: t.replace(/^\s+/, '') }); if (p.notes.length > 6) p.notes.shift(); }
  function fx(G, o) { o.i = ++G.fi; G.fx.push(o); if (G.fx.length > 14) G.fx.shift(); }
  function chat(G, pid, t, lw) { G.chat.push({ i: ++G.ci, p: pid, t, lw: lw ? 1 : 0 }); if (G.chat.length > 16) G.chat.shift(); }

  function botSay(G, pid, lines, prob, vars) {
    const p = G.players[pid];
    if (!p || !p.bot || G.noChatter) return;
    if (Math.random() > prob) return;
    const now = Date.now();
    if (now - (p.lastSay || 0) < 9000 || now - (G.lastBotSay || 0) < 2500) return;
    p.lastSay = now; G.lastBotSay = now;
    let s = pick(lines);
    for (const k in vars || {}) s = s.split('{' + k + '}').join(vars[k]);
    chat(G, pid, s, 0);
  }
  const SAY = {
    accused: ['ليه أنا؟! أنا ماني خاين', 'خلك مني يا {a}', '{a} يبي يبعد الشبهة عن نفسه', 'طيب يا {a}… أذكرها لك', 'هذي من وين طلعت؟!', 'يا {a} أنا ولد ديرتك!'],
    accuse: ['{t} حركاته ما تطمّن', 'أنا شاك في {t} من أول', '{t}، اعترف وريّحنا', 'شوفوا {t} كيف ساكت', 'لا تصدقونه، {t} خاين'],
    innocent: ['شفتوا؟ قلت لكم مسالم', 'ظلمتوني يا جماعة', 'ارتحتوا الحين؟'],
    witch: ['كنت حاس فيه!', 'أخيراً انكشف', 'واحد طاح، باقي غيره', 'ما خاب ظني'],
    night: ['الليلة تخوّف', 'محد ينام قبلي', 'أحس الدور علي الليلة', 'سكّروا الأبواب'],
    morning: ['صباح الخير يا ديرة', 'سلامات يا ديرة', 'الحين بنعرف مين الخاين', 'الليل هذا ما يتنسى'],
    last: ['دمي برقابكم', 'سامحتكم', 'انتبهوا من {x}', '{x} هو الخاين', 'قلت لكم من قبل'],
  };

  // quick games: move the night card from the bottom to somewhere in the middle of the pile
  function midNight(G) {
    const k = G.deck.indexOf(G.nigId);
    if (k < 0) return;
    G.deck.splice(k, 1);
    const n = G.deck.length;
    G.deck.splice(Math.floor(n * (0.3 + Math.random() * 0.25)), 0, G.nigId);
  }
  // ---------- setup ----------
  function newGame(lob, opts) {
    const n = lob.length;
    if (!TRIAL[n]) throw new Error('players 4-12');
    const seats = shuffle(lob.map((x) => Object.assign({}, x)));
    const fast = !!(opts && opts.speed === 'fast');
    const nw = TRIAL[n][1];
    // a quick game: one trial card fewer each, and the night card sits mid-deck instead of at the bottom
    const per = (n <= 7 ? 5 : n <= 9 ? 4 : 3) - (fast ? 1 : 0);
    const ni = fast ? n * per - nw - 1 : TRIAL[n][0];
    const trial = [];
    for (let i = 0; i < ni; i++) trial.push('I');
    for (let i = 0; i < nw; i++) trial.push('W');
    trial.push('C');
    shuffle(trial);
    const G = {
      v: 1, phase: 'dawn', players: [], cards: ['CAT'], deck: [], disc: [], aside: [], turn: 0, tmode: 'choose', tplays: 0,
      steps: [], pq: [], pending: null, log: [], li: 0, evs: [], ei: 0, chat: [], ci: 0, ni: 0, acc: [], wt: nw,
      nightN: 0, turnN: 0, aliUsed: false, dbl: {}, night: null, dawn: {}, sec: null, gs: [], nh: [], dh: [], win: null, teamSnap: [], catGone: false,
      salt: Math.random() * 1000, by: {}, mv: {}, fx: [], fi: 0, opts: opts || {}, noChatter: !!(opts && opts.noChatter), lastBotSay: 0,
    };
    seats.forEach((s, i) => G.players.push({
      id: i, nick: s.nick, bot: !!s.bot, cid: s.cid || null, ch: null, alive: true, trial: [], hand: [], front: [],
      witch: false, knows: false, peek: null, used: false, notes: [], auto: false, lastWords: false, lastSay: 0,
    }));
    for (const p of G.players) {
      p.trial = trial.splice(0, per).map((t) => ({ t, r: false }));
      p.witch = p.trial.some((c) => c.t === 'W');
    }
    const order = shuffle(G.players.map((p) => p.id));
    shuffle(CHAR_IDS.slice()).forEach((c, k) => { if (k < order.length) G.players[order[k]].ch = c; });
    for (let i = 0; i < n; i++) { G.acc.push(new Array(n).fill(0)); }
    const ids = [];
    for (const k in T) { for (let q = 0; q < T[k].q; q++) { G.cards.push(k); ids.push(G.cards.length - 1); } }
    shuffle(ids);
    for (let r = 0; r < 3; r++) for (const p of G.players) p.hand.push(ids.pop());
    G.cards.push('CON'); G.conId = G.cards.length - 1;
    G.cards.push('NIG'); G.nigId = G.cards.length - 1;
    ids.splice(rnd(ids.length + 1), 0, G.conId);
    ids.unshift(G.nigId); // bottom of deck (draw = pop)
    G.deck = ids;
    if (fast) midNight(G);
    const witches = G.players.filter((p) => p.witch);
    for (const w of witches) w.knows = true;
    G.teamSnap = witches.map((w) => w.id);
    log(G, 'نبدأ: وزعنا أوراق المحاكمة والشخصيات.');
    ev(G, 'dawn', 'الفجر', 'الكل يغمض… الخونة يتعارفون ويحطون القطة السوداء قدام واحد.');
    startStage(G, G.players.some((p) => !p.bot) ? 'ready' : 'w');
    return G;
  }

  // ---------- core rules ----------
  function checkWin(G) {
    if (G.phase === 'over') return;
    if (!G.players.some((p) => p.alive && p.witch)) return over(G, 'town');
    if (!G.players.some((p) => p.alive && !p.witch)) return over(G, 'witch');
  }
  function over(G, w) {
    G.phase = 'over'; G.win = w; G.pending = null; G.pq = []; G.steps = [];
    const names = G.players.filter((p) => p.witch).map((p) => p.nick).join('، ');
    if (w === 'town') { log(G, ' طاح آخر خاين. فاز المسالمين!'); ev(G, 'win', 'فاز المسالمين', 'الخونة كانوا: ' + names, { w }); }
    else { log(G, ' مات كل المسالمين. فاز الخونة!'); ev(G, 'win', 'فاز الخونة', 'الخونة كانوا: ' + names, { w }); }
  }

  function kill(G, i, cause) {
    const p = G.players[i];
    if (!p.alive) return;
    let partner = null;
    if (hasF(G, p, 'MAT')) partner = G.players.find((q) => q.alive && q.id !== i && hasF(G, q, 'MAT')) || null;
    p.alive = false;
    G.dh.push({ p: i, c: cause || '', n: G.nightN, t: G.turnN });
    p.trial.forEach((c) => { if (!c.r) { c.r = true; c.rw = 'death'; } });
    fx(G, { k: 'death', a: i });
    G.disc.push(...p.hand); p.hand = [];
    for (const id of p.front) { delete G.dbl[id]; delete G.by[id]; delete G.mv[id]; G.disc.push(id); }
    p.front = [];
    const why = { night: 'انقتل بالليل', witch: 'انكشفت ورقة خيانته', allrev: 'انكشفت كل أوراقه', link: 'مات مع اللي مربوط فيه' }[cause] || '';
    const isW = p.witch;
    log(G, ` ${p.nick} مات (${why}). أوراقه: ${p.trial.map((c) => TN[c.t]).join('، ')}`, { k: 'death', b: i, w: isW ? 1 : 0 });
    ev(G, 'death', `${p.nick} مات`, why + (isW ? ' — وكان من الخونة!' : ' — وكان مسالم.'), { p: i });
    if (!p.bot) p.lastWords = true;
    else {
      const others = G.players.filter((q) => q.alive);
      if (others.length) { G.lastBotSay = 0; p.lastSay = 0; botSay(G, i, SAY.last, 0.85, { x: pick(others).nick }); }
    }
    if (partner) { log(G, ` ${partner.nick} كان مربوط مع ${p.nick}`); kill(G, partner.id, 'link'); }
    if (p.ch === 'abuazouz' && G.players.some((q) => q.alive)) G.pq.push({ k: 'will', who: i });
    checkWin(G);
    twoLeft(G);
  }

  // with two players left every blue card leaves the game, and Robbery/Scapegoat go with them
  function twoLeft(G) {
    if (G.phase === 'over' || G.noBlue || G.players.filter((p) => p.alive).length > 2) return;
    G.noBlue = true;
    const gone = (id) => id === 0 || BLUE[G.cards[id]] || G.cards[id] === 'ROB' || G.cards[id] === 'SCA';
    G.out = [];
    for (const p of G.players) G.out.push(...p.front.filter(gone), ...p.hand.filter(gone));
    for (const p of G.players) { p.front = p.front.filter((id) => !gone(id)); p.hand = p.hand.filter((id) => !gone(id)); }
    G.out.push(...G.deck.filter(gone), ...G.disc.filter(gone));
    G.deck = G.deck.filter((id) => !gone(id)); G.disc = G.disc.filter((id) => !gone(id));
    log(G, 'بقى لاعبين بس: انشالت من اللعبة كل الأوراق الزرقاء والقطة والسرقة والناقة.');
    ev(G, 'info', 'بقى لاعبين', 'انشالت من اللعبة كل الأوراق الزرقاء والقطة، والسرقة والناقة.');
  }

  function reveal(G, i, idx, by, why) {
    const p = G.players[i];
    const c = p.trial[idx];
    if (!c || c.r) return false;
    c.r = true; c.rb = by; c.rw = why;
    fx(G, { k: 'reveal', a: i, x: idx, t: c.t, b: by, w: why });
    const src = { acc: 'بسبب الاتهامات', consp: 'بسبب المؤامرة', confess: 'اعتراف', will: 'وصية أبو عزوز', life: 'قام من موته' }[why] || '';
    log(G, ` انكشفت ورقة من ${p.nick} (${src}): ${TN[c.t]}`, { k: 'rev', a: by != null && by >= 0 && by !== i ? by : null, b: i, r: c.t });
    if (c.t === 'W') { kill(G, i, 'witch'); }
    else if (p.trial.every((x) => x.r)) { kill(G, i, 'allrev'); }
    else {
      if (c.t === 'C') { log(G, ' انكشفت ورقة الشايب… ما عاد فيه شايب يحمي بالليل.'); ev(G, 'info', 'انكشف الشايب', `${p.nick} كان الشايب. ما عاد فيه أحد يحمي بالليل.`); }
      if (why !== 'confess' && why !== 'life') botSay(G, i, SAY.innocent, 0.5);
    }
    if (c.t === 'W') { for (const q of G.players) if (q.alive && q.id !== i) { botSay(G, q.id, SAY.witch, 0.5); break; } }
    checkWin(G);
    return true;
  }

  function checkAcc(G, t, by) {
    const p = G.players[t];
    if (!p.alive) return;
    if (redSum(G, p) >= thresh(p)) {
      const keep = [];
      for (const id of p.front) { if (RED[G.cards[id]]) { delete G.dbl[id]; G.disc.push(id); } else keep.push(id); }
      p.front = keep;
      if (p.ch === 'nawaf') {
        fx(G, { k: 'ab', c: 'nawaf', a: t });
        log(G, ` تجمعت ${thresh(p)} اتهامات على ${p.nick}… بس نواف صلب: هو اللي يختار ورقته.`);
        G.pq.push({ k: 'reveal', who: t, target: t, why: 'acc' });
        return;
      }
      log(G, ` تجمعت ${thresh(p)} اتهامات على ${p.nick}. ${nm(G, by)} يكشف له ورقة.`);
      G.pq.push({ k: 'reveal', who: by, target: t, why: 'acc' });
    }
  }

  function beginTurn(G, seat) {
    const n = G.players.length;
    for (let k = 0; k <= n; k++) {
      const p = G.players[seat];
      if (!p.alive) { seat = leftOf(G, seat); continue; }
      const st = p.front.find((id) => G.cards[id] === 'STO');
      if (st != null) {
        p.front = p.front.filter((id) => id !== st); G.disc.push(st);
        log(G, ` ${p.nick} يريّح شوي ويفوّت دوره.`, { k: 'skip', b: p.id, c: 'STO' });
        seat = leftOf(G, seat); continue;
      }
      break;
    }
    G.turn = seat; G.tmode = 'choose'; G.tplays = 0; G.aliUsed = false; G.turnN++;
  }

  function startNight(G, id) {
    G.aside.push(id);
    G.phase = 'night_pick'; G.nightN++;
    G.night = { conf: {}, kill: null, prot: null, elig: [], res: null };
    for (const p of G.players) p.ln = null;
    const ws = G.players.filter((p) => p.witch);
    for (const w of ws) if (w.alive) w.knows = true;
    G.teamSnap = ws.map((w) => w.id);
    log(G, ` نزل الليل (الليلة رقم ${G.nightN}).`, { k: 'night' });
    ev(G, 'night', 'نزل الليل', 'الكل يختار لاعب… محد يدري مين صاحي.');
    startStage(G, 'w');
    for (const p of G.players) if (p.alive) { botSay(G, p.id, SAY.night, 0.35); }
  }

  function finishPicks(G) {
    const N = G.night;
    if (N.prot != null && !G.players[N.prot].alive) N.prot = null;
    if (N.prot != null) log(G, ` الشايب حط الدرع قدام ${nm(G, N.prot)}.`);
    N.elig = G.players.filter((p) => p.alive).map((p) => p.id);
    G.phase = 'night_confess';
    if (!N.elig.length) resolveNight(G);
  }

  function startStage(G, k) {
    const t = clock();
    G.sec = { k, at: t, until: t + STAGE_MS[k] + (k === 'ready' ? 0 : LEAD), props: {}, hl: null, ready: {}, guess: {} };
  }
  function keepGuesses(G) {
    const sc = G.sec;
    for (const id in sc.guess) {
      const t = sc.guess[id].t;
      G.gs.push({ p: +id, k: sc.k, t, n: G.nightN, ok: sc.k === 'w' ? (G.players[t].witch ? 1 : 0) : (G.night && G.night.prot === t ? 1 : 0) });
    }
  }
  function endW(G, t) {
    keepGuesses(G);
    G.sec = null;
    if (G.phase === 'dawn') { finishDawn(G, t); return; }
    G.night.kill = t;
    if (G.players.some((p) => isCon(p))) startStage(G, 'c');
    else finishPicks(G);
  }
  function endC(G) { keepGuesses(G); G.sec = null; finishPicks(G); }
  // the host calls this every tick: a stage whose time ran out ends with the defaults
  function expire(G, force) {
    const sc = G.sec;
    if (!sc || G.phase === 'over' || (G.phase !== 'dawn' && G.phase !== 'night_pick')) return false;
    if (!force && clock() < sc.until) return false;
    if (sc.k === 'ready') startStage(G, 'w');
    else if (sc.k === 'w') {
      const votes = {};
      for (const p of G.players) { const t = sc.props[p.id]; if (p.alive && p.witch && t != null && G.players[t].alive) votes[t] = (votes[t] || 0) + 1; }
      const keys = Object.keys(votes);
      let t;
      if (keys.length) { const mx = Math.max(...keys.map((k) => votes[k])); t = +pick(keys.filter((k) => votes[k] === mx)); }
      else { const pool = G.players.filter((p) => p.alive && !p.witch); t = (pool.length ? pick(pool) : pick(G.players.filter((p) => p.alive))).id; }
      endW(G, t);
    } else endC(G);
    G.v++; advance(G);
    return true;
  }

  function resolveNight(G) {
    const N = G.night;
    const immune = new Set();
    const confessed = [];
    for (const pid of N.elig) {
      const c = N.conf[pid];
      if (c != null && c >= 0) { immune.add(pid); confessed.push(pid); log(G, ` ${nm(G, pid)} اعترف.`); reveal(G, pid, c, pid, 'confess'); if (G.phase === 'over') break; }
    }
    let res = 'none';
    const k = N.kill;
    if (G.phase !== 'over' && k != null) {
      const kp = G.players[k];
      if (!kp.alive) res = 'already';
      else if (k === N.prot) res = 'prot';
      else if (hasF(G, kp, 'ASY')) res = 'asy';
      else if (immune.has(k)) res = 'conf';
      else if (k === N.heal) { res = 'heal'; fx(G, { k: 'ab', c: 'noura', a: G.players.findIndex((q) => q.ch === 'noura'), b: k }); }
      else if (kp.ch === 'abdullah' && !kp.used) { res = 'life'; kp.used = true; fx(G, { k: 'ab', c: 'abdullah', a: k }); }
      else { res = 'dead'; kill(G, k, 'night'); }
    }
    N.res = res;
    if (res === 'life' && G.players[k].alive && unrev(G.players[k]).length) reveal(G, k, pick(unrev(G.players[k])), k, 'life');
    for (const pid of N.elig) { const q = G.players[pid]; if (q.alive) q.ln = N.conf[pid] >= 0 ? 'c' : 'r'; }
    G.nh.push({ n: G.nightN, k, res, pr: N.prot, cf: confessed.slice() });
    const kn = k != null ? nm(G, k) : '';
    const rtxt = {
      none: 'الخونة ما اختاروا أحد.',
      dead: `الخونة اغتالوا ${kn} `,
      prot: `الخونة حاولوا يغتالون ${kn}… بس الشايب كان حاميه بالدرع `,
      asy: `الخونة حاولوا يغتالون ${kn}… بس معه السلاح ونجا`,
      conf: `الخونة حاولوا يغتالون ${kn}… بس اعترف ونجا`,
      already: `الخونة اختاروا ${kn}… بس مات قبل لا يوصلونه`,
      heal: `الخونة اغتالوا ${kn}… بس نورة الطبيبة كانت معالجته بالسر وقام حي!`,
      life: `الخونة اغتالوا ${kn}… بس عبدالله أبو سبعة أرواح قام من موته، وانكشفت منه ورقة!`,
    }[res];
    let body = rtxt;
    if (confessed.length) body += '\nاعترفوا وأمنوا: ' + confessed.map((i) => nm(G, i)).join('، ');
    const risked = N.elig.filter((i) => N.conf[i] === -1 && G.players[i].alive);
    if (risked.length) body += '\nخاطروا: ' + risked.map((i) => nm(G, i)).join('، ');
    log(G, ' طلع الصبح. ' + rtxt, { k: 'morning', b: k != null ? k : null, res });
    ev(G, 'morning', 'طلع الصبح', body, { res, kill: k });
    if (G.phase !== 'over') {
      G.phase = 'turn';
      G.steps.unshift({ s: 'nightEnd' });
      for (const p of G.players) if (p.alive && p.bot) { botSay(G, p.id, SAY.morning, 0.3); }
    }
  }

  function conspSwap(G) {
    const alive = G.players.filter((p) => p.alive).map((p) => p.id);
    if (alive.length < 2) return;
    const moves = alive.map((i) => { const f = leftOf(G, i); const pool = unrev(G.players[f]); return { to: i, from: f, card: G.players[f].trial[pick(pool)] }; });
    for (const m of moves) { const f = G.players[m.from]; f.trial.splice(f.trial.indexOf(m.card), 1); }
    for (const m of moves) G.players[m.to].trial.push(m.card);
    for (const id of alive) { const p = G.players[id]; const slots = unrev(p); const cs = shuffle(slots.map((k) => p.trial[k])); slots.forEach((k, j) => { p.trial[k] = cs[j]; }); }
    for (const m of moves) {
      note(G, m.to, `المؤامرة: أخذت ورقة «${TN[m.card.t]}» من ${nm(G, m.from)}.`);
      note(G, m.from, `المؤامرة: ${nm(G, m.to)} أخذ منك ورقة «${TN[m.card.t]}».`);
    }
    for (const id of alive) {
      const p = G.players[id];
      if (!p.witch && p.trial.some((c) => c.t === 'W')) { p.witch = true; p.knows = false; note(G, id, ' جاتك ورقة خائن… صرت مع الخونة لين آخر اللعبة.'); }
    }
    log(G, 'المؤامرة: ' + moves.map((m) => `${nm(G, m.to)} أخذ من ${nm(G, m.from)}`).join('، '), { k: 'consp', mv: moves.map((m) => [m.to, m.from]) });
    fx(G, { k: 'consp', mv: moves.map((m) => [m.to, m.from]) });
    checkWin(G);
  }

  function runStep(G, st) {
    const P = G.players[G.turn];
    switch (st.s) {
      case 'draw': {
        if (!P.alive) { G.steps = G.steps.filter((s) => s.s !== 'draw'); return; }
        if (!G.deck.length) { G.steps = G.steps.filter((s) => s.s !== 'draw'); return; }
        const top = G.deck[G.deck.length - 1];
        if (top === G.nigId && G.lastNightTurn === G.turnN && G.deck.length === 1) { G.steps = G.steps.filter((s) => s.s !== 'draw'); return; }
        const id = G.deck.pop();
        const t = G.cards[id];
        if (t === 'NIG') { G.lastNightTurn = G.turnN; fx(G, { k: 'black', a: P.id, t: 'NIG' }); startNight(G, id); return; }
        if (t === 'CON') {
          G.disc.push(id);
          fx(G, { k: 'black', a: P.id, t: 'CON' });
          log(G, ` ${P.nick} سحب ورقة المؤامرة!`, { a: P.id, c: 'CON' });
          ev(G, 'consp', 'المؤامرة!', (catHolder(G) == null) ? 'ما فيه أحد قدامه القطة، فما تنكشف ورقة. وكل لاعب ياخذ ورقة من اللي على يساره.' : `${nm(G, catHolder(G))} قدامه القطة السوداء وبتنكشف له ورقة. وبعدها كل لاعب ياخذ ورقة من اللي على يساره.`);
          G.steps.unshift({ s: 'cReveal' }, { s: 'cSwap' });
          return;
        }
        P.hand.push(id);
        fx(G, { k: 'draw', a: P.id });
        note(G, P.id, `سحبت: ${T[t].n}`);
        return;
      }
      case 'end': if (G.again === G.turn && G.players[G.turn].alive) { G.again = null; log(G, ` ${P.nick} ياخذ دوره الثاني`); beginTurn(G, G.turn); return; } if (G.again === G.turn) G.again = null; beginTurn(G, leftOf(G, G.turn)); return;
      case 'cReveal': { const h = catHolder(G); if (h != null && G.players[h].alive) G.pq.push({ k: 'reveal', who: G.turn, target: h, why: 'consp' }); return; }
      case 'cSwap': conspSwap(G); return;
      case 'nightEnd': {
        const d = shuffle(G.disc.splice(0));
        while (G.aside.length) d.unshift(G.aside.pop());
        G.deck = d.concat(G.deck);
        if (G.opts && G.opts.speed === 'fast') midNight(G);
        G.night = null;
        log(G, 'خبصنا الأوراق المحروقة ورجعناها للسحب، والليل تحت.');
        return;
      }
    }
  }

  function validPending(G, p) {
    if (p.k === 'reveal') { const t = G.players[p.target]; return t.alive && unrev(t).length > 0; }
    if (p.k === 'will') return G.players.some((q) => q.alive && q.id !== p.who && unrev(q).length);
    return false;
  }

  function advance(G) {
    for (let guard = 0; guard < 1000; guard++) {
      if (G.phase === 'over') { G.pending = null; return; }
      while (G.pq.length && !validPending(G, G.pq[0])) G.pq.shift();
      if (G.pq.length) { G.pending = G.pq[0]; return; }
      G.pending = null;
      if (G.phase !== 'turn') return;
      if (!G.steps.length) {
        if (!G.players[G.turn].alive) { G.steps.push({ s: 'end' }); continue; }
        return;
      }
      runStep(G, G.steps.shift());
    }
  }

  // ---------- actions ----------
  function finishDawn(G, t) {
    G.players[t].front.push(0); G.by[0] = -1; delete G.mv[0];
    fx(G, { k: 'cat', b: t });
    log(G, ` طلع الفجر: القطة السوداء قدام ${nm(G, t)}، والدور يبدأ منه.`);
    ev(G, 'dawnEnd', 'طلع الفجر', `القطة السوداء قدام ${nm(G, t)}، والدور يبدأ منه.`);
    G.dawn = null;
    G.phase = 'turn';
    beginTurn(G, t);
  }

  function playCard(G, pid, id, a) {
    const P = G.players[pid];
    const type = G.cards[id];
    const t = a.target, t2 = a.target2;
    const tp = G.players[t];
    const valid1 = tp && tp.alive && t !== pid;
    const valid2 = (x) => { const q = G.players[x]; return q && q.alive && x !== pid && x !== t; };
    const rm = () => { P.hand.splice(P.hand.indexOf(id), 1); };
    if (RED[type]) {
      if (!valid1) return err('اختر لاعب غيرك');
      if (hasF(G, tp, 'PIE')) return err('عنده حصن، ما ينلعب عليه أحمر');
      rm();
      let v = T[type].v;
      tp.front.push(id); G.by[id] = pid; delete G.mv[id];
      G.acc[pid][t] += v;
      log(G, ` ${P.nick} لعب «${T[type].n}» على ${tp.nick} — صار عليه ${redSum(G, tp)}/${thresh(tp)}`, { a: pid, b: t, c: type, n: 1, s: redSum(G, tp) });
      if (tp.bot && redSum(G, tp) > 0) botSay(G, t, SAY.accused, 0.35, { a: P.nick });
      if (P.bot) botSay(G, pid, SAY.accuse, 0.15, { t: tp.nick });
      checkAcc(G, t, pid);
      return ok();
    }
    switch (type) {
      case 'ALI': {
        if (!valid1) return err('اختر لاعب غيرك');
        const reds = tp.front.filter((x) => RED[G.cards[x]]);
        if (!reds.length) return err('ما عليه اتهامات');
        rm();
        reds.sort((x, y) => cardVal(G, y) - cardVal(G, x));
        let s = 0;
        const cap = 3;
        for (const x of reds) { const v = cardVal(G, x); if (G.cards[x] !== 'WIT' && s + v <= cap) { s += v; tp.front.splice(tp.front.indexOf(x), 1); delete G.dbl[x]; G.disc.push(x); } }
        G.disc.push(id);
        log(G, ` ${P.nick} فزع لـ${tp.nick} وشال ${s} اتهامات — باقي ${redSum(G, tp)}/${thresh(tp)}`, { a: pid, b: t, c: 'ALI', s: redSum(G, tp) });
        return ok();
      }
      case 'ROB': {
        if (!valid1) return err('اختر اللي بتسرقه');
        if (!valid2(t2)) return err('اختر لاعب ثالث تعطيه الأوراق');
        if (!tp.hand.length) return err('يده فاضية');
        rm();
        const moved = tp.hand.splice(0);
        G.players[t2].hand.push(...moved);
        G.disc.push(id);
        log(G, ` ${P.nick} سرق ${moved.length} أوراق من يد ${tp.nick} وعطاها ${nm(G, t2)}`, { a: pid, b: t, d: t2, c: 'ROB', n: moved.length });
        note(G, t2, `جتك ${moved.length} أوراق من سرقة ${tp.nick}.`);
        return ok();
      }
      case 'SCA': {
        if (!valid1) return err('اختر اللي بتنقل من قدامه');
        if (!valid2(t2)) return err('اختر لاعب ثالث تنقلها له');
        if (!tp.front.length) return err('ما قدامه شي');
        rm();
        const moved = tp.front.splice(0);
        const dp = G.players[t2];
        let burned = false;
        for (const x of moved) {
          if (G.cards[x] === 'MAT' && hasF(G, dp, 'MAT')) {
            const other = dp.front.find((y) => G.cards[y] === 'MAT');
            dp.front.splice(dp.front.indexOf(other), 1); G.disc.push(other, x); burned = true;
          } else { dp.front.push(x); G.mv[x] = pid; }
        }
        G.disc.push(id);
        log(G, ` ${P.nick} لعب الناقة: نقل كل اللي قدام ${tp.nick} إلى ${dp.nick}${burned ? ' (وانحرقت ورقتين الارتباط)' : ''} — صار عليه ${redSum(G, dp)}/${thresh(dp)}`, { a: pid, b: t, d: t2, c: 'SCA', n: moved.length });
        checkAcc(G, t2, pid);
        return ok();
      }
      case 'STO': {
        if (!valid1) return err('اختر لاعب غيرك');
        rm(); tp.front.push(id); G.by[id] = pid; delete G.mv[id];
        log(G, ` ${P.nick} لعب «ريح شوي» على ${tp.nick}: بيفوّت دوره الجاي`);
        return ok();
      }
      case 'CUR': {
        if (!valid1) return err('اختر لاعب غيرك');
        const blues = tp.front.filter((x) => x === 0 || BLUE[G.cards[x]]);
        if (!blues.length) return err('ما قدامه ورقة زرقاء');
        let c = typeof a.c2i === 'number' ? tp.front[a.c2i] : a.card2;
        if (!blues.includes(c)) c = blues[0];
        rm();
        tp.front.splice(tp.front.indexOf(c), 1);
        G.disc.push(c); delete G.by[c]; delete G.mv[c];
        log(G, ` ${P.nick} لعب «إعفاء» وحرق «${T[G.cards[c]].n}» من قدام ${tp.nick}`, { a: pid, b: t, c: 'CUR', x: c === 0 ? 'CAT' : G.cards[c] });
        G.disc.push(id);
        return ok();
      }
      case 'ARS': {
        if (!valid1) return err('اختر لاعب غيرك');
        if (!tp.hand.length) return err('يده فاضية');
        rm();
        const k = tp.hand.length; G.disc.push(...tp.hand.splice(0)); G.disc.push(id);
        log(G, ` ${P.nick} لعب «حريقة» وحرق ${k} أوراق من يد ${tp.nick}`, { a: pid, b: t, c: 'ARS', n: k });
        return ok();
      }
      case 'PIE': case 'ASY': case 'CAT': {
        if (!valid1) return err('اختر لاعب غيرك');
        rm(); tp.front.push(id); G.by[id] = pid; delete G.mv[id];
        log(G, ` ${P.nick} لعب «${T[type].n}» قدام ${tp.nick}`, { a: pid, b: t, c: type });
        return ok();
      }
      case 'MAT': {
        if (!valid1) return err('اختر لاعب غيرك');
        rm();
        if (hasF(G, tp, 'MAT')) {
          const other = tp.front.find((y) => G.cards[y] === 'MAT');
          tp.front.splice(tp.front.indexOf(other), 1); G.disc.push(other, id);
          log(G, ` ${P.nick} لعب «ارتباط» على ${tp.nick} وعنده وحدة: انحرقت الثنتين`, { a: pid, b: t, c: 'MAT' });
        } else {
          tp.front.push(id); G.by[id] = pid; delete G.mv[id];
          const o = G.players.find((q) => q.alive && q.id !== t && hasF(G, q, 'MAT'));
          log(G, ` ${P.nick} لعب «ارتباط» قدام ${tp.nick}${o ? ` — صار مربوط مع ${o.nick}` : ''}`, { a: pid, b: t, c: 'MAT', d: o ? o.id : null });
        }
        return ok();
      }
    }
    return err('هالورقة ما تنلعب');
  }

  function turnAct(G, pid, a) {
    const P = G.players[pid];
    if (a.t === 'draw') {
      if (G.tmode !== 'choose') return err('لعبت أوراق، ما تقدر تسحب الحين');
      G.tmode = 'draw';
      G.steps.push({ s: 'draw' }, { s: 'draw' }, { s: 'end' });
      log(G, ` ${P.nick} سحب ورقتين`, { a: pid, k: 'draw', n: 2 });
      return ok();
    }
    if (a.t === 'play' && Array.isArray(a.cards) && a.cards.length > 1) {
      if (G.tmode !== 'choose' && G.tmode !== 'play') return err('مو وقته');
      const ids = [...new Set(a.cards)];
      if (ids.some((id) => !P.hand.includes(id) || !RED[G.cards[id]])) return err('الأوراق مو بيدك');
      const tp = G.players[a.target];
      if (!tp || !tp.alive || a.target === pid) return err('اختر لاعب غيرك');
      if (hasF(G, tp, 'PIE')) return err('عنده حصن، ما ينلعب عليه أحمر');
      // strongest first, and stop the moment the pile reaches the limit
      ids.sort((x, y) => (T[G.cards[y]].v || 0) - (T[G.cards[x]].v || 0));
      let n = 0, v = 0;
      const pq0 = G.pq.length;
      G.quiet = true;
      for (const id of ids) {
        if (!tp.alive || G.pq.length > pq0 || redSum(G, tp) >= thresh(tp)) break;
        const r = playCard(G, pid, id, { target: a.target });
        if (!r.ok) break;
        n++; v += T[G.cards[id]].v || 0;
      }
      G.quiet = false;
      if (!n) return err('ما ينفع');
      log(G, ` ${P.nick} رمى ${n} أوراق اتهام مرة وحدة على ${tp.nick} (${v} اتهامات)${tp.alive ? ` — صار عليه ${redSum(G, tp)}/${thresh(tp)}` : ''}`, { a: pid, b: a.target, c: 'ACC', n, v, s: redSum(G, tp) });
      if (G.pq.length > pq0) log(G, ` تجمعت ${thresh(tp)} اتهامات على ${tp.nick}. ${nm(G, G.pq[G.pq.length - 1].who)} يكشف له ورقة.`);
      G.tmode = 'play'; G.tplays += n;
      fx(G, { k: 'play', a: pid, b: a.target, t: G.cards[ids[0]], n, v });
      return ok();
    }
    if (a.t === 'play') {
      if (G.tmode !== 'choose' && G.tmode !== 'play') return err('مو وقته');
      if (!P.hand.includes(a.card)) return err('الورقة مو بيدك');
      const ty = G.cards[a.card];
      const r = playCard(G, pid, a.card, a);
      if (r.ok) { G.tmode = 'play'; G.tplays++; fx(G, { k: 'play', a: pid, b: a.target, c: a.target2, t: ty }); }
      return r;
    }
    if (a.t === 'end') {
      if (G.tmode !== 'play') return err('لازم تسحب أو تلعب ورقة');
      G.steps.push({ s: 'end' });
      return ok();
    }
    if (a.t === 'peek' || a.t === 'steal' || a.t === 'rush' || a.t === 'majlis' || a.t === 'cat') {
      const need = { peek: 'saleh', steal: 'khaled', rush: 'ali', majlis: 'hamad', cat: 'azouz' }[a.t];
      if (P.ch !== need || P.used) return err('ما عندك هالقدرة');
      if (G.tmode !== 'choose' && G.tmode !== 'play') return err('مو وقته');
      const tp = G.players[a.target];
      const okT = tp && tp.alive && a.target !== pid;
      if (a.t === 'peek') {
        if (!okT || !unrev(tp).length) return err('اختر لاعب غيرك');
        P.used = true;
        P.peek = { target: a.target, ts: shuffle(unrev(tp)).slice(0, 2).map((i) => tp.trial[i].t) };
        fx(G, { k: 'ab', c: 'saleh', a: pid, b: a.target });
        note(G, pid, ` المحقق: شفت من أوراق ${tp.nick}: ${P.peek.ts.map((x) => TN[x]).join('، ')}`);
        log(G, ` ${P.nick} المحقق طالع ورقتين من أوراق ${tp.nick}`, { a: pid, b: a.target, ab: 'saleh' });
      } else if (a.t === 'steal') {
        if (!okT) return err('اختر لاعب غيرك');
        if (!tp.hand.length) return err('يده فاضية');
        P.used = true;
        const got = [];
        for (let k = 0; k < 2 && tp.hand.length; k++) got.push(tp.hand.splice(rnd(tp.hand.length), 1)[0]);
        P.hand.push(...got);
        fx(G, { k: 'ab', c: 'khaled', a: pid, b: a.target, n: got.length });
        note(G, pid, ` نشلت من ${tp.nick}: ${got.map((x) => T[G.cards[x]].n).join('، ')}`);
        note(G, a.target, ` خالد الحرامي نشل منك: ${got.map((x) => T[G.cards[x]].n).join('، ')}`);
        log(G, ` ${P.nick} الحرامي نشل ${got.length === 1 ? 'ورقة' : 'ورقتين'} من يد ${tp.nick}`, { a: pid, b: a.target, ab: 'khaled', n: got.length });
      } else if (a.t === 'rush') {
        if (G.again === pid) return err('استخدمتها');
        P.used = true; G.again = pid;
        fx(G, { k: 'ab', c: 'ali', a: pid });
        log(G, ` ${P.nick} المستعجل: له دور ثاني بعد هالدور`, { a: pid, ab: 'ali' });
      } else if (a.t === 'majlis') {
        const al = G.players.filter((q) => q.alive);
        if (al.filter((q) => q.hand.length).length < 1 || al.length < 2) return err('ما بيد أحد أوراق');
        P.used = true;
        const hands = al.map((q) => q.hand);
        al.forEach((q, k) => { const to = G.players[leftOf(G, q.id)]; to.newHand = hands[k]; });
        for (const q of al) { q.hand = q.newHand || []; delete q.newHand; }
        for (const q of al) { const from = al.find((x) => leftOf(G, x.id) === q.id); note(G, q.id, ` دوّروا! جتك ${q.hand.length} أوراق من يد ${from ? from.nick : ''}.`); }
        fx(G, { k: 'ab', c: 'hamad', a: pid });
        log(G, ` ${P.nick} كبير المجلس قال «دوّروا»: كل لاعب عطى يده للي على يساره`, { a: pid, ab: 'hamad' });
        ev(G, 'info', 'دوّروا!', 'كل لاعب عطى كل الأوراق اللي بيده للي على يساره.');
      } else {
        const h = catHolder(G);
        if (h == null) return err('القطة مو قدام أحد');
        if (!tp || !tp.alive || a.target === h) return err('اختر لاعب ثاني');
        if (a.target === pid) return err('ما تحطها قدامك: القدرات ما تنلعب على نفسك');
        P.used = true;
        const hp = G.players[h];
        hp.front.splice(hp.front.indexOf(0), 1); tp.front.push(0); G.mv[0] = pid;
        fx(G, { k: 'ab', c: 'azouz', a: pid, b: h, d: a.target });
        log(G, ` ${P.nick} الشقي أخذ القطة السوداء من قدام ${hp.nick} وحطها قدام ${tp.nick}`, { a: pid, b: h, d: a.target, c: 'CAT', ab: 'azouz' });
      }
      return ok();
    }
    return err('أمر غير معروف');
  }

  function act(G, pid, a) {
    if (!a || typeof a !== 'object') return err();
    const P = G.players[pid];
    if (!P) return err('لاعب غير معروف');
    if (a.t === 'chat') {
      let text = String(a.text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!text) return err();
      if (!P.alive) {
        if (!P.lastWords) return err('الميت ما يتكلم');
        P.lastWords = false;
        text = text.split(' ').slice(0, 3).join(' ');
        chat(G, pid, text, 1);
      } else chat(G, pid, text, 0);
      G.v++; return ok();
    }
    if (G.phase === 'over') return err('انتهت اللعبة');
    let r = err('مو وقته');
    if ((G.phase === 'dawn' || G.phase === 'night_pick') && G.sec) {
      const sc = G.sec;
      const al = (x) => x != null && G.players[x] && G.players[x].alive;
      if (a.t === 'ready') {
        if (sc.k === 'ready') { sc.ready[pid] = 1; if (G.players.every((p) => p.bot || sc.ready[p.id])) startStage(G, 'w'); }
        r = ok();
      } else if (a.t === 'prop' || a.t === 'lock') {
        if (sc.k !== 'w') return err('مو وقته');
        if (!P.alive || !P.witch) return err('غمّض عيونك، الخونة يختارون');
        if (!al(a.target)) return err('اختر لاعب عايش');
        sc.props[pid] = a.target;
        if (!P.bot && !P.auto) sc.hl = a.target;
        r = ok();
        if (a.t === 'lock') endW(G, a.target);
      } else if (a.t === 'shield') {
        if (sc.k !== 'c') return err('مو وقته');
        if (!isCon(P)) return err('مو أنت الشايب');
        if (!al(a.target) || a.target === pid) return err('اختر مين تحمي (غيرك)');
        G.night.prot = a.target;
        r = ok();
        endC(G);
      } else if (a.t === 'guess') {
        if (!P.alive) return err('أنت ميت');
        if (sc.k === 'ready') return err('مو وقته');
        if (sc.k === 'w' && P.witch) return err('أنت تختار مع ربعك');
        if (sc.k === 'c' && isCon(P)) return err('أنت الشايب');
        if (!al(a.target) || (sc.k === 'w' && a.target === pid)) return err('اختر لاعب');
        const g = sc.guess[pid];
        if (g && g.f) return err('ثبّت تخمينك خلاص');
        sc.guess[pid] = { t: a.target, f: a.fix ? 1 : 0 };
        r = ok();
      } else return err('مو وقته');
    } else if (G.phase === 'night_confess' && a.t === 'heal') {
      const N = G.night;
      if (!N.elig.includes(pid) || N.conf[pid] != null) return err('مو وقته');
      {
        if (P.ch !== 'noura' || P.used) return err('ما عندك هالقدرة');
        const tp = G.players[a.target];
        if (!tp || !tp.alive || a.target === pid) return err('اختر مين تعالج (غيرك)');
        P.used = true; N.heal = a.target;
        note(G, pid, ` عالجتي ${tp.nick} الليلة بالسر.`);
      }
      r = ok();
    } else if (G.phase === 'night_confess' && a.t === 'confess') {
      const N = G.night;
      if (!N.elig.includes(pid)) return err('أنت معفى الليلة');
      const i = a.idx;
      if (i !== -1) { if (!P.trial[i] || P.trial[i].r) return err('اختر ورقة مقلوبة'); }
      N.conf[pid] = i;
      r = ok();
      if (N.elig.every((x) => N.conf[x] != null)) resolveNight(G);
    } else if (G.phase === 'turn') {
      if (G.pending) {
        const pd = G.pending;
        if (pd.who !== pid) return err('مو دورك');
        if (pd.k === 'reveal' && a.t === 'reveal') {
          const tp = G.players[pd.target];
          if (!tp.trial[a.idx] || tp.trial[a.idx].r) return err('اختر ورقة مقلوبة');
          G.pq.shift(); G.pending = null;
          reveal(G, pd.target, a.idx, pid, pd.why);
          r = ok();
        } else if (pd.k === 'will' && a.t === 'will') {
          // first the player (then only their cards open up to him), then which card
          if (pd.target == null || !G.players[pd.target].alive) {
            const tp0 = G.players[a.target];
            if (!tp0 || !tp0.alive || a.target === pid || !unrev(tp0).length) return err('اختر لاعب عايش');
            pd.target = a.target; pd.opts = shuffle(unrev(tp0)).slice(0, 2);
            log(G, ` أبو عزوز فتح وصيته على ${tp0.nick}…`);
            if (a.idx == null) { G.v++; return ok(); }
          }
          a.target = pd.target;
          const tp = G.players[a.target];
          const u = unrev(tp);
          const ops = (pd.opts || u).filter((x) => u.includes(x));
          const idx = ops.includes(a.idx) ? a.idx : pick(ops.length ? ops : u);
          G.pq.shift(); G.pending = null;
          P.used = true;
          log(G, ` وصية أبو عزوز: ${P.nick} اختار ورقة تنكشف من ${tp.nick}`);
          reveal(G, a.target, idx, pid, 'will');
          r = ok();
        } else return err('مو وقته');
      } else {
        if (G.turn !== pid || G.steps.length) return err('مو دورك');
        r = turnAct(G, pid, a);
      }
    }
    if (r.ok) { G.v++; advance(G); }
    return r;
  }

  function awaiting(G) {
    switch (G.phase) {
      case 'dawn': case 'night_pick': {
        const sc = G.sec;
        if (!sc) return [];
        if (sc.k === 'ready') return G.players.filter((p) => !p.bot && !sc.ready[p.id]).map((p) => p.id);
        if (sc.k === 'w') {
          const ws = G.players.filter((p) => p.alive && p.witch);
          const allBots = ws.every((p) => p.bot || p.auto);
          return ws.filter((p) => sc.props[p.id] == null || ((p.bot || p.auto) && (allBots || (sc.hl != null && sc.props[p.id] !== sc.hl)))).map((p) => p.id);
        }
        const c = G.players.find((p) => isCon(p));
        return c ? [c.id] : [];
      }
      case 'night_confess': return G.night.elig.filter((x) => G.night.conf[x] == null);
      case 'turn': if (G.pending) return [G.pending.who]; return G.steps.length ? [] : [G.turn];
    }
    return [];
  }

  // ---------- views ----------
  function frontCode(G, id) { return id === 0 ? 'CAT' : G.cards[id] + (G.dbl[id] ? '2' : ''); }
  function pubView(G) {
    const isOver = G.phase === 'over';
    const N = G.night;
    return {
      v: G.v, ph: G.phase, turn: G.turn, tn: G.turnN, tm: G.tmode, dk: G.deck.length, ds: G.disc.length, nn: G.nightN, wt: G.wt, cg: G.catGone ? 1 : 0,
      pd: G.pending ? { k: G.pending.k, w: G.pending.who, tg: G.pending.target, y: G.pending.why } : null,
      pl: G.players.map((p) => ({
        n: p.nick, b: p.bot ? 1 : 0, c: p.ch, a: p.alive ? 1 : 0, cid: p.cid, ln: G.phase === 'turn' && p.alive && p.ln ? p.ln : undefined,
        tr: p.trial.map((c) => (c.r || isOver ? c.t + (c.r ? '' : '*') : '?')),
        fr: p.front.map((id) => frontCode(G, id)), fb: p.front.map((id) => (G.by[id] != null ? G.by[id] : null)), fm: p.front.map((id) => (G.mv[id] != null ? G.mv[id] : null)),
        rv: p.trial.map((c) => (c.r ? [c.rb != null ? c.rb : null, c.rw || ''] : 0)), rs: redSum(G, p), th: thresh(p), h: p.hand.length,
        ab: p.used ? 1 : 0, au: p.auto ? 1 : 0, wi: isOver || !p.alive ? (p.witch ? 1 : 0) : undefined,
      })),
      dn: null,
      sg: G.sec ? { k: G.sec.k, sl: Math.max(0, G.sec.until - clock()), d: STAGE_MS[G.sec.k], rd: G.sec.k === 'ready' ? [Object.keys(G.sec.ready).length, G.players.filter((p) => !p.bot).length] : undefined } : null,
      ng: N ? { d: G.phase === 'night_confess' ? Object.keys(N.conf).map(Number) : [], pr: G.phase === 'night_confess' ? N.prot : null, el: G.phase === 'night_confess' ? N.elig : null } : null, nb: G.noBlue ? 1 : 0,
      lg: G.log.slice(-18), ev: G.evs.slice(-5), ch: G.chat.slice(-14), win: G.win, fx: G.fx.slice(-8), sum: isOver ? { acc: G.acc, nh: G.nh, dh: G.dh } : undefined, dt: G.disc.length ? G.cards[G.disc[G.disc.length - 1]] : null,
    };
  }
  function privView(G, pid) {
    const P = G.players[pid];
    if (!P) return null;
    const v = {
      me: pid, tr: P.trial.map((c) => c.t + (c.r ? '+' : '')), hd: P.hand.map((id) => [id, G.cards[id]]),
      w: P.witch ? 1 : 0, k: P.knows ? 1 : 0, tm: P.witch && P.knows ? G.teamSnap : [], cn: isCon(P) ? 1 : 0,
      pk: P.peek, nt: P.notes.slice(-4), lw: P.lastWords ? 1 : 0, au: P.auto ? 1 : 0,
    };
    const sc = G.sec;
    if (sc) {
      if (sc.k === 'w' && P.witch && P.knows) { v.tv = {}; for (const id of G.teamSnap) if (sc.props[id] != null && id !== pid) v.tv[id] = sc.props[id]; v.mp = sc.props[pid]; }
      if (sc.guess[pid]) v.gu = sc.guess[pid];
      if (sc.k === 'ready') v.rd = sc.ready[pid] ? 1 : 0;
    }
    if (G.night) {
      v.cf = G.night.conf[pid];
      if (P.ch === 'noura' && G.night.heal != null) v.hl = G.night.heal;
      if (P.witch && P.knows) v.kt = G.phase === 'night_confess' ? G.night.kill : null;
      if (G.phase === 'night_confess') { const g = G.gs.find((x) => x.p === pid && x.k === 'c' && x.n === G.nightN); if (g) v.gc = { t: g.t, ok: g.ok }; }
    }
    if (G.phase === 'over') {
      const gw = G.gs.filter((x) => x.p === pid && x.k === 'w'), gc = G.gs.filter((x) => x.p === pid && x.k === 'c');
      v.gw = [gw.filter((x) => x.ok).length, gw.length]; v.gcs = [gc.filter((x) => x.ok).length, gc.length];
    }
 const willing = G.pq.some((x) => x.k === 'will' && x.who === pid);
    if (G.pending && G.pending.k === 'will' && G.pending.who === pid && G.pending.target != null) v.wc = G.players[G.pending.target].trial.map((c, i) => ((G.pending.opts || []).includes(i) ? c.t : '?'));
    if ((!P.alive && !willing) || G.phase === 'over') v.all = G.players.map((p) => ({ tr: p.trial.map((c) => c.t), w: p.witch ? 1 : 0 }));
    return v;
  }

  // ---------- bots ----------
  const dz = (G) => (G.opts && G.opts.diff === 'easy' ? 0 : G.opts && G.opts.diff === 'hard' ? 2 : 1);
  function noise(G, a, b) { const x = Math.sin((a + 1) * 12.9898 + (b + 1) * 78.233 + G.salt) * 43758.5453; return x - Math.floor(x); }
  function mates(G, me) { const P = G.players[me]; return P.witch && P.knows ? G.teamSnap.filter((x) => x !== me) : []; }
  function sus(G, me, t) {
    const P = G.players[me], Tp = G.players[t];
    if (t === me || !Tp.alive) return -99;
    let s = noise(G, me, t);
    const m = mates(G, me);
    if (P.witch && m.includes(t)) return -10 + s * 0.1;
    const un = unrev(Tp).length, ri = Tp.trial.filter((c) => c.r && c.t !== 'W').length;
    if (P.witch) {
      let th = 0; for (const x of m.concat([me])) th += G.acc[t][x] || 0;
      return s + th * 0.12 + (Tp.ch === 'saleh' && !Tp.used ? 0.25 : 0) + (Tp.ch === 'abdullah' && !Tp.used ? -0.25 : 0) + (isConGuess(G, t) ? 0.2 : 0) - ri * 0.05;
    }
    s += un * 0.12 - ri * 0.1 + (G.acc[t][me] || 0) * 0.07;
    if (P.peek && P.peek.target === t && G.players[t].alive) s += P.peek.ts.includes('W') && G.players[t].trial.some((c) => c.t === 'W' && !c.r) ? 5 : -0.6;
    return s;
  }
  function isConGuess() { return false; }
  function ranked(G, me, filt) {
    return G.players.filter((p) => p.alive && p.id !== me && (!filt || filt(p))).map((p) => ({ id: p.id, s: sus(G, me, p.id) })).sort((a, b) => b.s - a.s);
  }
  function topSus(G, me, filt) {
    const r = ranked(G, me, filt); if (!r.length) return null;
    const d = dz(G);
    if (d === 0 && Math.random() < 0.45) return pick(r).id;
    return (r.length > 1 && Math.random() < (d === 2 ? 0.06 : 0.25)) ? r[1].id : r[0].id;
  }
  function mostTrusted(G, me, filt) { const r = ranked(G, me, filt); return r.length ? r[r.length - 1].id : null; }

  function botOptions(G, me) {
    const P = G.players[me];
    const out = [];
    const m = mates(G, me);
    const isAlly = (q) => (P.witch ? m.includes(q.id) : sus(G, me, q.id) < 0.45);
    const isFoe = (q) => (P.witch ? !m.includes(q.id) : true);
    for (const id of P.hand) {
      const ty = G.cards[id];
      if (RED[ty]) {
        const v = T[ty].v;
        const t = topSus(G, me, (q) => isFoe(q) && !hasF(G, q, 'PIE') && !(q.ch === 'nawaf' && !q.used && redSum(G, q) + T[ty].v >= 7 && redSum(G, q) < 4));
        if (t == null) continue;
        const q = G.players[t];
        let s = 0.5 + Math.min(sus(G, me, t), 1.5) * 0.12;
        if (redSum(G, q) + v >= thresh(q)) s += 0.35;
        if (ty === 'WIT') s += 0.1;
        if (!P.witch && sus(G, me, t) < 0.35) s -= 0.2;
        out.push({ s, a: { t: 'play', card: id, target: t } });
      } else if (ty === 'ALI') {
        const c = G.players.filter((q) => q.alive && q.id !== me && isAlly(q) && redSum(G, q) >= 3).sort((a, b) => redSum(G, b) - redSum(G, a));
        if (c.length) out.push({ s: 0.62 + (redSum(G, c[0]) >= 5 ? 0.25 : 0), a: { t: 'play', card: id, target: c[0].id } });
      } else if (ty === 'SCA') {
        const src = G.players.filter((q) => q.alive && q.id !== me && isAlly(q) && redSum(G, q) >= 4).sort((a, b) => redSum(G, b) - redSum(G, a))[0];
        if (src) { const d = topSus(G, me, (q) => q.id !== src.id && isFoe(q)); if (d != null) out.push({ s: 0.72, a: { t: 'play', card: id, target: src.id, target2: d } }); }
      } else if (ty === 'STO') {
        const t = topSus(G, me, (q) => isFoe(q) && !hasF(G, q, 'STO'));
        if (t != null) out.push({ s: 0.42, a: { t: 'play', card: id, target: t } });
      } else if (ty === 'CUR') {
        let best = null;
        for (const q of G.players) {
          if (!q.alive || q.id === me) continue;
          for (const x of q.front) {
            const ct = x === 0 ? 'CAT' : G.cards[x];
            let s = 0;
            if (ct === 'ASY' || ct === 'PIE') s = isFoe(q) && !isAlly(q) ? 0.55 : 0;
            if (ct === 'CAT') s = isAlly(q) ? 0.45 : 0;
            if (ct === 'MAT') s = isAlly(q) ? 0.3 : 0;
            if (s && (!best || s > best.s)) best = { s, a: { t: 'play', card: id, target: q.id, card2: x } };
          }
        }
        if (best) out.push(best);
      } else if (ty === 'ARS') {
        const t = topSus(G, me, (q) => isFoe(q) && q.hand.length >= 4);
        if (t != null) out.push({ s: 0.4, a: { t: 'play', card: id, target: t } });
      } else if (ty === 'ROB') {
        const v = G.players.filter((q) => q.alive && q.id !== me && isFoe(q) && q.hand.length >= 4).sort((a, b) => b.hand.length - a.hand.length)[0];
        if (v) { const r = P.witch ? (m.find((x) => G.players[x].alive && x !== v.id)) : mostTrusted(G, me, (q) => q.id !== v.id); if (r != null) out.push({ s: 0.4, a: { t: 'play', card: id, target: v.id, target2: r } }); }
      } else if (ty === 'PIE' || ty === 'ASY') {
        const t = P.witch ? m.find((x) => G.players[x].alive && !hasF(G, G.players[x], ty)) : mostTrusted(G, me, (q) => !hasF(G, q, ty));
        if (t != null) out.push({ s: ty === 'ASY' ? 0.52 : 0.48, a: { t: 'play', card: id, target: t } });
      } else if (ty === 'CAT') {
        const t = topSus(G, me, (q) => isFoe(q));
        if (t != null) out.push({ s: 0.4, a: { t: 'play', card: id, target: t } });
      } else if (ty === 'MAT') {
        if (hasF(G, P, 'MAT')) continue;
        const holder = G.players.find((q) => q.alive && q.id !== me && hasF(G, q, 'MAT'));
        const t = topSus(G, me, (q) => isFoe(q) && (!holder || q.id !== holder.id));
        if (t == null) continue;
        let s = holder ? (P.witch ? (m.includes(holder.id) ? 0 : 0.5) : (sus(G, me, holder.id) > 0.6 ? 0.5 : 0.2)) : 0.38;
        if (s) out.push({ s, a: { t: 'play', card: id, target: t } });
      }
    }
    const nz = [0.6, 0.12, 0.04][dz(G)];
    for (const o of out) o.s += (Math.random() - 0.5) * nz;
    out.sort((a, b) => b.s - a.s);
    return out;
  }

  function ownRevealPick(p, prefer) {
    const u = unrev(p);
    for (const t of prefer) { const i = u.find((x) => p.trial[x].t === t); if (i != null) return i; }
    return u[0];
  }

  function botAct(G, me) {
    const P = G.players[me];
    const m = mates(G, me);
    if (G.phase === 'dawn' || G.phase === 'night_pick') {
      const sc = G.sec;
      if (!sc || sc.k === 'ready') return { t: 'ready' };
      const live = (x) => x != null && G.players[x] && G.players[x].alive;
      if (sc.k === 'w') {
        if (!P.witch) return null;
        const ws = G.players.filter((q) => q.alive && q.witch);
        const allBots = ws.every((q) => q.bot || q.auto);
        if (!allBots && live(sc.hl)) return { t: 'prop', target: sc.hl };
        const mine = sc.props[me];
        if (allBots && live(mine)) return { t: 'lock', target: mine };
        const tv = m.map((x) => sc.props[x]).filter(live);
        let t;
        if (G.phase === 'dawn') {
          if (tv.length && Math.random() < 0.75) t = tv[0];
          else if (Math.random() < 0.2) t = me;
          else { const town = G.players.filter((q) => q.alive && q.id !== me && !m.includes(q.id)); t = (town.length ? pick(town) : P).id; }
        } else if (tv.length && Math.random() < 0.8) t = tv[0];
        else { const r = ranked(G, me, (q) => !m.includes(q.id) && !hasF(G, q, 'ASY')); t = r.length ? (r.length > 1 && Math.random() < 0.3 ? r[1].id : r[0].id) : me; }
        return { t: 'prop', target: t };
      }
      if (!isCon(P)) return null;
      let t = P.witch ? (m.find((x) => G.players[x].alive) ?? mostTrusted(G, me)) : mostTrusted(G, me, (q) => !hasF(G, q, 'ASY'));
      if (t == null) t = mostTrusted(G, me);
      return t == null ? null : { t: 'shield', target: t };
    }
    if (G.phase === 'night_confess') {
      const N = G.night;
      if (P.ch === 'noura' && !P.used && N.heal == null && !N.botTried) {
        N.botTried = 1;
        const fr = G.players.filter((q) => q.alive).length;
        if (Math.random() < (fr <= 5 ? 0.7 : 0.4)) {
          const t = P.witch ? m.find((x) => G.players[x].alive) : mostTrusted(G, me, (q) => q.id !== N.prot && !hasF(G, q, 'ASY'));
          if (t != null) return { t: 'heal', target: t };
        }
      }
      if (G.night.prot === me || hasF(G, P, 'ASY')) return { t: 'confess', idx: -1 };
      const u = unrev(P);
      const hasI = u.some((i) => P.trial[i].t === 'I');
      if (P.witch && P.knows) {
        if (G.night.kill === me) { if (P.ch === 'abdullah' && !P.used) return { t: 'confess', idx: -1 }; if (hasI && u.length > 1) return { t: 'confess', idx: ownRevealPick(P, ['I']) }; return { t: 'confess', idx: -1 }; }
        if (hasI && u.length >= 3 && Math.random() < 0.2) return { t: 'confess', idx: ownRevealPick(P, ['I']) };
        return { t: 'confess', idx: -1 };
      }
      if (P.ch === 'abdullah' && !P.used) return { t: 'confess', idx: -1 };
      const aliveN = G.players.filter((q) => q.alive && q.id !== G.night.prot && !hasF(G, q, 'ASY')).length;
      const risk = 1 / Math.max(2, aliveN);
      const safeIdx = ownRevealPick(P, P.witch ? ['I', 'C'] : ['I', 'C']);
      const safe = P.trial[safeIdx] && P.trial[safeIdx].t !== 'W';
      if (safe && u.length >= 3 && Math.random() < 0.35 + risk) return { t: 'confess', idx: safeIdx };
      if (safe && u.length === 2 && Math.random() < 0.15 + risk) return { t: 'confess', idx: safeIdx };
      return { t: 'confess', idx: -1 };
    }
    if (G.phase !== 'turn') return null;
    if (G.pending) {
      const pd = G.pending;
      if (pd.k === 'reveal') {
        const tp = G.players[pd.target];
        if (pd.target === me) return { t: 'reveal', idx: ownRevealPick(tp, ['I', 'C', 'W']) };
        return { t: 'reveal', idx: pick(unrev(tp)) };
      }
      if (pd.k === 'will') {
        // the dead see every card: a traitor hides the team and spends it on a harmless card, a townsman exposes a traitor
        const live = G.players.filter((q) => q.alive && q.id !== me && unrev(q).length);
        const team = G.teamSnap;
        if (pd.target == null) {
          const t = P.witch ? (ranked(G, me, (q) => !m.includes(q.id) && unrev(q).length)[0] || {}).id : topSus(G, me, (q) => unrev(q).length > 0);
          return { t: 'will', target: t != null ? t : (live[0] || { id: 0 }).id };
        }
        let best = null;
        for (const q of live.filter((x) => x.id === pd.target)) for (const i of unrev(q).filter((x) => !pd.opts || pd.opts.includes(x))) {
          const ty = q.trial[i].t;
          let sc = Math.random() * 0.1;
          if (P.witch) sc += team.includes(q.id) ? -5 : ty === 'C' ? 2 : ty === 'I' ? 1 : -5;
          else sc += ty === 'W' ? 5 : ty === 'I' ? 0.5 : -1;
          if (!best || sc > best.sc) best = { sc, t: q.id, i };
        }
        return best ? { t: 'will', target: best.t, idx: best.i } : { t: 'will', target: live[0] ? live[0].id : 0 };
      }
      return null;
    }
    if (G.turn !== me) return null;
    if (dz(G) === 0 && G.tmode === 'choose' && Math.random() < 0.3) return { t: 'draw' };
    if ((G.tmode === 'choose' || G.tmode === 'play') && !P.used && (dz(G) > 0 || Math.random() < 0.4)) {
      const ab = botAbility(G, me, m);
      if (ab) return ab;
    }
    const opts = botOptions(G, me);
    const best = opts[0];
    if (G.tmode === 'choose') {
      if (!P.hand.length) return { t: 'draw' };
      const thr = P.hand.length >= 6 ? 0.36 : P.hand.length <= 2 ? 0.62 : 0.5;
      if (best && best.s >= thr) return best.a;
      return { t: 'draw' };
    }
    if (best && best.s >= [0.62, 0.55, 0.5][dz(G)] + G.tplays * 0.06) return best.a;
    return { t: 'end' };
  }

  function botAbility(G, me, m) {
    const P = G.players[me];
    const live = G.players.filter((q) => q.alive && q.id !== me);
    const foe = (q) => (P.witch ? !m.includes(q.id) : true);
    if (P.ch === 'saleh' && Math.random() < 0.4) {
      const t = topSus(G, me, (q) => unrev(q).length > 0 && foe(q));
      if (t != null) return { t: 'peek', target: t };
    }
    if (P.ch === 'khaled' && Math.random() < 0.45) {
      const v = live.filter((q) => q.hand.length >= 3 && foe(q)).sort((a, b) => b.hand.length - a.hand.length)[0];
      if (v) return { t: 'steal', target: v.id };
    }
    if (P.ch === 'ali' && P.hand.length >= 3 && Math.random() < 0.4) {
      const o = botOptions(G, me);
      if (o.length >= 2 && o[1].s > 0.5) return { t: 'rush' };
    }
    if (P.ch === 'hamad') {
      const L = G.players[leftOf(G, me)];
      const right = G.players.find((q) => q.alive && leftOf(G, q.id) === me);
      const goodTrade = right && right.hand.length >= P.hand.length + 2;
      if (goodTrade && Math.random() < 0.5 && L && L.id !== me) return { t: 'majlis' };
    }
    if (P.ch === 'azouz') {
      const h = catHolder(G);
      if (h != null) {
        const mine = P.witch ? m.includes(h) || h === me : h === me || sus(G, me, h) < 0.4;
        if (mine && Math.random() < 0.6) { const t = topSus(G, me, (q) => q.id !== h && foe(q)); if (t != null) return { t: 'cat', target: t }; }
      }
    }
    return null;
  }

  // fallback: any legal action (used when a bot's pick is refused)
  function anyAct(G, me) {
    const P = G.players[me];
    const alive = G.players.filter((p) => p.alive);
    if (G.phase === 'dawn' || G.phase === 'night_pick') {
      const sc = G.sec;
      if (!sc || sc.k === 'ready') return { t: 'ready' };
      const o = alive.find((p) => p.id !== me) || P;
      if (sc.k === 'w') return sc.props[me] != null ? { t: 'lock', target: sc.props[me] } : { t: 'prop', target: o.id };
      return { t: 'shield', target: o.id };
    }
    if (G.phase === 'night_confess') return { t: 'confess', idx: -1 };
    if (G.pending) { const pd = G.pending; if (pd.k === 'reveal') return { t: 'reveal', idx: unrev(G.players[pd.target])[0] }; const o = alive.find((p) => p.id !== me && unrev(p).length); const wt = pd.target != null && G.players[pd.target].alive ? G.players[pd.target] : o; return { t: 'will', target: wt ? wt.id : 0, idx: wt ? unrev(wt)[0] : 0 }; }
    return G.tmode === 'play' ? { t: 'end' } : { t: 'draw' };
  }

  const LE = { T, RED, BLUE, CHARS, ACTIVE, TN, TRIAL, BOT_NAMES, STAGE_MS, newGame, act, awaiting, expire, pubView, privView, botAct, anyAct, advance, unrev, isCon, hasF, redSum };
  if (typeof module !== 'undefined' && module.exports) module.exports = LE;
  else root.LE = LE;
})(typeof window !== 'undefined' ? window : globalThis);
