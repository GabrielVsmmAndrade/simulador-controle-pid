/**
 * Modelos das plantas simuláveis.
 * Cada planta define:
 *  - defaultParams: parâmetros físicos padrão
 *  - defaultSetpoint: valor de referência padrão
 *  - controlLimits: faixa de saturação do sinal de controle (segurança numérica)
 *  - initialState(): estado inicial do sistema (array)
 *  - derivative(state, u, params): retorna d(state)/dt dado o estado atual e o controle u
 *  - outputIndex: qual posição do vetor de estado é a variável observada/controlada
 */

const plants = {
  tank: {
    label: 'Tanque de Água',
    stateLabels: ['h'],
    outputIndex: 0,
    controlLimits: { min: 0, max: 5 },
    defaultParams: { area: 1.0, outflowCoeff: 0.5 },
    defaultSetpoint: 3.0,
    initialState: () => [0],
    // dh/dt = (u - k * sqrt(h)) / A
    derivative: (state, u, params) => {
      const [h] = state;
      const safeH = Math.max(h, 0);
      const dh = (u - params.outflowCoeff * Math.sqrt(safeH)) / params.area;
      return [dh];
    },
  },

  massSpringDamper: {
    label: 'Massa-Mola-Amortecedor',
    stateLabels: ['x', 'v'],
    outputIndex: 0,
    controlLimits: { min: -50, max: 50 },
    defaultParams: { mass: 1.0, k: 20, b: 2 },
    defaultSetpoint: 1.0,
    initialState: () => [0, 0],
    // dx/dt = v ; dv/dt = (u - k*x - b*v) / m
    derivative: (state, u, params) => {
      const [x, v] = state;
      const dx = v;
      const dv = (u - params.k * x - params.b * v) / params.mass;
      return [dx, dv];
    },
  },

  dcMotor: {
    label: 'Motor DC (Velocidade)',
    stateLabels: ['omega'],
    outputIndex: 0,
    controlLimits: { min: -24, max: 24 },
    defaultParams: { inertia: 0.02, friction: 0.1, torqueConst: 0.5 },
    defaultSetpoint: 100,
    initialState: () => [0],
    // J*domega/dt = K*u - b*omega
    derivative: (state, u, params) => {
      const [omega] = state;
      const domega = (params.torqueConst * u - params.friction * omega) / params.inertia;
      return [domega];
    },
  },

  servoMotor: {
    label: 'Servomotor (Posição)',
    stateLabels: ['theta', 'omega'],
    outputIndex: 0,
    controlLimits: { min: -24, max: 24 },
    defaultParams: { inertia: 0.02, friction: 0.1, torqueConst: 0.5 },
    defaultSetpoint: 90,
    initialState: () => [0, 0],
    // dtheta/dt = omega ; J*domega/dt = K*u - b*omega
    derivative: (state, u, params) => {
      const [theta, omega] = state;
      const dtheta = omega;
      const domega = (params.torqueConst * u - params.friction * omega) / params.inertia;
      return [dtheta, domega];
    },
  },
};

module.exports = plants;
