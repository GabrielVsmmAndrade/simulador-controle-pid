/**
 * Animações das plantas em Canvas 2D (Etapa 6).
 *
 * Cada planta tem uma "cena" (função de desenho) que recebe o estado da
 * simulação em um instante (saída, sinal de controle, setpoint...) e desenha
 * o sistema físico correspondente. A classe PlantAnimation cuida da
 * reprodução: play/pause, reiniciar, barra de tempo e redimensionamento.
 *
 * Cores seguem o resto da interface: verde = variável medida,
 * âmbar = setpoint, cinza = estrutura e sinal de controle.
 */
(function () {
  'use strict';

  const COLORS = {
    panel: '#1b1f23',
    panelAlt: '#20252a',
    grid: '#272c31',
    text: '#e7e9ea',
    muted: '#868d94',
    structure: '#aeb4ba',
    signal: '#4fd897',
    signalSoft: 'rgba(79, 216, 151, 0.22)',
    stream: 'rgba(79, 216, 151, 0.75)',
    reference: '#e3a94a',
  };

  const MONO = "'JetBrains Mono', monospace";
  const SANS = "'Space Grotesk', sans-serif";

  // Simulações longas são aceleradas para a animação durar no máximo isso.
  const MAX_PLAYBACK_SECONDS = 10;

  // ---------- Utilitários de desenho ----------

  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  function fmt(value, decimals = 2) {
    const s = Number(value).toFixed(decimals);
    return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s; // evita "-0.00"
  }

  function label(ctx, str, x, y, opts = {}) {
    ctx.save();
    ctx.fillStyle = opts.color || COLORS.muted;
    ctx.font = `${opts.weight || 400} ${opts.size || 12}px ${opts.sans ? SANS : MONO}`;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'alphabetic';
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function dashedLine(ctx, x1, y1, x2, y2, dash = [6, 4]) {
    ctx.save();
    ctx.setLineDash(dash);
    line(ctx, x1, y1, x2, y2);
    ctx.restore();
  }

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Faixa de valores da saída durante toda a simulação (inclui 0 e o setpoint).
  function computeRange(output, setpoint) {
    let lo = Math.min(0, setpoint);
    let hi = Math.max(0, setpoint);
    for (let i = 0; i < output.length; i++) {
      if (output[i] < lo) lo = output[i];
      if (output[i] > hi) hi = output[i];
    }
    const span = hi - lo || 1;
    const min = lo < 0 ? lo - span * 0.1 : 0;
    let max = hi > 0 ? hi + span * 0.1 : 0;
    if (max - min < 1e-9) max = min + 1;
    return { min, max };
  }

  // Barra horizontal que mostra o esforço do controlador (sinal u) dentro dos limites.
  function drawEffortBar(ctx, w, h, u, limits, name, unit) {
    const bw = Math.min(240, w * 0.5);
    const bx = (w - bw) / 2;
    const by = h - 24;
    const bh = 8;
    const span = limits.max - limits.min || 1;
    const pos = (v) => bx + clamp((v - limits.min) / span, 0, 1) * bw;
    const zero = pos(0);
    const cur = pos(u);

    ctx.fillStyle = COLORS.grid;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = COLORS.structure;
    ctx.fillRect(Math.min(zero, cur), by, Math.abs(cur - zero), bh);
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1;
    line(ctx, zero, by - 3, zero, by + bh + 3);

    label(ctx, `${name}  ${fmt(u)} ${unit}`, w / 2, by - 8, { align: 'center', color: COLORS.structure });
    label(ctx, fmt(limits.min, 0), bx - 8, by + bh, { align: 'right', size: 11 });
    label(ctx, fmt(limits.max, 0), bx + bw + 8, by + bh, { size: 11 });
  }

  // ---------- Cena: tanque de água ----------

  function pipe(ctx, points, width) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'butt';
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = COLORS.structure;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.strokeStyle = COLORS.panel;
    ctx.lineWidth = width - 4;
    ctx.stroke();
    ctx.restore();
  }

  // Filete de água caindo; o tracejado "anda" com o tempo para dar sensação de fluxo.
  function stream(ctx, x, yFrom, yTo, width, t) {
    if (yTo <= yFrom || width <= 0.2) return;
    ctx.save();
    ctx.strokeStyle = COLORS.stream;
    ctx.lineWidth = width;
    ctx.setLineDash([6, 5]);
    ctx.lineDashOffset = -t * 70;
    line(ctx, x, yFrom, x, yTo);
    ctx.restore();
  }

  function drawTank(ctx, w, h, f) {
    const { y, u, setpoint, range, limits, params, t } = f;
    const tankW = Math.min(170, w * 0.28);
    const left = w / 2 - tankW / 2;
    const right = left + tankW;
    const top = 88;
    const bottom = h - 32;
    const tankH = bottom - top;
    const span = range.max - range.min;
    const levelY = (v) => bottom - clamp((v - range.min) / span, 0, 1) * tankH;
    const waterY = levelY(y);
    const maxFlow = Math.max(Math.abs(limits.max), Math.abs(limits.min), 1e-9);

    // água
    ctx.fillStyle = COLORS.signalSoft;
    ctx.fillRect(left + 1, waterY, tankW - 2, bottom - waterY - 1);
    ctx.strokeStyle = COLORS.signal;
    ctx.lineWidth = 2;
    line(ctx, left + 1, waterY, right - 1, waterY);

    // escala de nível (à esquerda do tanque)
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const v = range.min + (span * i) / 4;
      const ty = levelY(v);
      line(ctx, left - 6, ty, left, ty);
      label(ctx, fmt(v, 1), left - 10, ty + 4, { align: 'right', size: 11 });
    }

    // paredes (aberto em cima)
    ctx.strokeStyle = COLORS.structure;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, bottom);
    ctx.lineTo(right, bottom);
    ctx.lineTo(right, top);
    ctx.stroke();

    // setpoint
    ctx.strokeStyle = COLORS.reference;
    ctx.lineWidth = 1.5;
    dashedLine(ctx, left - 4, levelY(setpoint), right + 4, levelY(setpoint));

    // entrada (controlada pelo PID)
    const inY = top - 26;
    const inX = left + tankW * 0.28;
    pipe(ctx, [[24, inY], [inX, inY], [inX, inY + 14]], 12);
    stream(ctx, inX, inY + 14, waterY, 1.5 + 5 * (Math.max(u, 0) / maxFlow), t);
    label(ctx, `${w < 520 ? '' : 'Entrada  '}u = ${fmt(u)} m³/s`, 24, inY - 14, { color: COLORS.structure });

    // saída (depende do nível)
    const outFlow = params.outflowCoeff * Math.sqrt(Math.max(y, 0));
    const outY = bottom - 20;
    const outX = right + 90;
    pipe(ctx, [[right, outY], [outX, outY], [outX, outY + 14]], 12);
    stream(ctx, outX, outY + 14, h - 6, 1.5 + 5 * (outFlow / maxFlow), t);
    label(ctx, `${w < 520 ? '' : 'Saída  '}q = ${fmt(outFlow)} m³/s`, right + 14, outY - 14, { color: COLORS.structure });
  }

  // ---------- Cena: massa-mola-amortecedor ----------

  function drawSpring(ctx, x1, x2, yy, coils, amp) {
    const lead = 12;
    const zx0 = x1 + lead;
    const zx1 = x2 - lead;
    const step = (zx1 - zx0) / (coils * 2);
    ctx.beginPath();
    ctx.moveTo(x1, yy);
    ctx.lineTo(zx0, yy);
    for (let i = 1; i < coils * 2; i++) {
      ctx.lineTo(zx0 + step * i, yy + (i % 2 === 1 ? -amp : amp));
    }
    ctx.lineTo(zx1, yy);
    ctx.lineTo(x2, yy);
    ctx.stroke();
  }

  function drawDamper(ctx, x1, x2, yy) {
    const bodyLen = Math.min(60, (x2 - x1) * 0.5);
    const plateX = x1 + bodyLen * 0.55;
    ctx.strokeStyle = COLORS.structure;
    ctx.lineWidth = 2;
    ctx.strokeRect(x1, yy - 7, bodyLen, 14); // cilindro
    line(ctx, plateX, yy - 5, plateX, yy + 5); // êmbolo
    line(ctx, plateX, yy, x2, yy); // haste
  }

  function drawMassSpring(ctx, w, h, f) {
    const { y, u, setpoint, range, limits, params } = f;
    const floorY = h - 80;
    const blockW = 84;
    const blockH = 70;
    const wallX = 36;
    const x0 = 150;
    const x1 = w - 76 - blockW;
    const toX = (v) => x0 + clamp((v - range.min) / (range.max - range.min), 0, 1) * (x1 - x0);
    const bx = toX(y);
    const by = floorY - blockH;

    // parede
    ctx.fillStyle = COLORS.grid;
    ctx.fillRect(wallX - 12, by - 30, 12, floorY - by + 30);
    ctx.strokeStyle = COLORS.structure;
    ctx.lineWidth = 2;
    line(ctx, wallX, by - 30, wallX, floorY);

    // chão e marca do zero
    line(ctx, wallX, floorY, w - 24, floorY);
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1;
    line(ctx, toX(0), floorY, toX(0), floorY + 7);
    label(ctx, '0', toX(0), floorY + 21, { align: 'center', size: 11 });

    // setpoint (posição-alvo da face esquerda do bloco)
    const sx = toX(setpoint);
    ctx.strokeStyle = COLORS.reference;
    ctx.lineWidth = 1.5;
    dashedLine(ctx, sx, by - 18, sx, floorY + 7);
    label(ctx, fmt(setpoint), sx, floorY + 21, { align: 'center', size: 11, color: COLORS.reference });

    // mola (em cima) e amortecedor (embaixo)
    ctx.strokeStyle = COLORS.structure;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    drawSpring(ctx, wallX, bx, by + 20, 9, 10);
    drawDamper(ctx, wallX, bx, by + 52);

    // bloco
    roundedRect(ctx, bx, by, blockW, blockH, 6);
    ctx.fillStyle = COLORS.panelAlt;
    ctx.fill();
    ctx.strokeStyle = COLORS.signal;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, `${params.mass} kg`, bx + blockW / 2, by + blockH / 2 + 4, { align: 'center', color: COLORS.text });

    // força aplicada pelo controlador (seta à direita; aponta para a esquerda se u < 0)
    const maxForce = Math.max(Math.abs(limits.max), Math.abs(limits.min), 1e-9);
    const len = clamp(Math.abs(u) / maxForce, 0, 1) * 46;
    if (len > 2) {
      const ax = bx + blockW + 10;
      const ay = by + blockH / 2;
      const dir = u >= 0 ? 1 : -1;
      const tail = dir > 0 ? ax : ax + len;
      const tip = dir > 0 ? ax + len : ax;
      ctx.strokeStyle = COLORS.structure;
      ctx.fillStyle = COLORS.structure;
      ctx.lineWidth = 3;
      line(ctx, tail, ay, tip - dir * 6, ay);
      ctx.beginPath();
      ctx.moveTo(tip, ay);
      ctx.lineTo(tip - dir * 9, ay - 5);
      ctx.lineTo(tip - dir * 9, ay + 5);
      ctx.closePath();
      ctx.fill();
      label(ctx, 'F', ax + len / 2, ay - 10, { align: 'center', size: 11, color: COLORS.structure });
    }
  }

  // ---------- Cena: motor DC (velocidade) ----------

  function drawDcMotor(ctx, w, h, f) {
    const { y, u, setpoint, range, limits, angle } = f;

    // volante com um raio destacado para a rotação ser visível
    const cx = w * 0.28;
    const cy = h * 0.52;
    const R = Math.min(h * 0.28, w * 0.13);
    ctx.fillStyle = COLORS.grid;
    ctx.fillRect(cx - R * 0.6, cy + R + 8, R * 1.2, 8);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.panelAlt;
    ctx.fill();
    ctx.strokeStyle = COLORS.structure;
    ctx.lineWidth = 3;
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = angle + (k * Math.PI) / 2;
      ctx.strokeStyle = k === 0 ? COLORS.signal : COLORS.structure;
      ctx.lineWidth = k === 0 ? 4 : 2;
      line(ctx, cx, cy, cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92);
    }
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * R * 0.92, cy + Math.sin(angle) * R * 0.92, 5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.signal;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();
    ctx.strokeStyle = COLORS.structure;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, 'rotação em escala visual', 16, 44, { size: 11, sans: true });

    // velocímetro (270°, aberto embaixo)
    const gx = w * 0.68;
    const gy = h * 0.54;
    const GR = Math.min(h * 0.28, w * 0.13);
    const A0 = 0.75 * Math.PI;
    const SWEEP = 1.5 * Math.PI;
    const ang = (v) => A0 + clamp((v - range.min) / (range.max - range.min), 0, 1) * SWEEP;

    ctx.lineCap = 'butt';
    ctx.lineWidth = 8;
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    ctx.arc(gx, gy, GR, A0, A0 + SWEEP);
    ctx.stroke();
    ctx.strokeStyle = COLORS.signal;
    ctx.beginPath();
    ctx.arc(gx, gy, GR, A0, ang(y));
    ctx.stroke();

    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const a = A0 + (SWEEP * i) / 10;
      const inner = GR + 8;
      const outer = GR + (i % 5 === 0 ? 16 : 12);
      line(ctx, gx + Math.cos(a) * inner, gy + Math.sin(a) * inner, gx + Math.cos(a) * outer, gy + Math.sin(a) * outer);
    }
    label(ctx, fmt(range.min, 0), gx + Math.cos(A0) * GR - 4, gy + Math.sin(A0) * GR + 24, { align: 'center', size: 11 });
    label(ctx, fmt(range.max, 0), gx + Math.cos(A0 + SWEEP) * GR + 4, gy + Math.sin(A0 + SWEEP) * GR + 24, { align: 'center', size: 11 });

    const sa = ang(setpoint);
    ctx.strokeStyle = COLORS.reference;
    ctx.lineWidth = 3;
    line(ctx, gx + Math.cos(sa) * (GR - 12), gy + Math.sin(sa) * (GR - 12), gx + Math.cos(sa) * (GR + 6), gy + Math.sin(sa) * (GR + 6));

    const na = ang(y);
    ctx.strokeStyle = COLORS.text;
    ctx.lineWidth = 2;
    line(ctx, gx, gy, gx + Math.cos(na) * (GR - 16), gy + Math.sin(na) * (GR - 16));
    ctx.beginPath();
    ctx.arc(gx, gy, 5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.text;
    ctx.fill();
    label(ctx, fmt(y, 1), gx, gy + GR * 0.62, { align: 'center', size: 18, color: COLORS.text });

    drawEffortBar(ctx, w, h, u, limits, 'Tensão u', 'V');
  }

  // ---------- Cena: servomotor (posição) ----------

  function drawServo(ctx, w, h, f) {
    const { y, u, setpoint, limits } = f;
    const cx = w / 2;
    const cy = h * 0.44;
    const R = Math.min(h * 0.27, 76);
    const rad = (deg) => (-deg * Math.PI) / 180; // 0° à direita, sentido anti-horário

    // mostrador com marcas a cada 15°
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1;
    for (let d = 0; d < 360; d += 15) {
      const a = rad(d);
      const outer = R + (d % 90 === 0 ? 10 : 6);
      line(ctx, cx + Math.cos(a) * R, cy + Math.sin(a) * R, cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    }
    [0, 90, 180, 270].forEach((d) => {
      const a = rad(d);
      label(ctx, `${d}°`, cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22) + 4, { align: 'center', size: 11 });
    });

    // arco percorrido pelo braço
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R * 0.6, 0, rad(y), y > 0);
    ctx.closePath();
    ctx.fillStyle = COLORS.signalSoft;
    ctx.fill();

    // setpoint: linha tracejada até a borda
    const sa = rad(setpoint);
    ctx.strokeStyle = COLORS.reference;
    ctx.lineWidth = 1.5;
    dashedLine(ctx, cx, cy, cx + Math.cos(sa) * (R + 4), cy + Math.sin(sa) * (R + 4));

    // corpo do servo e braço
    roundedRect(ctx, cx - 22, cy - 22, 44, 44, 8);
    ctx.fillStyle = COLORS.panelAlt;
    ctx.fill();
    ctx.strokeStyle = COLORS.structure;
    ctx.lineWidth = 2;
    ctx.stroke();

    const a = rad(y);
    const tipX = cx + Math.cos(a) * R * 0.92;
    const tipY = cy + Math.sin(a) * R * 0.92;
    ctx.lineCap = 'round';
    ctx.strokeStyle = COLORS.signal;
    ctx.lineWidth = 6;
    line(ctx, cx, cy, tipX, tipY);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.signal;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();
    ctx.strokeStyle = COLORS.signal;
    ctx.lineWidth = 2;
    ctx.stroke();

    drawEffortBar(ctx, w, h, u, limits, 'Tensão u', 'V');
  }

  // ---------- Registro das cenas ----------

  const SCENES = {
    tank: { draw: drawTank, label: 'Nível', unit: 'm', decimals: 3 },
    massSpringDamper: { draw: drawMassSpring, label: 'Posição', unit: 'm', decimals: 3 },
    dcMotor: { draw: drawDcMotor, label: 'Velocidade', unit: 'rad/s', decimals: 1 },
    servoMotor: { draw: drawServo, label: 'Ângulo', unit: '°', decimals: 1 },
  };

  // ---------- Controlador de reprodução ----------

  class PlantAnimation {
    constructor({ canvas, playBtn, restartBtn, slider, readout }) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.playBtn = playBtn;
      this.restartBtn = restartBtn;
      this.slider = slider;
      this.readout = readout;

      this.result = null;
      this.scene = null;
      this.t = 0;
      this.playing = false;
      this.raf = null;
      this.lastTs = 0;
      this.w = 0;
      this.h = 0;

      this.tick = this.tick.bind(this);

      playBtn.addEventListener('click', () => {
        if (!this.result) return;
        if (this.playing) this.pause();
        else this.play();
      });
      restartBtn.addEventListener('click', () => {
        if (!this.result) return;
        this.t = 0;
        this.play();
      });
      slider.addEventListener('input', () => {
        if (!this.result) return;
        this.pause();
        this.t = Number(slider.value) * this.result.dt;
        this.draw();
      });

      if (typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => {
          if (this.result) {
            this.resize();
            this.draw();
          }
        }).observe(canvas);
      }
    }

    load(result, limits) {
      this.pause();
      const scene = SCENES[result.plant];
      if (!scene) {
        this.result = null;
        return;
      }

      this.result = result;
      this.scene = scene;
      this.limits = limits || { min: -1, max: 1 };
      this.n = result.time.length;
      this.duration = (this.n - 1) * result.dt;
      this.speed = Math.max(1, this.duration / MAX_PLAYBACK_SECONDS);
      this.range = computeRange(result.output, result.setpoint);
      this.angles = result.plant === 'dcMotor' ? this.computeAngles(result) : null;

      this.slider.max = String(this.n - 1);
      this.canvas.setAttribute('aria-label', `Animação: ${result.plantLabel}`);
      this.resize();

      const reduceMotion =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        // sem movimento automático: mostra o resultado final e deixa o usuário explorar
        this.t = this.duration;
        this.draw();
      } else {
        this.t = 0;
        this.play();
      }
    }

    // Ângulo acumulado do volante. A velocidade real (rad/s) giraria rápido demais
    // para ver, então a escala faz o setpoint corresponder a ~1,2 volta por segundo.
    computeAngles(result) {
      const ref = Math.abs(result.setpoint) > 1e-9 ? Math.abs(result.setpoint) : 1;
      const scale = (2 * Math.PI * 1.2) / ref;
      const angles = new Array(this.n);
      angles[0] = 0;
      for (let i = 1; i < this.n; i++) {
        const avg = (result.output[i] + result.output[i - 1]) / 2;
        angles[i] = angles[i - 1] + avg * result.dt * scale;
      }
      return angles;
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.w = Math.max(1, Math.round(rect.width));
      this.h = Math.max(1, Math.round(rect.height));
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    index() {
      return clamp(Math.round(this.t / this.result.dt), 0, this.n - 1);
    }

    play() {
      if (!this.result) return;
      if (this.t >= this.duration) this.t = 0;
      this.playing = true;
      this.lastTs = performance.now();
      this.updateButton();
      this.raf = requestAnimationFrame(this.tick);
    }

    pause() {
      this.playing = false;
      if (this.raf !== null) cancelAnimationFrame(this.raf);
      this.raf = null;
      this.updateButton();
    }

    stop() {
      this.pause();
      this.result = null;
    }

    tick(ts) {
      if (!this.playing || !this.result) return;
      const elapsed = Math.min(0.1, (ts - this.lastTs) / 1000);
      this.lastTs = ts;
      this.t += elapsed * this.speed;
      if (this.t >= this.duration) {
        this.t = this.duration;
        this.draw();
        this.pause();
        return;
      }
      this.draw();
      this.raf = requestAnimationFrame(this.tick);
    }

    updateButton() {
      this.playBtn.textContent = this.playing ? 'Pausar' : 'Reproduzir';
    }

    draw() {
      if (!this.result) return;
      const { ctx, w, h, result, scene } = this;
      const i = this.index();
      const f = {
        t: i * result.dt,
        y: result.output[i],
        u: result.control[i],
        setpoint: result.setpoint,
        params: result.params,
        limits: this.limits,
        range: this.range,
        angle: this.angles ? this.angles[i] : 0,
      };

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = COLORS.panel;
      ctx.fillRect(0, 0, w, h);

      scene.draw(ctx, w, h, f);

      // leitura no topo: valor medido (verde) e setpoint (âmbar)
      // em telas estreitas usa o rótulo curto "sp" para as duas leituras caberem na mesma linha
      const narrow = w < 520;
      label(ctx, `${scene.label}  ${fmt(f.y, scene.decimals)} ${scene.unit}`, 16, 24, { color: COLORS.signal, size: 13 });
      label(ctx, narrow ? `sp  ${fmt(f.setpoint, scene.decimals)}` : `setpoint  ${fmt(f.setpoint, scene.decimals)} ${scene.unit}`, w - 16, 24, {
        color: COLORS.reference,
        size: 13,
        align: 'right',
      });

      this.slider.value = String(i);
      const speedNote = this.speed > 1.001 ? `  ×${fmt(this.speed, 1)}` : '';
      this.readout.textContent = `t = ${fmt(f.t)} / ${fmt(this.duration)} s${speedNote}`;
    }
  }

  window.PlantAnimation = PlantAnimation;
})();
