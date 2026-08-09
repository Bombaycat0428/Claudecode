/* ===================== 定数・牌の描画 ===================== */
const SEATS = ['E', 'S', 'W', 'N'];
const SEAT_LABEL = { E: '東', S: '南', W: '西', N: '北' };
const HONORS = [
  { kanji: '東', name: '東', cls: '' },
  { kanji: '南', name: '南', cls: '' },
  { kanji: '西', name: '西', cls: '' },
  { kanji: '北', name: '北', cls: '' },
  { kanji: '白', name: '白', cls: 'haku' },
  { kanji: '發', name: '發', cls: 'hatsu' },
  { kanji: '中', name: '中', cls: 'chun' },
];
const DOT_ROWS = { 1: [1], 2: [2], 3: [3], 4: [2, 2], 5: [2, 1, 2], 6: [3, 3], 7: [4, 3], 8: [4, 4], 9: [3, 3, 3] };
const SUIT_ORDER = { m: 0, p: 1, s: 2, z: 3 };

function tileHTML(type, value, size, extraClass, attrs) {
  const sizeClass = size === 'lg' ? 'tile-lg' : (size === 'sm' ? 'tile-sm' : '');
  const extra = extraClass || '';
  const attrStr = attrs ? (' ' + attrs) : '';
  if (type === 'm') {
    return `<div class="tile tile-m ${sizeClass} ${extra}"${attrStr}><span class="num">${value}</span><span class="suit">萬</span></div>`;
  }
  if (type === 'p') {
    const rows = DOT_ROWS[value].map(c => `<div class="dot-row">${'<span class="dot"></span>'.repeat(c)}</div>`).join('');
    return `<div class="tile tile-p ${sizeClass} ${extra}"${attrStr}><div class="dots">${rows}</div></div>`;
  }
  if (type === 's') {
    if (value === 1) {
      return `<div class="tile tile-s ${sizeClass} ${extra}"${attrStr}><div class="bars"><div class="bar-row"><span class="bar bar-one"></span></div></div></div>`;
    }
    const rows = DOT_ROWS[value].map(c => `<div class="bar-row">${'<span class="bar"></span>'.repeat(c)}</div>`).join('');
    return `<div class="tile tile-s ${sizeClass} ${extra}"${attrStr}><div class="bars">${rows}</div></div>`;
  }
  if (type === 'z') {
    const h = HONORS[value - 1];
    return `<div class="tile tile-z ${h.cls} ${sizeClass} ${extra}"${attrStr}><span class="kanji">${h.kanji}</span></div>`;
  }
  return '';
}
function tileBackHTML(size) {
  const sizeClass = size === 'lg' ? 'tile-lg' : (size === 'sm' ? 'tile-sm' : '');
  return `<div class="tile tile-back ${sizeClass}"></div>`;
}
function honorShortName(v) { return HONORS[v - 1].name; }
function tileLabel(t) {
  if (t.suit === 'm') return t.value + '萬';
  if (t.suit === 'p') return t.value + '筒';
  if (t.suit === 's') return t.value + '索';
  return honorShortName(t.value);
}

/* ===================== 牌山 ===================== */
function buildWall() {
  const wall = [];
  let id = 0;
  for (const suit of ['m', 'p', 's']) {
    for (let v = 1; v <= 9; v++) {
      for (let k = 0; k < 4; k++) wall.push({ id: id++, suit, value: v });
    }
  }
  for (let v = 1; v <= 7; v++) {
    for (let k = 0; k < 4; k++) wall.push({ id: id++, suit: 'z', value: v });
  }
  return wall;
}
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function sortedHand(hand) {
  return [...hand].sort((a, b) => SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit] || a.value - b.value);
}

/* ===================== 勝ち手判定 ===================== */
function decomposeSuitSets(counts, maxIdx, isHonor) {
  function rec(i) {
    while (i <= maxIdx && counts[i] === 0) i++;
    if (i > maxIdx) return [];
    if (!isHonor && i <= maxIdx - 2 && counts[i + 1] > 0 && counts[i + 2] > 0) {
      counts[i]--; counts[i + 1]--; counts[i + 2]--;
      const rest = rec(i);
      counts[i]++; counts[i + 1]++; counts[i + 2]++;
      if (rest !== null) return [{ type: 'seq', v: i }, ...rest];
    }
    if (counts[i] >= 3) {
      counts[i] -= 3;
      const rest = rec(i);
      counts[i] += 3;
      if (rest !== null) return [{ type: 'triplet', v: i }, ...rest];
    }
    return null;
  }
  return rec(1);
}
function findDecomposition(tiles, setsNeeded) {
  if (tiles.length !== setsNeeded * 3 + 2) return null;
  const counts = { m: Array(10).fill(0), p: Array(10).fill(0), s: Array(10).fill(0), z: Array(8).fill(0) };
  tiles.forEach(t => counts[t.suit][t.value]++);
  for (const suit of ['m', 'p', 's', 'z']) {
    const maxIdx = suit === 'z' ? 7 : 9;
    for (let v = 1; v <= maxIdx; v++) {
      if (counts[suit][v] >= 2) {
        counts[suit][v] -= 2;
        const setsBySuit = {};
        let ok = true;
        for (const su of ['m', 'p', 's', 'z']) {
          const res = decomposeSuitSets(counts[su], su === 'z' ? 7 : 9, su === 'z');
          if (res === null) { ok = false; break; }
          setsBySuit[su] = res;
        }
        counts[suit][v] += 2;
        if (ok) {
          const sets = [];
          for (const su of ['m', 'p', 's', 'z']) {
            setsBySuit[su].forEach(d => {
              if (d.type === 'triplet') sets.push({ type: 'triplet', suit: su, value: d.v });
              else sets.push({ type: 'seq', suit: su, start: d.v });
            });
          }
          return { pair: { suit, value: v }, sets };
        }
      }
    }
  }
  return null;
}
function isChiitoi(tiles14) {
  if (tiles14.length !== 14) return false;
  const map = {};
  tiles14.forEach(t => { const k = t.suit + t.value; map[k] = (map[k] || 0) + 1; });
  const keys = Object.keys(map);
  return keys.length === 7 && keys.every(k => map[k] === 2);
}
function isWinningShape(concealedPlusCandidate, meldsCount) {
  if (meldsCount === 0 && isChiitoi(concealedPlusCandidate)) return true;
  return findDecomposition(concealedPlusCandidate, 4 - meldsCount) !== null;
}
function isTenpaiHand(concealedTiles, meldsCount) {
  for (const suit of ['m', 'p', 's', 'z']) {
    const maxIdx = suit === 'z' ? 7 : 9;
    for (let v = 1; v <= maxIdx; v++) {
      const candidate = concealedTiles.concat([{ suit, value: v }]);
      if (isWinningShape(candidate, meldsCount)) return true;
    }
  }
  return false;
}
function meldToSetDescriptor(m) {
  if (m.type === 'chi') return { type: 'seq', suit: m.suit, start: m.start };
  return { type: 'triplet', suit: m.suit, value: m.value };
}

/* ===================== 役判定・点数 ===================== */
function doraValueFor(indicator) {
  if (indicator.suit === 'z') {
    if (indicator.value <= 4) return { suit: 'z', value: indicator.value === 4 ? 1 : indicator.value + 1 };
    return { suit: 'z', value: indicator.value === 7 ? 5 : indicator.value + 1 };
  }
  return { suit: indicator.suit, value: indicator.value === 9 ? 1 : indicator.value + 1 };
}
function isDora(t) {
  return game.doraIndicators.some(ind => {
    const d = doraValueFor(ind);
    return d.suit === t.suit && d.value === t.value;
  });
}

const SEAT_WIND_IDX = { E: 1, S: 2, W: 3, N: 4 };

function evaluateWin(seat, concealedTiles, winTile, melds, opts) {
  const concealedPlusWin = concealedTiles.concat([winTile]);
  const meldTiles = melds.reduce((acc, m) => acc.concat(m.tiles), []);
  const fullHand = concealedPlusWin.concat(meldTiles);
  const isDealer = seat === 'E';
  const seatWindIdx = SEAT_WIND_IDX[seat];
  let yaku = [];
  let usedSets;

  if (melds.length === 0 && isChiitoi(concealedPlusWin)) {
    yaku.push({ name: '七対子', han: 2 });
    usedSets = [];
  } else {
    const setsNeeded = 4 - melds.length;
    const decomposed = findDecomposition(concealedPlusWin, setsNeeded);
    if (!decomposed) return null;
    const meldSets = melds.map(meldToSetDescriptor);
    usedSets = decomposed.sets.concat(meldSets);

    if (opts.isRiichi) yaku.push({ name: 'リーチ', han: 1 });
    if (opts.isTsumo && melds.length === 0) yaku.push({ name: '門前清自摸和', han: 1 });
    if (fullHand.every(t => !(t.suit === 'z' || t.value === 1 || t.value === 9))) {
      yaku.push({ name: '断幺九', han: 1 });
    }
    if (melds.length === 0 && !fullHand.some(t => t.suit === 'z') && usedSets.every(s => s.type === 'seq')) {
      yaku.push({ name: '平和', han: 1 });
    }
    usedSets.filter(s => s.type === 'triplet' && s.suit === 'z').forEach(s => {
      if (s.value >= 5) {
        yaku.push({ name: '役牌(' + honorShortName(s.value) + ')', han: 1 });
      } else if (s.value === 1) {
        yaku.push({ name: '役牌(東)', han: seat === 'E' ? 2 : 1 });
      } else if (s.value === seatWindIdx) {
        yaku.push({ name: '役牌(' + honorShortName(s.value) + ')', han: 1 });
      }
    });
    if (melds.length === 0) {
      const seqs = usedSets.filter(s => s.type === 'seq');
      for (let i = 0; i < seqs.length; i++) {
        for (let j = i + 1; j < seqs.length; j++) {
          if (seqs[i].suit === seqs[j].suit && seqs[i].start === seqs[j].start) {
            yaku.push({ name: '一盃口', han: 1 });
          }
        }
      }
    }
  }

  if (yaku.length === 0) return null;

  const doraCount = fullHand.filter(isDora).length;
  if (doraCount > 0) yaku.push({ name: 'ドラ', han: doraCount });

  const totalHan = yaku.reduce((s, y) => s + y.han, 0);
  const points = ronPoints(totalHan, isDealer);
  return { yaku, totalHan, points, isDealer };
}

const SCORE_TABLE = { 1: [1000, 1500], 2: [2000, 2900], 3: [3900, 5800], 4: [7700, 11600] };
function ronPoints(han, isDealer) {
  let child, dealer;
  if (han >= 13) { child = 32000; dealer = 48000; }
  else if (han >= 11) { child = 24000; dealer = 36000; }
  else if (han >= 8) { child = 16000; dealer = 24000; }
  else if (han >= 6) { child = 12000; dealer = 18000; }
  else if (han >= 5) { child = 8000; dealer = 12000; }
  else { [child, dealer] = SCORE_TABLE[han]; }
  return isDealer ? dealer : child;
}

/* ===================== 局の準備 ===================== */
let game = null;

function createInitialGame() {
  const fullWall = shuffle(buildWall());
  const deadWall = fullWall.splice(fullWall.length - 14, 14);
  const players = {};
  SEATS.forEach(seat => {
    const hand = fullWall.splice(0, 13);
    players[seat] = {
      seat, isHuman: seat === 'E', isDealer: seat === 'E',
      hand, melds: [], discards: [], riichi: false, points: 25000,
      lastDrawnId: null,
    };
  });
  return {
    wall: fullWall,
    players,
    doraIndicators: [deadWall[0]],
    kanDoraPool: deadWall.slice(1, 5),
    kanDoraUsed: 0,
    riichiSticks: 0,
    result: null,
  };
}
function drawTile() {
  if (game.wall.length === 0) return null;
  return game.wall.pop();
}
function revealNewDora() {
  if (game.kanDoraUsed < game.kanDoraPool.length) {
    game.doraIndicators.push(game.kanDoraPool[game.kanDoraUsed]);
    game.kanDoraUsed++;
  }
}
function withoutTile(hand, id) { return hand.filter(t => t.id !== id); }
function removeFromHand(player, id) { player.hand = player.hand.filter(t => t.id !== id); }
function kamicha(seat) {
  const idx = SEATS.indexOf(seat);
  return SEATS[(idx - 1 + 4) % 4];
}
function nextSeatAfter(seat) {
  const idx = SEATS.indexOf(seat);
  return SEATS[(idx + 1) % 4];
}
function seatsAfter(seat) {
  const idx = SEATS.indexOf(seat);
  return [1, 2, 3].map(o => SEATS[(idx + o) % 4]);
}

/* ===================== 支払い計算 ===================== */
function computePayments(winnerSeat, winResult, isTsumo, fromSeat) {
  const payments = {}; SEATS.forEach(s => payments[s] = 0);
  const isDealer = winnerSeat === 'E';
  const pts = winResult.points;
  if (isTsumo) {
    if (isDealer) {
      const unit = Math.ceil(pts / 3 / 100) * 100;
      ['S', 'W', 'N'].forEach(s => { payments[s] -= unit; payments[winnerSeat] += unit; });
    } else {
      const unit = Math.ceil(pts / 4 / 100) * 100;
      SEATS.forEach(s => {
        if (s === winnerSeat) return;
        const pay = s === 'E' ? unit * 2 : unit;
        payments[s] -= pay; payments[winnerSeat] += pay;
      });
    }
  } else {
    payments[fromSeat] -= pts;
    payments[winnerSeat] += pts;
  }
  if (game.riichiSticks > 0) {
    payments[winnerSeat] += game.riichiSticks * 1000;
    game.riichiSticks = 0;
  }
  return payments;
}
function computeRyuukyokuPayments(tenpaiSeats) {
  const payments = {}; SEATS.forEach(s => payments[s] = 0);
  const nt = tenpaiSeats.length;
  if (nt === 0 || nt === 4) return payments;
  const totalPot = 3000;
  const perTenpai = totalPot / nt;
  const perNoten = totalPot / (4 - nt);
  SEATS.forEach(s => {
    if (tenpaiSeats.includes(s)) payments[s] += perTenpai;
    else payments[s] -= perNoten;
  });
  return payments;
}
function applyPayments(payments) {
  SEATS.forEach(s => { game.players[s].points += payments[s]; });
}

/* ===================== 呼び出し（ポン・チー・カン）判定 ===================== */
function computeCallOptions(seat, fromSeat, tile) {
  const player = game.players[seat];
  const count = player.hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
  const pon = count >= 2;
  const kan = count >= 3;
  let chi = [];
  if (fromSeat === kamicha(seat) && tile.suit !== 'z') {
    const v = tile.value;
    const has = x => player.hand.some(t => t.suit === tile.suit && t.value === x);
    if (v >= 3 && has(v - 1) && has(v - 2)) chi.push([v - 2, v - 1]);
    if (v >= 2 && v <= 8 && has(v - 1) && has(v + 1)) chi.push([v - 1, v + 1]);
    if (v <= 7 && has(v + 1) && has(v + 2)) chi.push([v + 1, v + 2]);
  }
  return { pon, kan, chi };
}
function applyPon(seat, fromSeat, tile) {
  const player = game.players[seat];
  game.players[fromSeat].discards.pop();
  const matches = player.hand.filter(t => t.suit === tile.suit && t.value === tile.value).slice(0, 2);
  matches.forEach(m => removeFromHand(player, m.id));
  player.melds.push({ type: 'pon', suit: tile.suit, value: tile.value, from: fromSeat, tiles: [...matches, tile] });
}
function applyKan(seat, fromSeat, tile) {
  const player = game.players[seat];
  game.players[fromSeat].discards.pop();
  const matches = player.hand.filter(t => t.suit === tile.suit && t.value === tile.value).slice(0, 3);
  matches.forEach(m => removeFromHand(player, m.id));
  player.melds.push({ type: 'kan', suit: tile.suit, value: tile.value, from: fromSeat, tiles: [...matches, tile] });
  revealNewDora();
}
function applyChi(seat, fromSeat, tile, combo) {
  const player = game.players[seat];
  game.players[fromSeat].discards.pop();
  const t1 = player.hand.find(t => t.suit === tile.suit && t.value === combo[0]);
  const t2 = player.hand.find(t => t.suit === tile.suit && t.value === combo[1]);
  removeFromHand(player, t1.id); removeFromHand(player, t2.id);
  const startVal = Math.min(tile.value, combo[0], combo[1]);
  player.melds.push({ type: 'chi', suit: tile.suit, start: startVal, from: fromSeat, tiles: [t1, t2, tile] });
}
function applyCall(claimant, fromSeat, tile) {
  if (claimant.type === 'pon') applyPon(claimant.seat, fromSeat, tile);
  else if (claimant.type === 'kan') applyKan(claimant.seat, fromSeat, tile);
  else if (claimant.type === 'chi') applyChi(claimant.seat, fromSeat, tile, claimant.combo);
}

/* ===================== AI ===================== */
function tileUsefulness(restHand, t) {
  let score = 0;
  const sameCount = restHand.filter(x => x.suit === t.suit && x.value === t.value).length;
  score += sameCount * 3;
  if (t.suit !== 'z') {
    for (let d = -2; d <= 2; d++) {
      if (d === 0) continue;
      const v = t.value + d;
      if (v < 1 || v > 9) continue;
      if (restHand.some(x => x.suit === t.suit && x.value === v)) score += (Math.abs(d) === 1 ? 2 : 1);
    }
    if (t.value === 1 || t.value === 9) score -= 0.5;
  }
  return score;
}
function aiChooseDiscardAndRiichi(player) {
  const hand = player.hand;
  let tenpaiCandidates = [];
  if (player.melds.length === 0 && !player.riichi) {
    for (const t of hand) {
      const rest = hand.filter(x => x.id !== t.id);
      if (isTenpaiHand(rest, 0)) tenpaiCandidates.push(t);
    }
  }
  const pool = tenpaiCandidates.length ? tenpaiCandidates : hand;
  let best = null, bestScore = Infinity;
  for (const t of pool) {
    const rest = hand.filter(x => x.id !== t.id);
    const score = tileUsefulness(rest, t);
    if (score < bestScore) { bestScore = score; best = t; }
  }
  return { tile: best, riichi: tenpaiCandidates.length > 0 };
}
function computeHumanRecommendation(player, opts) {
  if (opts.allowTsumo) return { message: 'ツモが成立しています！「ツモ！」ボタンを押しましょう。' };
  const hand = player.hand;
  const riichiOptionIds = opts.riichiOptions || [];
  const tenpaiCandidates = player.melds.length === 0 ? hand.filter(t => riichiOptionIds.includes(t.id)) : [];
  const pool = tenpaiCandidates.length ? tenpaiCandidates : hand;
  let best = null, bestScore = Infinity;
  for (const t of pool) {
    const rest = hand.filter(x => x.id !== t.id);
    const score = tileUsefulness(rest, t);
    if (score < bestScore) { bestScore = score; best = t; }
  }
  if (!best) return null;
  const message = tenpaiCandidates.length
    ? `おすすめ：${tileLabel(best)}を切ってリーチ！ あと1枚で上がれる形になります。`
    : `おすすめ：${tileLabel(best)}を切りましょう（他の牌とのつながりが薄い牌です）。`;
  return { tileId: best.id, message };
}
function aiCallDecision(player, tile) {
  if (tile.suit !== 'z') return null;
  const seatWindIdx = SEAT_WIND_IDX[player.seat];
  const isYakuhaiTile = tile.value >= 5 || tile.value === 1 || tile.value === seatWindIdx;
  if (!isYakuhaiTile) return null;
  const count = player.hand.filter(t => t.suit === tile.suit && t.value === tile.value).length;
  if (count >= 3) return 'kan';
  if (count >= 2) return 'pon';
  return null;
}

/* ===================== 描画 ===================== */
let pendingResolve = null;
let currentTurnOpts = null;
let riichiArmed = false;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function maybeSleep(seat) { return seat === 'E' ? Promise.resolve() : sleep(550); }
function setStatus(text) {
  const el = document.getElementById('statusLine');
  if (el) el.textContent = text;
}
function computeRiichiOptions(player) {
  if (player.melds.length > 0 || player.riichi || player.points < 1000) return [];
  const opts = [];
  for (const t of player.hand) {
    const rest = player.hand.filter(x => x.id !== t.id);
    if (isTenpaiHand(rest, 0)) opts.push(t.id);
  }
  return opts;
}
function renderScorebar() {
  const el = document.getElementById('scorebar');
  el.innerHTML = SEATS.map(s => {
    const p = game.players[s];
    const cls = 'score-chip' + (p.isDealer ? ' dealer' : '') + (p.riichi ? ' riichi' : '');
    return `<div class="${cls}"><span class="dot"></span>${SEAT_LABEL[s]}家${p.isHuman ? '（あなた）' : ''}<span class="pt">${p.points}点</span>${p.riichi ? '<span>・リーチ</span>' : ''}</div>`;
  }).join('');
}
function renderCenterInfo() {
  const el = document.getElementById('centerInfo');
  const doraHtml = game.doraIndicators.map(t => tileHTML(t.suit, t.value, 'sm')).join('');
  el.innerHTML = `
    <div class="round-label">東1局${game.players.E.isDealer ? '（あなたが親）' : ''}</div>
    <div class="wall-count">残り ${game.wall.length} 枚</div>
    <div class="dora-row"><span>ドラ表示牌</span>${doraHtml}</div>
    <div class="turn-indicator">${game.turnText || ''}</div>
  `;
}
function renderSeat(seat) {
  const p = game.players[seat];
  const el = document.getElementById('seat-' + seat);
  if (!el) return;
  const kawaHtml = p.discards.map(t => tileHTML(t.suit, t.value, 'sm')).join('');
  const meldsHtml = p.melds.map(m => `<div class="meld-group">${m.tiles.map(t => tileHTML(t.suit, t.value, 'sm')).join('')}</div>`).join('');
  el.innerHTML = `
    <div class="seat-head"><span>${SEAT_LABEL[seat]}家${p.isHuman ? '（あなた）' : ''}${p.riichi ? '・リーチ' : ''}</span><span class="wind">${p.points}点</span></div>
    <div class="melds">${meldsHtml}</div>
    <div class="kawa">${kawaHtml}</div>
  `;
}
function renderPlayerArea() {
  const player = game.players.E;
  const meldsEl = document.getElementById('playerMelds');
  meldsEl.innerHTML = player.melds.map(m => `<div class="meld-group">${m.tiles.map(t => tileHTML(t.suit, t.value)).join('')}</div>`).join('');

  const handEl = document.getElementById('playerHand');
  const sorted = sortedHand(player.hand);
  const interactive = !!(pendingResolve && currentTurnOpts);
  const recommendation = (interactive && !riichiArmed) ? computeHumanRecommendation(player, currentTurnOpts) : null;
  handEl.innerHTML = sorted.map(t => {
    let cls = '';
    if (interactive) cls += ' clickable';
    if (t.id === player.lastDrawnId) cls += ' just-drawn';
    if (interactive && riichiArmed && !currentTurnOpts.riichiOptions.includes(t.id)) cls += ' tile-disabled';
    if (recommendation && recommendation.tileId === t.id) cls += ' recommended';
    const attrs = interactive ? `onclick="MJ.onHandTileClick(${t.id})"` : '';
    return tileHTML(t.suit, t.value, '', cls, attrs);
  }).join('');

  const hintEl = document.getElementById('hintLine');
  if (hintEl) {
    if (recommendation) {
      hintEl.textContent = recommendation.message;
      hintEl.classList.add('show');
    } else {
      hintEl.textContent = '';
      hintEl.classList.remove('show');
    }
  }

  const riichiBtn = document.getElementById('riichiBtn');
  const tsumoBtn = document.getElementById('tsumoBtn');
  const canRiichi = interactive && currentTurnOpts.riichiOptions && currentTurnOpts.riichiOptions.length > 0;
  riichiBtn.style.display = canRiichi ? 'inline-block' : 'none';
  riichiBtn.classList.toggle('riichi-armed', riichiArmed);
  riichiBtn.textContent = riichiArmed ? 'リーチ取消' : 'リーチ';
  tsumoBtn.style.display = (interactive && currentTurnOpts.allowTsumo) ? 'inline-block' : 'none';
  document.getElementById('restartBtn').style.display = game.result ? 'inline-block' : 'none';
}
function renderAll() {
  renderScorebar();
  renderCenterInfo();
  renderSeat('S'); renderSeat('W'); renderSeat('N'); renderSeat('E');
  renderPlayerArea();
}
function setTurnText(text) { game.turnText = text; renderCenterInfo(); }
function renderResult() {
  const el = document.getElementById('resultArea');
  const r = game.result;
  if (!r) { el.innerHTML = ''; return; }
  if (r.type === 'win') {
    const winner = game.players[r.seat];
    const handTiles = sortedHand(winner.hand);
    const handHtml = handTiles.map(t => tileHTML(t.suit, t.value)).join('') +
      winner.melds.map(m => `<div class="meld-group" style="margin-left:8px;">${m.tiles.map(x => tileHTML(x.suit, x.value)).join('')}</div>`).join('');
    const yakuHtml = r.winResult.yaku.map(y => `<li><span>${y.name}</span><span>${y.han}翻</span></li>`).join('');
    const title = r.isTsumo ? `${SEAT_LABEL[r.seat]}家のツモ和了！` : `${SEAT_LABEL[r.seat]}家のロン和了！（${SEAT_LABEL[r.fromSeat]}家から）`;
    const payHtml = SEATS.filter(s => r.payments[s] !== 0).map(s => `<div>${SEAT_LABEL[s]}家：${r.payments[s] > 0 ? '+' : ''}${r.payments[s]}点</div>`).join('');
    el.innerHTML = `<div class="result-panel">
        <h2>${title}</h2>
        <div class="sub">${r.seat === 'E' ? 'おめでとうございます！' : 'CPUの勝利です。次はきっと勝てます。'}</div>
        <div class="result-hand-row">${handHtml}</div>
        <ul class="result-yaku">${yakuHtml}</ul>
        <div class="result-points">${r.winResult.totalHan}翻 ${r.winResult.points}点</div>
        <div class="result-pay-list">${payHtml}</div>
      </div>`;
  } else {
    const tenpaiHtml = r.tenpaiSeats.length ? r.tenpaiSeats.map(s => SEAT_LABEL[s] + '家').join('・') + 'がテンパイでした' : 'テンパイの人はいませんでした';
    const payHtml = SEATS.filter(s => r.payments[s] !== 0).map(s => `<div>${SEAT_LABEL[s]}家：${r.payments[s] > 0 ? '+' : ''}${r.payments[s]}点</div>`).join('');
    el.innerHTML = `<div class="result-panel">
        <h2>流局</h2>
        <div class="sub">山の牌がなくなりました。${tenpaiHtml}。</div>
        <div class="result-pay-list">${payHtml}</div>
      </div>`;
  }
  document.getElementById('restartBtn').style.display = 'inline-block';
  setStatus('この局は終了しました。');
}

/* ===================== プレイヤー入力待ち ===================== */
function waitForHumanAction(opts) {
  return new Promise(resolve => {
    pendingResolve = resolve;
    currentTurnOpts = opts;
    riichiArmed = false;
    setStatus(opts.allowTsumo ? 'ツモれます！「ツモ！」を押すか、捨てる牌を選んでください。' : '捨てる牌を選んでください。');
    renderAll();
  });
}
function showCallModal(opts, tile, fromSeat) {
  return new Promise(resolve => {
    const overlay = document.getElementById('callModal');
    const title = document.getElementById('callModalTitle');
    const tileArea = document.getElementById('callModalTile');
    const btnArea = document.getElementById('callModalBtns');
    title.textContent = SEAT_LABEL[fromSeat] + '家が ' + tileLabel(tile) + ' を捨てました';
    tileArea.innerHTML = tileHTML(tile.suit, tile.value, 'lg');
    btnArea.innerHTML = '';
    const addBtn = (label, cls, handler) => {
      const b = document.createElement('button');
      b.className = 'btn' + (cls ? ' ' + cls : '');
      b.textContent = label;
      b.addEventListener('click', () => { overlay.classList.remove('show'); handler(); });
      btnArea.appendChild(b);
    };
    if (opts.ron) addBtn('ロン', '', () => resolve({ type: 'ron' }));
    if (opts.pon) addBtn('ポン', '', () => resolve({ type: 'pon' }));
    if (opts.kan) addBtn('カン', '', () => resolve({ type: 'kan' }));
    (opts.chi || []).forEach(combo => {
      addBtn('チー(' + combo[0] + '・' + combo[1] + ')', '', () => resolve({ type: 'chi', combo }));
    });
    addBtn('見逃す', 'secondary', () => resolve({ type: 'skip' }));
    overlay.classList.add('show');
  });
}

/* ===================== ターン進行 ===================== */
async function performTurn(seat) {
  const player = game.players[seat];
  setTurnText((player.isHuman ? 'あなた' : SEAT_LABEL[seat] + '家') + 'の番です');
  const drawn = drawTile();
  if (!drawn) { await handleRyuukyoku(); return { ended: true }; }
  player.hand.push(drawn);
  player.lastDrawnId = drawn.id;
  renderAll();
  await maybeSleep(seat);

  const concealedBeforeDraw = withoutTile(player.hand, drawn.id);
  const win = evaluateWin(seat, concealedBeforeDraw, drawn, player.melds, { isTsumo: true, isRiichi: player.riichi });

  if (player.riichi) {
    if (win) {
      const takeIt = player.isHuman ? await askTsumoConfirm() : true;
      if (takeIt) { await finishWin(seat, drawn, win, true, null); return { ended: true }; }
    }
    if (player.isHuman) { setStatus('リーチ中のため、引いた牌をそのまま捨てます。'); await sleep(700); }
    doDiscard(seat, drawn);
    renderAll();
    return { ended: false, discard: drawn };
  }

  if (win && !player.isHuman) { await finishWin(seat, drawn, win, true, null); return { ended: true }; }

  let discardTile, riichiNow = false;
  if (player.isHuman) {
    const riichiOptions = computeRiichiOptions(player);
    const choice = await waitForHumanAction({ allowTsumo: !!win, riichiOptions });
    pendingResolve = null; currentTurnOpts = null;
    if (choice.type === 'tsumo') { await finishWin(seat, drawn, win, true, null); return { ended: true }; }
    discardTile = choice.tile;
    riichiNow = choice.riichi;
  } else {
    const decision = aiChooseDiscardAndRiichi(player);
    discardTile = decision.tile;
    riichiNow = decision.riichi;
  }
  if (riichiNow) { player.riichi = true; player.points -= 1000; game.riichiSticks++; setStatus((player.isHuman ? 'あなた' : SEAT_LABEL[seat] + '家') + 'がリーチを宣言しました。'); }
  doDiscard(seat, discardTile);
  renderAll();
  return { ended: false, discard: discardTile };
}
function askTsumoConfirm() {
  return new Promise(resolve => {
    const overlay = document.getElementById('callModal');
    const title = document.getElementById('callModalTitle');
    const tileArea = document.getElementById('callModalTile');
    const btnArea = document.getElementById('callModalBtns');
    title.textContent = 'ツモが成立しています。上がりますか？';
    tileArea.innerHTML = '';
    btnArea.innerHTML = '';
    const addBtn = (label, cls, handler) => {
      const b = document.createElement('button');
      b.className = 'btn' + (cls ? ' ' + cls : '');
      b.textContent = label;
      b.addEventListener('click', () => { overlay.classList.remove('show'); handler(); });
      btnArea.appendChild(b);
    };
    addBtn('ツモであがる', '', () => resolve(true));
    addBtn('見送って続ける', 'secondary', () => resolve(false));
    overlay.classList.add('show');
  });
}
function doDiscard(seat, tile) {
  const player = game.players[seat];
  removeFromHand(player, tile.id);
  player.discards.push(tile);
  if (player.lastDrawnId === tile.id) player.lastDrawnId = null;
}
async function afterCallTurn(seat, mustDraw) {
  const player = game.players[seat];
  if (mustDraw) {
    const drawn = drawTile();
    if (!drawn) { await handleRyuukyoku(); return { ended: true }; }
    player.hand.push(drawn);
    player.lastDrawnId = drawn.id;
    renderAll();
    const win = evaluateWin(seat, withoutTile(player.hand, drawn.id), drawn, player.melds, { isTsumo: true, isRiichi: player.riichi });
    if (win) {
      const takeIt = player.isHuman ? await askTsumoConfirm() : true;
      if (takeIt) { await finishWin(seat, drawn, win, true, null); return { ended: true }; }
    }
  }
  let discardTile;
  if (player.isHuman) {
    const choice = await waitForHumanAction({ allowTsumo: false, riichiOptions: [] });
    pendingResolve = null; currentTurnOpts = null;
    discardTile = choice.tile;
  } else {
    discardTile = aiChooseDiscardAndRiichi(player).tile;
    await sleep(400);
  }
  doDiscard(seat, discardTile);
  renderAll();
  return await resolveDiscardReactions(seat, discardTile);
}
async function resolveDiscardReactions(discarderSeat, tile) {
  if (discarderSeat !== 'E') {
    const human = game.players.E;
    const ronWin = evaluateWin('E', human.hand, tile, human.melds, { isTsumo: false, isRiichi: human.riichi });
    const callOpts = computeCallOptions('E', discarderSeat, tile);
    if (ronWin || callOpts.pon || callOpts.kan || callOpts.chi.length) {
      const choice = await showCallModal({ ron: !!ronWin, pon: callOpts.pon, kan: callOpts.kan, chi: callOpts.chi }, tile, discarderSeat);
      if (choice.type === 'ron') {
        await finishWin('E', tile, ronWin, false, discarderSeat);
        return { ended: true };
      }
      if (choice.type !== 'skip') {
        applyCall({ seat: 'E', ...choice }, discarderSeat, tile);
        renderAll();
        return await afterCallTurn('E', choice.type === 'kan');
      }
    }
  }
  const cpuSeats = seatsAfter(discarderSeat).filter(s => s !== 'E');
  for (const s of cpuSeats) {
    const p = game.players[s];
    const win = evaluateWin(s, p.hand, tile, p.melds, { isTsumo: false, isRiichi: p.riichi });
    if (win) { await finishWin(s, tile, win, false, discarderSeat); return { ended: true }; }
  }
  for (const s of cpuSeats) {
    const p = game.players[s];
    const decision = aiCallDecision(p, tile);
    if (decision) {
      await sleep(500);
      applyCall({ seat: s, type: decision }, discarderSeat, tile);
      setStatus(SEAT_LABEL[s] + '家が' + (decision === 'kan' ? 'カン' : 'ポン') + 'しました。');
      renderAll();
      return await afterCallTurn(s, decision === 'kan');
    }
  }
  return { ended: false, nextSeat: nextSeatAfter(discarderSeat) };
}
async function finishWin(seat, winTile, winResult, isTsumo, fromSeat) {
  const winner = game.players[seat];
  if (!isTsumo) winner.hand.push(winTile);
  const payments = computePayments(seat, winResult, isTsumo, fromSeat);
  applyPayments(payments);
  game.result = { type: 'win', seat, winTile, winResult, isTsumo, fromSeat, payments };
  renderAll();
  renderResult();
}
async function handleRyuukyoku() {
  const tenpaiSeats = SEATS.filter(s => {
    const p = game.players[s];
    return isTenpaiHand(p.hand, p.melds.length);
  });
  const payments = computeRyuukyokuPayments(tenpaiSeats);
  applyPayments(payments);
  game.result = { type: 'draw', tenpaiSeats, payments };
  renderAll();
  renderResult();
}
async function mainLoop() {
  let turnSeat = 'E';
  while (true) {
    const outcome = await performTurn(turnSeat);
    if (outcome.ended) return;
    const result = await resolveDiscardReactions(turnSeat, outcome.discard);
    if (result.ended) return;
    turnSeat = result.nextSeat;
  }
}

/* ===================== 起動・UI配線 ===================== */
window.MJ = window.MJ || {};
MJ.onHandTileClick = function (id) {
  if (!pendingResolve || !currentTurnOpts) return;
  if (riichiArmed && !currentTurnOpts.riichiOptions.includes(id)) return;
  const player = game.players.E;
  const tile = player.hand.find(t => t.id === id);
  if (!tile) return;
  const resolve = pendingResolve;
  const riichi = riichiArmed;
  pendingResolve = null; currentTurnOpts = null; riichiArmed = false;
  resolve({ type: 'discard', tile, riichi });
};

function startNewRound() {
  game = createInitialGame();
  pendingResolve = null; currentTurnOpts = null; riichiArmed = false;
  document.getElementById('resultArea').innerHTML = '';
  document.getElementById('restartBtn').style.display = 'none';
  setStatus('配牌が完了しました。');
  renderAll();
  mainLoop();
}

document.addEventListener('DOMContentLoaded', () => {
  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeText = document.getElementById('themeText');
  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : '';
    themeIcon.textContent = dark ? '☀' : '☾';
    themeText.textContent = dark ? 'Light' : 'Dark';
  }
  let dark = localStorage.getItem('mahjong-game-theme') === 'dark';
  applyTheme(dark);
  themeBtn.addEventListener('click', () => {
    dark = !dark;
    localStorage.setItem('mahjong-game-theme', dark ? 'dark' : 'light');
    applyTheme(dark);
  });

  document.getElementById('riichiBtn').addEventListener('click', () => {
    if (!currentTurnOpts || !currentTurnOpts.riichiOptions || currentTurnOpts.riichiOptions.length === 0) return;
    riichiArmed = !riichiArmed;
    setStatus(riichiArmed ? 'リーチ後もテンパイを保てる牌だけ選べます。' : '捨てる牌を選んでください。');
    renderPlayerArea();
  });
  document.getElementById('tsumoBtn').addEventListener('click', () => {
    if (!pendingResolve || !currentTurnOpts || !currentTurnOpts.allowTsumo) return;
    const resolve = pendingResolve;
    pendingResolve = null; currentTurnOpts = null;
    resolve({ type: 'tsumo' });
  });
  document.getElementById('restartBtn').addEventListener('click', startNewRound);

  startNewRound();
});
