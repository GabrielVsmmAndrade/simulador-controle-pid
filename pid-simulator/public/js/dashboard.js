requireAuth();

// ---------- Metadados de exibição (o backend só manda chave/valor;
// aqui definimos como cada campo aparece pro usuário) ----------

const PARAM_META = {
  tank: {
    area: { label: 'Área do tanque', unit: 'm²' },
    outflowCoeff: { label: 'Coef. de vazão de saída', unit: '' },
  },
  massSpringDamper: {
    mass: { label: 'Massa', unit: 'kg' },
    k: { label: 'Constante elástica (k)', unit: 'N/m' },
    b: { label: 'Amortecimento (b)', unit: 'N·s/m' },
  },
  dcMotor: {
    inertia: { label: 'Momento de inércia (J)', unit: 'kg·m²' },
    friction: { label: 'Atrito viscoso (b)', unit: 'N·m·s' },
    torqueConst: { label: 'Constante de torque (K)', unit: 'N·m/V' },
  },
  servoMotor: {
    inertia: { label: 'Momento de inércia (J)', unit: 'kg·m²' },
    friction: { label: 'Atrito viscoso (b)', unit: 'N·m·s' },
    torqueConst: { label: 'Constante de torque (K)', unit: 'N·m/V' },
  },
};

const SETPOINT_META = {
  tank: { label: 'Nível desejado', unit: 'm' },
  massSpringDamper: { label: 'Posição desejada', unit: 'm' },
  dcMotor: { label: 'Velocidade desejada', unit: 'rad/s' },
  servoMotor: { label: 'Ângulo desejado', unit: '°' },
};

const GAIN_LABELS = {
  kp: 'Ganho Proporcional',
  ki: 'Ganho Integral',
  kd: 'Ganho Derivativo',
};

const OUTPUT_LABEL = {
  tank: 'Nível (m)',
  massSpringDamper: 'Posição (m)',
  dcMotor: 'Velocidade (rad/s)',
  servoMotor: 'Ângulo (°)',
};

// Ganhos iniciais que sabemos que funcionam bem (validados na Etapa 2),
// pra o usuário já começar de um ponto razoável em vez de zero.
const DEFAULT_PID = {
  tank: { kp: 2, ki: 0.5, kd: 0.1 },
  massSpringDamper: { kp: 60, ki: 60, kd: 8 },
  dcMotor: { kp: 0.8, ki: 2, kd: 0.01 },
  servoMotor: { kp: 15, ki: 5, kd: 2 },
};

const DEFAULT_DURATION = {
  tank: 20,
  massSpringDamper: 5,
  dcMotor: 3,
  servoMotor: 3,
};

const GAIN_SLIDER_MAX = {
  tank: 10,
  massSpringDamper: 300,
  dcMotor: 10,
  servoMotor: 50,
};

const FIXED_DT = 0.01;

let plantsData = {};
let currentPlant = 'tank';
let responseChart = null;
let controlChart = null;
let plantAnimation = null;

// ---------- Carregamento inicial ----------

async function loadPlants() {
  const list = await apiRequest('/simulation/plants');
  plantsData = {};
  list.forEach((p) => { plantsData[p.key] = p; });
  renderConfigFor(currentPlant);
}

// ---------- Renderização dos formulários dinâmicos ----------

function prettify(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function sliderStep(max) {
  if (max <= 10) return 0.01;
  if (max <= 50) return 0.1;
  return 1;
}

function renderConfigFor(plantKey) {
  const plant = plantsData[plantKey];
  if (!plant) return;

  renderPlantParamFields(plantKey, plant);
  renderPidFields(plantKey, plant);

  const infoLink = document.getElementById('plant-info-link');
  infoLink.href = `plant-info.html?plant=${plantKey}`;
}

function renderPlantParamFields(plantKey, plant) {
  const container = document.getElementById('plant-params-fields');
  container.innerHTML = '';

  Object.entries(plant.defaultParams).forEach(([key, value]) => {
    const meta = (PARAM_META[plantKey] && PARAM_META[plantKey][key]) || { label: prettify(key), unit: '' };

    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = `
      <div class="field-label-row">
        <label for="param-${key}">${meta.label}</label>
        <span class="unit">${meta.unit}</span>
      </div>
      <input type="number" id="param-${key}" data-param="${key}" value="${value}" step="any" min="0">
    `;
    container.appendChild(field);
  });
}

function renderPidFields(plantKey, plant) {
  const container = document.getElementById('pid-params-fields');
  container.innerHTML = '';

  const defaults = DEFAULT_PID[plantKey] || { kp: 0, ki: 0, kd: 0 };
  const max = GAIN_SLIDER_MAX[plantKey] || 100;
  const step = sliderStep(max);

  ['kp', 'ki', 'kd'].forEach((gain) => {
    const field = document.createElement('div');
    field.className = 'field';
    field.innerHTML = `
      <label for="gain-${gain}">${gain.toUpperCase()} (${GAIN_LABELS[gain]})</label>
      <div class="slider-row">
        <input type="range" id="slider-${gain}" min="0" max="${max}" step="${step}" value="${defaults[gain]}">
        <input type="number" id="gain-${gain}" data-gain="${gain}" value="${defaults[gain]}" step="any" min="0">
      </div>
    `;
    container.appendChild(field);
  });

  const setpointMeta = SETPOINT_META[plantKey] || { label: 'Setpoint', unit: '' };
  const setpointField = document.createElement('div');
  setpointField.className = 'field';
  setpointField.innerHTML = `
    <div class="field-label-row">
      <label for="setpoint">${setpointMeta.label}</label>
      <span class="unit">${setpointMeta.unit}</span>
    </div>
    <input type="number" id="setpoint" value="${plant.defaultSetpoint}" step="any">
  `;
  container.appendChild(setpointField);

  const durationField = document.createElement('div');
  durationField.className = 'field';
  durationField.innerHTML = `
    <label for="duration">Duração da simulação (s)</label>
    <input type="number" id="duration" value="${DEFAULT_DURATION[plantKey] || 5}" step="any" min="0.1" max="120">
  `;
  container.appendChild(durationField);

  // Sincroniza slider <-> campo numérico de cada ganho
  ['kp', 'ki', 'kd'].forEach((gain) => {
    const slider = document.getElementById(`slider-${gain}`);
    const number = document.getElementById(`gain-${gain}`);
    slider.addEventListener('input', () => { number.value = slider.value; });
    number.addEventListener('input', () => { slider.value = number.value; });
  });
}

// ---------- Troca de planta ----------

const plantButtons = document.querySelectorAll('.plant-option');
plantButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    plantButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentPlant = btn.dataset.plant;
    renderConfigFor(currentPlant);
    hideResults();
  });
});

// ---------- Coleta e validação ----------

function collectPlantParams() {
  const inputs = document.querySelectorAll('#plant-params-fields input[data-param]');
  const params = {};
  inputs.forEach((input) => { params[input.dataset.param] = Number(input.value); });
  return params;
}

function collectPid() {
  return {
    kp: Number(document.getElementById('gain-kp').value),
    ki: Number(document.getElementById('gain-ki').value),
    kd: Number(document.getElementById('gain-kd').value),
  };
}

function validateForm(plantParams, pid, setpoint, duration) {
  for (const [key, value] of Object.entries(plantParams)) {
    if (!Number.isFinite(value) || value <= 0) {
      return `O parâmetro "${key}" precisa ser um número maior que zero`;
    }
  }
  for (const [key, value] of Object.entries(pid)) {
    if (!Number.isFinite(value) || value < 0) {
      return `O ganho "${key.toUpperCase()}" precisa ser um número maior ou igual a zero`;
    }
  }
  if (!Number.isFinite(setpoint)) {
    return 'O setpoint precisa ser um número válido';
  }
  if (!Number.isFinite(duration) || duration <= 0 || duration > 120) {
    return 'A duração precisa ser um número entre 0 e 120 segundos';
  }
  return null;
}

// ---------- Simulação ----------

document.getElementById('simulate-btn').addEventListener('click', async () => {
  const errorEl = document.getElementById('simulate-error');
  const button = document.getElementById('simulate-btn');
  errorEl.textContent = '';

  const plantParams = collectPlantParams();
  const pid = collectPid();
  const setpoint = Number(document.getElementById('setpoint').value);
  const duration = Number(document.getElementById('duration').value);

  const validationError = validateForm(plantParams, pid, setpoint, duration);
  if (validationError) {
    errorEl.textContent = validationError;
    return;
  }

  button.classList.add('loading');
  button.disabled = true;

  try {
    const result = await apiRequest('/simulation', {
      method: 'POST',
      body: { plantType: currentPlant, plantParams, pid, setpoint, duration, dt: FIXED_DT },
    });
    renderResults(result);
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    button.classList.remove('loading');
    button.disabled = false;
  }
});

// ---------- Resultados: gráficos e métricas ----------

function hideResults() {
  if (plantAnimation) plantAnimation.stop();
  document.getElementById('results-empty').hidden = false;
  document.getElementById('results-content').hidden = true;
}

function renderResults(result) {
  document.getElementById('results-empty').hidden = true;
  const content = document.getElementById('results-content');
  content.hidden = false;
  // Reinicia a animação de reveal a cada nova simulação
  content.style.animation = 'none';
  void content.offsetWidth;
  content.style.animation = '';

  renderCharts(result);
  renderMetrics(result.metrics);
  renderAnimation(result);
}

// A animação só pode medir o canvas depois que a área de resultados está visível,
// por isso é criada/carregada aqui e não na inicialização da página.
function renderAnimation(result) {
  if (!plantAnimation) {
    plantAnimation = new PlantAnimation({
      canvas: document.getElementById('plant-canvas'),
      playBtn: document.getElementById('anim-play'),
      restartBtn: document.getElementById('anim-restart'),
      slider: document.getElementById('anim-slider'),
      readout: document.getElementById('anim-time'),
    });
  }
  const plant = plantsData[result.plant];
  plantAnimation.load(result, plant && plant.controlLimits);
}

function renderCharts(result) {
  const outputLabel = OUTPUT_LABEL[result.plant] || 'Saída';

  if (responseChart) responseChart.destroy();
  if (controlChart) controlChart.destroy();

  const responseCtx = document.getElementById('response-chart');
  responseChart = new Chart(responseCtx, {
    type: 'line',
    data: {
      labels: result.time,
      datasets: [
        {
          label: outputLabel,
          data: result.output,
          borderColor: '#4fd897',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
        },
        {
          label: 'Setpoint',
          data: result.time.map(() => result.setpoint),
          borderColor: '#e3a94a',
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: 0,
        },
      ],
    },
    options: chartOptions('Tempo (s)', outputLabel),
  });

  const controlCtx = document.getElementById('control-chart');
  controlChart = new Chart(controlCtx, {
    type: 'line',
    data: {
      labels: result.time,
      datasets: [
        {
          label: 'Sinal de controle',
          data: result.control,
          borderColor: '#aeb4ba',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
        },
      ],
    },
    options: chartOptions('Tempo (s)', 'Controle u(t)'),
  });
}

function chartOptions(xLabel, yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: xLabel, color: '#868d94' },
        ticks: { color: '#868d94' },
        grid: { color: '#272c31' },
      },
      y: {
        title: { display: true, text: yLabel, color: '#868d94' },
        ticks: { color: '#868d94' },
        grid: { color: '#272c31' },
      },
    },
    plugins: {
      legend: { labels: { color: '#e7e9ea', boxWidth: 12 } },
    },
  };
}

function renderMetrics(metrics) {
  const grid = document.getElementById('metrics-grid');
  const fmt = (v, suffix = '') => (v === null || v === undefined ? '—' : `${v}${suffix}`);

  grid.innerHTML = `
    <div class="metric">
      <div class="metric-value mono">${fmt(metrics.overshootPercent, '%')}</div>
      <div class="metric-label">Overshoot</div>
    </div>
    <div class="metric">
      <div class="metric-value mono">${fmt(metrics.riseTime, 's')}</div>
      <div class="metric-label">Tempo de subida</div>
    </div>
    <div class="metric">
      <div class="metric-value mono">${fmt(metrics.settlingTime, 's')}</div>
      <div class="metric-label">Tempo de acomodação</div>
    </div>
    <div class="metric">
      <div class="metric-value mono">${fmt(metrics.steadyStateError)}</div>
      <div class="metric-label">Erro em regime</div>
    </div>
  `;
}

// ---------- Inicialização ----------

loadPlants().catch((err) => {
  document.getElementById('simulate-error').textContent = err.message;
});
