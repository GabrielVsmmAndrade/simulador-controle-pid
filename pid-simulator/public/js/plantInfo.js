// Conteúdo descritivo de cada planta. Os números citados aqui (limites de
// controle, exemplos de valores) refletem os padrões definidos em
// src/engine/plants.js — se esses padrões mudarem, atualize aqui também.

const PLANT_INFO = {
  tank: {
    title: 'Tanque de água',
    description:
      'Representa um tanque com uma entrada de água controlada (uma bomba ou válvula) e uma saída livre, cuja vazão depende da própria altura da coluna de água. O controlador decide o quanto abrir a entrada para manter o nível constante, mesmo com o vazamento natural pela saída.',
    expected:
      'Resposta de primeira ordem: o nível sobe (ou desce) de forma suave até estabilizar perto do setpoint, sem oscilar com facilidade.',
    params: [
      {
        key: 'area',
        name: 'Área do tanque (A)',
        unit: 'm²',
        description: 'Área da seção transversal do tanque.',
        limit: 'Quanto maior, mais lento o tanque enche ou esvazia. Deve ser maior que zero.',
      },
      {
        key: 'outflowCoeff',
        name: 'Coef. de vazão de saída',
        unit: '',
        description: 'Facilidade com que a água escoa pela saída para uma mesma altura.',
        limit: 'Quanto maior, mais rápido o tanque perde água. Deve ser maior que zero.',
      },
    ],
    setpoint: {
      name: 'Nível desejado',
      unit: 'm',
      description: 'Altura de água que o controlador deve atingir e manter.',
    },
    controlLimit: 'A vazão de entrada é limitada entre 0 e 5 m³/s — não existe vazão negativa (a bomba não "puxa" água de volta) nem acima da capacidade máxima.',
  },

  massSpringDamper: {
    title: 'Massa-mola-amortecedor',
    description:
      'Um bloco preso a uma mola e a um amortecedor, deslizando sobre uma superfície. O controlador aplica uma força para levar o bloco até uma posição-alvo.',
    expected:
      'O sistema mais "vivo" do simulador: dependendo dos ganhos, pode oscilar bastante antes de estabilizar (overshoot alto), responder devagar, ou convergir rápido e suave.',
    params: [
      {
        key: 'mass',
        name: 'Massa (m)',
        unit: 'kg',
        description: 'Massa do bloco.',
        limit: 'Quanto maior, mais força é necessária para movê-lo e mais lenta a resposta. Deve ser maior que zero.',
      },
      {
        key: 'k',
        name: 'Constante elástica (k)',
        unit: 'N/m',
        description: 'Rigidez da mola.',
        limit: 'Molas mais rígidas puxam o bloco de volta com mais força. Deve ser maior que zero.',
      },
      {
        key: 'b',
        name: 'Amortecimento (b)',
        unit: 'N·s/m',
        description: 'Resistência ao movimento, proporcional à velocidade.',
        limit: 'Valores baixos deixam o sistema oscilar mais; valores altos freiam o movimento. Deve ser maior que zero.',
      },
    ],
    setpoint: {
      name: 'Posição desejada',
      unit: 'm',
      description: 'Posição que o bloco deve alcançar.',
    },
    controlLimit: 'A força aplicada pelo controlador é limitada entre -50 N e 50 N.',
  },

  dcMotor: {
    title: 'Motor DC (velocidade)',
    description:
      'Um motor de corrente contínua cujo eixo deve atingir e manter uma velocidade de rotação constante.',
    expected:
      'Resposta de primeira ordem, geralmente rápida: a velocidade sobe até o setpoint e se estabiliza, com pouca ou nenhuma oscilação.',
    params: [
      {
        key: 'inertia',
        name: 'Momento de inércia (J)',
        unit: 'kg·m²',
        description: 'Resistência do eixo a mudanças de velocidade.',
        limit: 'Valores maiores tornam a resposta mais lenta. Deve ser maior que zero.',
      },
      {
        key: 'friction',
        name: 'Atrito viscoso (b)',
        unit: 'N·m·s',
        description: 'Atrito proporcional à velocidade do eixo.',
        limit: 'Valores maiores reduzem a velocidade final para a mesma tensão aplicada. Deve ser maior que zero.',
      },
      {
        key: 'torqueConst',
        name: 'Constante de torque (K)',
        unit: 'N·m/V',
        description: 'Quanto torque o motor produz por volt aplicado.',
        limit: 'Deve ser maior que zero.',
      },
    ],
    setpoint: {
      name: 'Velocidade desejada',
      unit: 'rad/s',
      description: 'Velocidade angular que o motor deve atingir.',
    },
    controlLimit: 'A tensão aplicada ao motor é limitada entre -24 V e 24 V, valor típico de motores de 24V usados em robótica.',
  },

  servoMotor: {
    title: 'Servomotor (posição)',
    description:
      'O mesmo motor DC descrito acima, mas controlando o ângulo do eixo em vez da velocidade — a posição é a integral da velocidade ao longo do tempo.',
    expected:
      'Resposta de segunda ordem: pode haver um pequeno overshoot antes de o eixo estabilizar no ângulo-alvo.',
    params: [
      {
        key: 'inertia',
        name: 'Momento de inércia (J)',
        unit: 'kg·m²',
        description: 'Resistência do eixo a mudanças de velocidade.',
        limit: 'Valores maiores tornam a resposta mais lenta. Deve ser maior que zero.',
      },
      {
        key: 'friction',
        name: 'Atrito viscoso (b)',
        unit: 'N·m·s',
        description: 'Atrito proporcional à velocidade do eixo.',
        limit: 'Valores maiores reduzem a velocidade com que o eixo gira. Deve ser maior que zero.',
      },
      {
        key: 'torqueConst',
        name: 'Constante de torque (K)',
        unit: 'N·m/V',
        description: 'Quanto torque o motor produz por volt aplicado.',
        limit: 'Deve ser maior que zero.',
      },
    ],
    setpoint: {
      name: 'Ângulo desejado',
      unit: '°',
      description: 'Ângulo que o eixo deve alcançar.',
    },
    controlLimit: 'A tensão aplicada é limitada entre -24 V e 24 V, igual ao motor DC.',
  },
};

// Explicação dos ganhos PID — é a mesma em todas as plantas, muda só o efeito prático.
const PID_INFO = [
  {
    name: 'Kp — Ganho Proporcional',
    description: 'Reage ao tamanho do erro atual: quanto maior o erro, maior a correção aplicada.',
    limit: 'Aumentar Kp deixa a resposta mais rápida, mas valores muito altos causam oscilação ou overshoot.',
  },
  {
    name: 'Ki — Ganho Integral',
    description: 'Acumula o erro ao longo do tempo, eliminando o erro residual que o Kp sozinho deixa em regime permanente.',
    limit: 'Valores muito altos podem causar oscilação lenta ou instabilidade.',
  },
  {
    name: 'Kd — Ganho Derivativo',
    description: 'Reage à tendência do erro (sua velocidade de variação), antecipando o movimento.',
    limit: 'Ajuda a reduzir overshoot e oscilação, mas valores muito altos amplificam ruído.',
  },
  {
    name: 'Duração da simulação',
    description: 'Por quanto tempo a simulação é observada, em segundos.',
    limit: 'Precisa ser suficiente para o sistema estabilizar. Aceita valores entre 0 e 120 segundos.',
  },
];

function renderParamItem(p) {
  return `
    <div class="info-item">
      <div class="info-item-head">
        <span class="info-item-name">${p.name}</span>
        <span class="info-item-unit">${p.unit}</span>
      </div>
      <p>${p.description}</p>
      ${p.limit ? `<p class="info-item-limit">${p.limit}</p>` : ''}
    </div>
  `;
}

function renderPlantInfo() {
  const params = new URLSearchParams(window.location.search);
  const plantKey = params.get('plant') || 'tank';
  const info = PLANT_INFO[plantKey];

  if (!info) {
    document.getElementById('info-root').innerHTML = '<p>Planta não encontrada.</p>';
    return;
  }

  document.title = `${info.title} — PID Simulator`;

  const html = `
    <h1>${info.title}</h1>

    <div class="info-section">
      <h2>O que é</h2>
      <p>${info.description}</p>
    </div>

    <div class="info-section">
      <h2>O que esperar da resposta</h2>
      <p>${info.expected}</p>
    </div>

    <div class="info-section">
      <h2>Parâmetros da planta</h2>
      ${info.params.map(renderParamItem).join('')}
    </div>

    <div class="info-section">
      <h2>Setpoint</h2>
      ${renderParamItem({ name: info.setpoint.name, unit: info.setpoint.unit, description: info.setpoint.description, limit: '' })}
    </div>

    <div class="info-section">
      <h2>Limitação do sinal de controle</h2>
      <p>${info.controlLimit}</p>
    </div>

    <div class="info-section">
      <h2>Ganhos do controlador</h2>
      ${PID_INFO.map((g) => renderParamItem({ name: g.name, unit: '', description: g.description, limit: g.limit })).join('')}
    </div>
  `;

  document.getElementById('info-root').innerHTML = html;
}

renderPlantInfo();
