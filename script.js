(function () {
    const $ = id => document.getElementById(id);
    const cv = $('game'), ctx = cv.getContext('2d'), W = 600, H = 800;
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const RL = 110, RR = 490, LANE = (RR - RL) / 4;
    const TURBO_T = 3, TURBO_CD = 12;
    const GEAR_MAX = [0, 70, 120, 170, 225, 285];
    const SM = [1, 1.22, 1.5], MULT = [1, 1.3, 1.7];
    const SENS = { Low: .7, Medium: 1, High: 1.35 };
    const DIFFS = { Easy: { lives: 5, spawn: 1.3 }, Normal: { lives: 3, spawn: 1 }, Hard: { lives: 2, spawn: .75 } };

    // Strict levels: speed limit (km/h) and traffic gap (smaller = denser)
    const LV = [
        { n: 'Country Road', lim: 150, sp: 1.25 }, { n: 'Highway', lim: 140, sp: 1.1 },
        { n: 'Suburbs', lim: 130, sp: 1.0 },       { n: 'City Streets', lim: 120, sp: .9 },
        { n: 'Rush Hour', lim: 110, sp: .8 },      { n: 'Night Mountain', lim: 100, sp: .72 },
        { n: 'Storm Run', lim: 95, sp: .65 },      { n: 'Death Road', lim: 90, sp: .58 }
    ];
    const LEVELS = LV.length;

    const CARS = {
        ember:  { label: 'Ember',  c: '#f97316', d: '#7c2d12', spd: 1.0,  hand: 1.0 },
        volt:   { label: 'Volt',   c: '#a3e635', d: '#365314', spd: 1.1,  hand: .85 },
        frost:  { label: 'Frost',  c: '#22d3ee', d: '#164e63', spd: .95,  hand: 1.2 },
        royal:  { label: 'Royal',  c: '#a78bfa', d: '#4c1d95', spd: 1.05, hand: .95 },
        shadow: { label: 'Shadow', c: '#9ca3af', d: '#111827', spd: 1.12, hand: .8 },
        sunny:  { label: 'Sunny',  c: '#facc15', d: '#854d0e', spd: .9,   hand: 1.25 }
    };
    const CO = Object.keys(CARS);
    const EN = ['#ef4444', '#facc15', '#e5e7eb', '#3b82f6', '#ec4899', '#14b8a6'];

    const OPTS = {
        sound: ['On', 'Off'], horn: ['Classic', 'Sport', 'Truck'], steer: ['Wheel', 'Buttons', 'Touch'],
        sens: ['Low', 'Medium', 'High'], gearbox: ['Auto', 'Manual'], speed: ['Normal', 'Fast', 'Extreme'],
        rules: ['Relaxed', 'Strict'], diff: ['Easy', 'Normal', 'Hard'], unit: ['km/h', 'mph'],
        size: ['Small', 'Medium', 'Large', 'Hidden'], shake: ['On', 'Off']
    };
    const LABELS = {
        sound: 'Sound', horn: 'Horn sound', steer: 'Steering control', sens: 'Steering sensitivity', gearbox: 'Gearbox',
        speed: 'Game speed', rules: 'Traffic rules', diff: 'Difficulty', unit: 'Speed unit', size: 'Button size', shake: 'Screen shake'
    };

    const store = (k, v) => { try { localStorage.setItem('aah_drive2_' + k, v); } catch (e) {} };
    const read = k => { try { return localStorage.getItem('aah_drive2_' + k); } catch (e) { return null; } };

    let S = { sound: 0, horn: 0, steer: 0, sens: 1, gearbox: 0, speed: 0, rules: 1, diff: 1, unit: 0, size: 1, shake: 0 };
    try {
        const o = JSON.parse(read('settings') || '{}');
        Object.keys(S).forEach(k => { if (Number.isInteger(o[k]) && o[k] >= 0 && o[k] < OPTS[k].length) S[k] = o[k]; });
    } catch (e) {}
    const opt = k => OPTS[k][S[k]];
    const snd = () => S.sound === 0;

    let state = 'menu', score, dist, level, lives, spd, gear, shiftCd, rpm, pl, enemies, coins, parts, rings, notes;
    let spawnT, coinT, shake, flash, banner, bannerText, bannerSub, boost, nCd, overT, hornCd, sig, sigT, laneIdx, laneCd;
    let roadY = 0, wAng = 0, wDrag = false, wLast = 0, target = null, best = 0, audio = null, eng = null;
    let carName = 'ember', startLevel = 1, backTo = 'main', last = performance.now();
    const keys = {}, hold = { l: false, r: false, brake: false };

    best = Number(read('best')) || 0;
    if (CARS[read('car')]) carName = read('car');
    const sl = Number(read('level')); if (sl >= 1 && sl <= LEVELS) startLevel = sl;

    const lvData = () => LV[Math.min(Math.max(level, 1), LEVELS) - 1];
    const limDisp = l => opt('unit') === 'mph' ? Math.round(l * .621) : l;

    // ---------- Sound ----------
    function sfx(f, d, type, v, slide) {
        if (!snd()) return;
        try {
            if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
            if (audio.state === 'suspended') audio.resume();
            const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
            o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
            if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d);
            g.gain.setValueAtTime(v || 0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
            o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + d);
        } catch (e) {}
    }
    function hornSound() {
        const h = opt('horn');
        if (h === 'Classic') { sfx(420, .45, 'sawtooth', .05); sfx(525, .45, 'sawtooth', .04); }
        else if (h === 'Sport') { [0, 190].forEach(ms => setTimeout(() => { sfx(700, .16, 'square', .035); sfx(880, .16, 'square', .03); }, ms)); }
        else { sfx(190, .85, 'sawtooth', .06); sfx(238, .85, 'sawtooth', .05); }
    }
    function engineStart() {
        if (eng || !snd()) return;
        try {
            if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
            if (audio.state === 'suspended') audio.resume();
            const o = audio.createOscillator(), g = audio.createGain();
            o.type = 'sawtooth'; o.frequency.value = 60; g.gain.value = 0; o.connect(g); g.connect(audio.destination); o.start();
            eng = { o: o, g: g };
        } catch (e) {}
    }
    function engineUpdate() {
        if (!eng) return;
        try {
            const t = audio.currentTime, on = snd() && state === 'playing';
            eng.g.gain.setTargetAtTime(on ? 0.012 : 0, t, .08);
            if (on) eng.o.frequency.setTargetAtTime(55 + rpm * 150 + gear * 8, t, .08);
        } catch (e) {}
    }

    // ---------- Drawing helpers ----------
    function rr(c, x, y, w, h, r) {
        c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    function drawCar(c, col, dk, w, h, sg) {
        const x = -w / 2, y = -h / 2;
        c.fillStyle = '#05060f';
        [[x - 5, y + h * .14], [x + w - 2, y + h * .14], [x - 5, y + h * .64], [x + w - 2, y + h * .64]].forEach(p => c.fillRect(p[0], p[1], 7, h * .22));
        const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, dk); g.addColorStop(.5, col); g.addColorStop(1, dk);
        c.fillStyle = g; rr(c, x, y, w, h, 12); c.fill();
        c.fillStyle = 'rgba(8,10,30,.85)'; rr(c, x + w * .14, y + h * .22, w * .72, h * .2, 6); c.fill(); rr(c, x + w * .16, y + h * .6, w * .68, h * .14, 5); c.fill();
        c.fillStyle = '#fff7c2'; c.fillRect(x + 4, y + 2, 9, 5); c.fillRect(x + w - 13, y + 2, 9, 5);
        c.fillStyle = '#ef4444'; c.fillRect(x + 4, y + h - 6, 9, 4); c.fillRect(x + w - 13, y + h - 6, 9, 4);
        if (sg && Math.floor(performance.now() / 330) % 2 === 0) {
            c.fillStyle = '#fb923c'; c.shadowColor = '#fb923c'; c.shadowBlur = 10;
            const sx = sg < 0 ? x - 3 : x + w - 3;
            c.fillRect(sx, y + 3, 6, 9); c.fillRect(sx, y + h - 12, 6, 9);
            c.shadowBlur = 0;
        }
    }

    // ---------- Game setup ----------
    function reset() {
        score = 0; dist = 0; level = startLevel; lives = DIFFS[opt('diff')].lives; spd = 0; gear = 1; shiftCd = 0; rpm = 0;
        enemies = []; coins = []; parts = []; rings = []; notes = [];
        spawnT = 1; coinT = 2; shake = 0; flash = 0; banner = 0; bannerText = ''; bannerSub = '';
        boost = 0; nCd = 0; overT = 0; hornCd = 0; sig = 0; sigT = 0; laneCd = 0;
        pl = { x: W / 2, y: H - 210, inv: 0 }; laneIdx = 2; wAng = 0; target = null;
    }
    const note = (t, col) => notes.push({ t: t, col: col, l: 1.5, x: W / 2, y: H / 2 - 40 });
    function boom(x, y, col, n) {
        for (let i = 0; i < n; i++) { const a = rand(0, 6.283), v = rand(60, 280), l = rand(.3, .8); parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, l: l, m: l, col: col, s: rand(2, 5) }); }
    }
    function spawnEnemy() {
        const free = [0, 1, 2, 3].filter(i => !enemies.some(o => o.y < 200 && Math.abs(o.x - (RL + LANE / 2 + i * LANE)) < 60));
        if (free.length < 2) return;
        const x = RL + LANE / 2 + free[Math.floor(Math.random() * free.length)] * LANE;
        enemies.push({ x: x, tx: x, y: -100, es: clamp(spd * rand(.35, .7), 25, 150), col: EN[Math.floor(Math.random() * EN.length)] });
    }
    function crash(e) {
        e.dead = true; lives--; pl.inv = 1.5; shake = .45; spd *= .35;
        boom(e.x, e.y, '#f97316', 26); sfx(110, .45, 'sawtooth', .05, 30);
        if (lives <= 0) gameOver();
    }
    function fine() {
        lives--; flash = .35; note('Fined! -1 life', '#ef4444'); sfx(120, .35, 'sawtooth', .05, 40);
        if (lives <= 0) gameOver();
    }

    // ---------- Actions ----------
    function horn() {
        if (state !== 'playing' || hornCd > 0) return;
        hornCd = .7; hornSound(); rings.push({ r: 20, l: .6 });
        enemies.forEach(e => {
            if (e.y < pl.y && pl.y - e.y < 420 && Math.abs(e.x - pl.x) < LANE * 1.2) {
                const dir = e.x >= pl.x ? 1 : -1;
                let nx = e.tx + dir * LANE;
                if (nx < RL + LANE / 2 || nx > RR - LANE / 2) nx = e.tx - dir * LANE;
                e.tx = clamp(nx, RL + LANE / 2, RR - LANE / 2);
            }
        });
    }
    function nitro() {
        if (state !== 'playing' || boost > 0 || nCd > 0) return;
        boost = TURBO_T; nCd = TURBO_CD; sfx(300, .4, 'sawtooth', .04, 1200);
    }
    function toggleSig(d) {
        if (state !== 'playing') return;
        sig = sig === d ? 0 : d; sigT = 0; sfx(sig ? 700 : 500, .05, 'square', .02);
    }
    function shiftGear(d) {
        if (state !== 'playing') return;
        if (opt('gearbox') === 'Auto') { note('Auto gearbox is on', '#8fb4c8'); return; }
        const g = clamp(gear + d, 1, 5);
        if (g !== gear) { gear = g; sfx(240, .07, 'square', .02, 120); }
    }
    const braking = () => !!(keys.s || keys.arrowdown || keys[' '] || hold.brake);

    // ---------- Update ----------
    function update(dt) {
        const car = CARS[carName], D = DIFFS[opt('diff')], strict = opt('rules') === 'Strict';

        // steering wheel (all inputs move the wheel angle)
        let dir = 0;
        if (keys.arrowleft || keys.a || hold.l) dir--;
        if (keys.arrowright || keys.d || hold.r) dir++;
        if (dir) wAng = clamp(wAng + dir * 320 * dt, -135, 135);
        else if (opt('steer') === 'Touch' && target !== null) {
            const want = clamp((target - pl.x) / 70, -1, 1) * 135;
            wAng += clamp(want - wAng, -520 * dt, 520 * dt);
        } else if (!wDrag) wAng -= Math.sign(wAng) * Math.min(Math.abs(wAng), 300 * dt);
        const steer = wAng / 135;
        const auth = (.55 + .45 * Math.min(1, spd / 50)) * (1 - .22 * Math.min(1, spd / 300));
        pl.x = clamp(pl.x + steer * 390 * car.hand * SENS[opt('sens')] * auth * dt, RL + 28, RR - 28);

        // timers
        pl.inv = Math.max(0, pl.inv - dt); boost = Math.max(0, boost - dt); nCd = Math.max(0, nCd - dt);
        flash = Math.max(0, flash - dt); shake = Math.max(0, shake - dt); banner = Math.max(0, banner - dt);
        hornCd = Math.max(0, hornCd - dt); laneCd = Math.max(0, laneCd - dt); shiftCd = Math.max(0, shiftCd - dt);
        if (sig) { sigT += dt; if (sigT > 8) { sig = 0; sigT = 0; } }

        // gearbox and speed
        const gmax = g => GEAR_MAX[g] * car.spd;
        if (opt('gearbox') === 'Auto' && shiftCd <= 0) {
            if (gear < 5 && spd > gmax(gear) * .93) { gear++; shiftCd = .45; sfx(260, .06, 'square', .02); }
            else if (gear > 1 && spd < gmax(gear - 1) * .8) { gear--; shiftCd = .45; }
        }
        let top = gmax(gear); if (boost > 0) top = top * 1.18 + 25;
        if (braking()) spd = Math.max(0, spd - 150 * dt);
        else if (spd < top - .5) spd += (top - spd) * [0, 2.2, 1.5, 1.05, .8, .6][gear] * (boost > 0 ? 1.7 : 1) * dt + 4 * dt;
        else if (spd > top + .5) spd -= ((spd - top) * 1.4 + 10) * dt;
        spd = Math.max(0, spd);
        rpm = clamp(spd / Math.max(1, gmax(gear)), 0, 1.05);

        const K = 3.4 * SM[S.speed], v = spd * K;
        roadY = (roadY + v * dt) % 80;
        dist += spd / 3.6 * dt;
        score += spd * dt * .045 * MULT[S.speed];

        const lv = startLevel + Math.floor(dist / 1800);
        if (lv > level) {
            level = lv; banner = 1.8; bannerText = 'LEVEL ' + level; bannerSub = lvData().n;
            sfx(440, .3, 'triangle', .04, 880);
        }

        // strict rules: speed limit
        if (strict) {
            if (spd > lvData().lim + 8) {
                overT += dt; score = Math.max(0, score - 35 * dt);
                if (overT > 5) { overT = 0; fine(); if (state !== 'playing') return; }
            } else overT = Math.max(0, overT - dt * 2);
        } else overT = 0;

        // lane change and indicators
        const li = clamp(Math.floor((pl.x - RL) / LANE), 0, 3);
        if (li !== laneIdx) {
            const d = li > laneIdx ? 1 : -1; laneIdx = li;
            if (laneCd <= 0) {
                laneCd = .6;
                if (sig === d) { score += 15; note('Signal +15', '#a3e635'); sig = 0; }
                else if (strict && boost <= 0) { score = Math.max(0, score - 25); note('No signal! -25', '#f97316'); }
            }
        }

        // traffic and coins
        spawnT -= dt;
        if (spawnT <= 0) {
            if (spd > 40) spawnEnemy();
            spawnT = Math.max(.28, 1.05 * lvData().sp) * D.spawn * (strict ? .9 : 1) * rand(.75, 1.25) * (330 / Math.max(150, v));
        }
        coinT -= dt;
        if (coinT <= 0) { coins.push({ x: rand(RL + 30, RR - 30), y: -30 }); coinT = rand(1, 2.2); }

        enemies.forEach(e => {
            e.y += (spd - e.es) * K * dt;
            e.x += clamp(e.tx - e.x, -140 * dt, 140 * dt);
            if (!e.dead && Math.abs(pl.x - e.x) < 42 && Math.abs(pl.y - e.y) < 78) {
                if (boost > 0) { e.dead = true; score += 20; boom(e.x, e.y, e.col, 18); shake = .15; sfx(180, .2, 'sawtooth', .04, 60); }
                else if (pl.inv <= 0) crash(e);
            }
        });
        if (state !== 'playing') return;
        enemies = enemies.filter(e => !e.dead && e.y < H + 120 && e.y > -300);

        coins.forEach(c => {
            c.y += v * dt;
            if (Math.hypot(pl.x - c.x, pl.y - c.y) < 38) { c.dead = true; score += 25; nCd = Math.max(0, nCd - 2); sfx(900, .12, 'sine', .04, 1500); }
        });
        coins = coins.filter(c => !c.dead && c.y < H + 30);

        parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.l -= dt; });
        parts = parts.filter(p => p.l > 0);
        rings.forEach(r => { r.r += 380 * dt; r.l -= dt; });
        rings = rings.filter(r => r.l > 0);
        notes.forEach(n => { n.l -= dt; });
        notes = notes.filter(n => n.l > 0);
    }

    // ---------- Draw ----------
    let gGrad = null;
    function draw() {
        if (!gGrad) { gGrad = ctx.createLinearGradient(0, 0, 0, H); gGrad.addColorStop(0, '#071a2e'); gGrad.addColorStop(1, '#0b2a2a'); }
        ctx.save();
        if (shake > 0 && S.shake === 0) ctx.translate((Math.random() - .5) * shake * 26, (Math.random() - .5) * shake * 26);
        ctx.fillStyle = gGrad; ctx.fillRect(-30, -30, W + 60, H + 60);
        ctx.fillStyle = '#a3e635';
        for (let y = -80 + roadY; y < H; y += 80) { ctx.fillRect(52, y, 6, 18); ctx.fillRect(W - 58, y, 6, 18); }
        ctx.fillStyle = '#151a38'; ctx.fillRect(RL, -30, RR - RL, H + 60);
        ctx.fillStyle = '#22d3ee'; ctx.fillRect(RL - 5, -30, 5, H + 60); ctx.fillRect(RR, -30, 5, H + 60);
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        for (let i = 1; i < 4; i++) for (let y = -80 + roadY; y < H; y += 80) ctx.fillRect(RL + i * LANE - 2, y, 4, 40);

        coins.forEach(c => {
            ctx.shadowColor = '#facc15'; ctx.shadowBlur = 12; ctx.fillStyle = '#facc15';
            ctx.beginPath(); ctx.arc(c.x, c.y, 13, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
            ctx.fillStyle = '#a16207'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', c.x, c.y + 1);
        });
        enemies.forEach(e => { ctx.save(); ctx.translate(e.x, e.y); drawCar(ctx, e.col, '#111827', 48, 88, 0); ctx.restore(); });

        if (state !== 'menu') {
            if (!(pl.inv > 0 && Math.floor(pl.inv * 12) % 2 === 0)) {
                ctx.save(); ctx.translate(pl.x, pl.y);
                if (boost > 0) {
                    ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.moveTo(-14, 44); ctx.lineTo(0, 44 + rand(30, 60)); ctx.lineTo(14, 44); ctx.fill();
                    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-6, 44); ctx.lineTo(0, 44 + rand(12, 28)); ctx.lineTo(6, 44); ctx.fill();
                }
                const C = CARS[carName]; drawCar(ctx, C.c, C.d, 50, 90, sig); ctx.restore();
            }
            rings.forEach(r => {
                ctx.strokeStyle = 'rgba(255,255,255,' + clamp(r.l / .6, 0, 1) + ')'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(pl.x, pl.y - 40, r.r, -2.2, -0.94); ctx.stroke();
            });
        }

        parts.forEach(p => { ctx.globalAlpha = Math.max(0, p.l / p.m); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.s, p.s); });
        ctx.globalAlpha = 1;

        if (banner > 0) {
            ctx.globalAlpha = Math.min(1, banner); ctx.fillStyle = '#fff'; ctx.font = '800 44px Orbitron, Arial, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bannerText, W / 2, H / 3);
            ctx.font = '600 20px Arial'; ctx.fillStyle = '#a3e635'; ctx.fillText(bannerSub, W / 2, H / 3 + 40);
            ctx.globalAlpha = 1;
        }

        if (state !== 'menu') {
            // RPM bar
            const r = clamp(rpm, 0, 1);
            ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(14, 104, 150, 8);
            ctx.fillStyle = r > .92 ? '#ef4444' : '#22d3ee'; ctx.fillRect(14, 104, 150 * r, 8);
            ctx.font = '600 12px Arial'; ctx.fillStyle = '#8fb4c8'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('RPM', 14, 116);
            if (boost > 0) { ctx.fillStyle = '#22d3ee'; ctx.font = '700 14px Arial'; ctx.fillText('NITRO ' + Math.ceil(boost) + 's', 14, 134); }

            // speed limit sign (strict)
            if (opt('rules') === 'Strict') {
                const cx = W - 50, cy = 142, hot = overT > 0 && Math.floor(performance.now() / 250) % 2 === 0;
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 30, 0, 6.283); ctx.fill();
                ctx.strokeStyle = hot ? '#7f1d1d' : '#dc2626'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(cx, cy, 27, 0, 6.283); ctx.stroke();
                ctx.fillStyle = '#111'; ctx.font = '800 22px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(limDisp(lvData().lim)), cx, cy + 1);
                if (overT > 0) {
                    ctx.fillStyle = '#ef4444'; ctx.font = '800 26px Orbitron, Arial, sans-serif';
                    ctx.fillText('SPEEDING!', W / 2, 150);
                    ctx.font = '600 14px Arial'; ctx.fillText('Fine in ' + Math.max(0, Math.ceil(5 - overT)) + 's', W / 2, 176);
                }
            }
        }

        notes.forEach(n => {
            ctx.globalAlpha = clamp(n.l * 1.5, 0, 1); ctx.fillStyle = n.col; ctx.font = '800 24px Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n.t, n.x, n.y - (1.5 - n.l) * 40);
        });
        ctx.globalAlpha = 1;
        ctx.restore();
        if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (flash / .6 * .85) + ')'; ctx.fillRect(0, 0, W, H); }
    }

    // ---------- HUD ----------
    const cache = {};
    const setText = (id, v) => { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } };
    const bN = $('btnNitro');
    function hud() {
        $('stage').classList.toggle('inGame', state === 'playing' || state === 'paused');
        setText('sScore', Math.floor(score)); setText('sLevel', level);
        setText('sSpeed', opt('unit') === 'mph' ? Math.round(spd * .621) : Math.round(spd)); setText('spdUnit', opt('unit'));
        setText('sLives', '\u2665'.repeat(Math.max(0, lives)));
        setText('gearNum', gear); setText('gearMode', opt('gearbox') === 'Auto' ? 'AUTO' : 'MANUAL');
        const tp = boost > 0 ? boost / TURBO_T * 100 : nCd > 0 ? (1 - nCd / TURBO_CD) * 100 : 100;
        bN.style.setProperty('--p', Math.round(tp) + '%');
        bN.classList.toggle('active', boost > 0); bN.classList.toggle('ready', boost <= 0 && nCd <= 0);
        $('btnSigL').classList.toggle('on', sig === -1); $('btnSigR').classList.toggle('on', sig === 1);
        $('btnBrake').classList.toggle('active', braking());
        $('ctrlRight').classList.toggle('auto', opt('gearbox') === 'Auto');
    }

    // ---------- Menus ----------
    const PANELS = ['pMain', 'pLevel', 'pCar', 'pSettings', 'pExit', 'pBye', 'pMsg'];
    const showPanel = id => { $('overlay').classList.remove('hidden'); PANELS.forEach(p => $(p).classList.toggle('hidden', p !== id)); };
    const hideOverlay = () => $('overlay').classList.add('hidden');
    const back = () => { if (backTo === 'game') hideOverlay(); else showPanel('pMain'); };

    function build() {
        const lg = $('levelGrid'); lg.innerHTML = '';
        for (let i = 1; i <= LEVELS; i++) {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'tile'; b.dataset.lv = i;
            b.innerHTML = '<b>' + i + '</b><small></small>';
            b.addEventListener('click', () => { startLevel = i; store('level', String(i)); reset(); updateUI(); });
            lg.appendChild(b);
        }
        const cg = $('carGrid'); cg.innerHTML = '';
        CO.forEach(id => {
            const C = CARS[id];
            const card = document.createElement('button'); card.type = 'button'; card.className = 'card'; card.dataset.car = id;
            const c = document.createElement('canvas'); c.width = 70; c.height = 120;
            const x = c.getContext('2d'); x.translate(35, 60); drawCar(x, C.c, C.d, 44, 84, 0);
            const n = document.createElement('span'); n.textContent = C.label;
            const bars = document.createElement('div'); bars.className = 'bars';
            const b1 = document.createElement('i'); b1.style.setProperty('--w', Math.round((C.spd - .8) / .4 * 100) + '%');
            const b2 = document.createElement('i'); b2.className = 'h'; b2.style.setProperty('--w', Math.round((C.hand - .7) / .6 * 100) + '%');
            bars.append(b1, b2);
            card.append(c, n, bars);
            card.addEventListener('click', () => { carName = id; store('car', id); updateUI(); });
            cg.appendChild(card);
        });
        const sl2 = $('setList'); sl2.innerHTML = '';
        Object.keys(OPTS).forEach(k => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'mbtn sm'; b.dataset.k = k;
            b.innerHTML = '<span>' + LABELS[k] + '</span><em></em>';
            b.addEventListener('click', () => {
                S[k] = (S[k] + 1) % OPTS[k].length; store('settings', JSON.stringify(S));
                if (k === 'horn') hornSound();
                if (k === 'sound' && snd()) sfx(600, .12, 'triangle', .04, 900);
                if (k === 'diff' && state === 'menu') reset();
                if (k === 'steer') target = null;
                updateUI();
            });
            sl2.appendChild(b);
        });
    }

    function updateUI() {
        $('menuBest').textContent = 'Best score: ' + best;
        $('lvLabel').textContent = 'Level ' + startLevel; $('carLabel').textContent = CARS[carName].label;
        $('lvName').textContent = LV[startLevel - 1].n + ' \u2022 Limit ' + limDisp(LV[startLevel - 1].lim) + ' ' + opt('unit');
        $('sFullV').textContent = document.fullscreenElement ? 'On' : 'Off';
        document.querySelectorAll('#levelGrid .tile').forEach(t => {
            const i = Number(t.dataset.lv);
            t.classList.toggle('sel', i === startLevel);
            t.querySelector('small').textContent = 'Limit ' + limDisp(LV[i - 1].lim);
        });
        document.querySelectorAll('#carGrid .card').forEach(t => t.classList.toggle('sel', t.dataset.car === carName));
        document.querySelectorAll('#setList button').forEach(b => { b.querySelector('em').textContent = OPTS[b.dataset.k][S[b.dataset.k]]; });
        $('stage').dataset.bs = String(S.size);
        $('wheel').classList.toggle('hidden', opt('steer') !== 'Wheel');
        $('arrows').classList.toggle('hidden', opt('steer') !== 'Buttons');
    }

    function closeTop() { $('topbar').classList.add('hidden'); $('gameMenu').classList.add('hidden'); }
    function goToMenu() { state = 'menu'; hold.l = hold.r = hold.brake = false; backTo = 'main'; reset(); closeTop(); updateUI(); showPanel('pMain'); }
    function start() {
        reset(); state = 'playing'; backTo = 'main'; hideOverlay();
        $('topbar').classList.remove('hidden'); $('gameMenu').classList.add('hidden');
        engineStart(); sfx(660, .2, 'triangle', .04, 990);
    }
    function openGM() {
        if (state !== 'playing') return;
        hold.l = hold.r = hold.brake = false; state = 'paused'; $('gameMenu').classList.remove('hidden');
    }
    function resume() { if (state !== 'paused') return; state = 'playing'; $('gameMenu').classList.add('hidden'); }
    function gameOver() {
        state = 'over'; hold.l = hold.r = hold.brake = false; closeTop();
        const s = Math.floor(score), nb = s > best; if (nb) { best = s; store('best', String(best)); }
        updateUI();
        $('ovTitle').textContent = 'Crashed!';
        $('ovText').textContent = 'Score ' + s + ' \u2022 Level ' + level + ' \u2022 ' + (dist / 1000).toFixed(1) + ' km' + (nb ? ' \u2022 New best!' : '');
        showPanel('pMsg');
    }
    function toggleFull() {
        try { if (document.fullscreenElement) document.exitFullscreen(); else { const p = $('stage').requestFullscreen(); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
    }

    $('mStart').onclick = start;
    $('mLevel').onclick = () => showPanel('pLevel');
    $('mCar').onclick = () => { backTo = 'main'; showPanel('pCar'); };
    $('mSettings').onclick = () => { backTo = 'main'; showPanel('pSettings'); };
    $('mExit').onclick = () => showPanel('pExit');
    $('lvBack').onclick = $('exNo').onclick = $('byeBtn').onclick = () => showPanel('pMain');
    $('carBack').onclick = $('sBack').onclick = back;
    $('exYes').onclick = () => showPanel('pBye');
    $('sFull').onclick = toggleFull;
    if (!document.fullscreenEnabled) $('sFull').classList.add('hidden');
    document.addEventListener('fullscreenchange', updateUI);
    $('ovBtn').onclick = start;
    $('ovMenu').onclick = goToMenu;
    $('menuBtn').onclick = e => { if (state === 'playing') openGM(); else if (state === 'paused' && $('overlay').classList.contains('hidden')) resume(); e.currentTarget.blur(); };
    $('gmResume').onclick = resume;
    $('gmCar').onclick = () => { backTo = 'game'; showPanel('pCar'); };
    $('gmSettings').onclick = () => { backTo = 'game'; showPanel('pSettings'); };
    $('gmQuit').onclick = goToMenu;
    document.addEventListener('click', e => { if (e.target.closest('.mbtn, .tile, .card')) sfx(520, .05, 'triangle', .03); });

    // ---------- Game controls ----------
    function bindHold(id, k) {
        const b = $(id);
        b.addEventListener('pointerdown', e => { e.preventDefault(); hold[k] = true; });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { hold[k] = false; }));
        b.addEventListener('contextmenu', e => e.preventDefault());
    }
    function bindPress(id, fn) {
        const b = $(id);
        b.addEventListener('pointerdown', e => { e.preventDefault(); fn(); });
        b.addEventListener('contextmenu', e => e.preventDefault());
    }
    bindHold('btnLeft', 'l'); bindHold('btnRight', 'r'); bindHold('btnBrake', 'brake');
    bindPress('btnNitro', nitro); bindPress('btnHorn', horn);
    bindPress('btnGUp', () => shiftGear(1)); bindPress('btnGDn', () => shiftGear(-1));
    bindPress('btnSigL', () => toggleSig(-1)); bindPress('btnSigR', () => toggleSig(1));

    // steering wheel (drag to rotate)
    const wheel = $('wheel'), wheelSvg = $('wheelSvg');
    const ptAngle = e => { const r = wheel.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
    wheel.addEventListener('pointerdown', e => {
        e.preventDefault(); wDrag = true; wLast = ptAngle(e);
        try { wheel.setPointerCapture(e.pointerId); } catch (err) {}
    });
    wheel.addEventListener('pointermove', e => {
        if (!wDrag) return;
        const a = ptAngle(e); let d = a - wLast;
        if (d > 180) d -= 360; if (d < -180) d += 360;
        wAng = clamp(wAng + d, -135, 135); wLast = a;
    });
    ['pointerup', 'pointercancel'].forEach(ev => wheel.addEventListener(ev, () => { wDrag = false; }));
    wheel.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('pointerup', () => { hold.l = hold.r = hold.brake = false; wDrag = false; });

    window.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        if (state === 'playing' && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(k)) e.preventDefault();
        keys[k] = true;
        if (k === 'p' || k === 'escape') { if (state === 'playing') openGM(); else if (state === 'paused' && $('overlay').classList.contains('hidden')) resume(); }
        if (e.repeat) return;
        if (k === 'h') horn();
        if (k === 'shift' || k === 'n') nitro();
        if (k === 'e' || k === 'w' || k === 'arrowup') shiftGear(1);
        if (k === 'q') shiftGear(-1);
        if (k === 'z') toggleSig(-1);
        if (k === 'c') toggleSig(1);
    });
    window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; hold.l = hold.r = hold.brake = false; wDrag = false; openGM(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) openGM(); });

    function setTarget(e) {
        if (state !== 'playing' || opt('steer') !== 'Touch' || !e.buttons) return;
        const r = cv.getBoundingClientRect(); target = (e.clientX - r.left) * (W / r.width);
    }
    cv.addEventListener('pointermove', setTarget); cv.addEventListener('pointerdown', setTarget);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => cv.addEventListener(ev, () => { target = null; }));

    // ---------- Main loop ----------
    function frame(t) {
        const dt = Math.min(.033, (t - last) / 1000 || 0); last = t;
        if (state === 'playing') update(dt); else if (state === 'menu' || state === 'over') roadY = (roadY + 160 * dt) % 80;
        draw(); hud(); engineUpdate();
        if (!wheel.classList.contains('hidden')) wheelSvg.style.transform = 'rotate(' + wAng.toFixed(1) + 'deg)';
        requestAnimationFrame(frame);
    }

    setTimeout(() => $('loader').classList.add('hide'), 1800);
    build(); reset(); updateUI(); showPanel('pMain'); hud(); requestAnimationFrame(frame);
})();