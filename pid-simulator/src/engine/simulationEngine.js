const plants = require('./plants');
const PIDController = require('./pidController');
const { rk4Step } = require('./integrator');
const { computeMetrics } = require('./metrics');

/**
 * Executa a simulação completa: a cada passo dt, calcula o erro,
 * o controlador PID decide o sinal de controle u, e a planta é
 * integrada (RK4) com esse u mantido constante durante o passo.
 */
function runSimulation({ plantType, plantParams, pid, setpoint, duration = 10, dt = 0.01 }) {
  const plant = plants[plantType];
  if (!plant) {
    throw { status: 400, message: `Planta inválida: ${plantType}` };
  }

  const params = { ...plant.defaultParams, ...plantParams };
  const sp = setpoint !== undefined ? setpoint : plant.defaultSetpoint;

  const controller = new PIDController({
    kp: pid.kp,
    ki: pid.ki,
    kd: pid.kd,
    dt,
    limits: plant.controlLimits,
  });

  let state = plant.initialState();
  const steps = Math.floor(duration / dt);

  const time = new Array(steps + 1);
  const output = new Array(steps + 1);
  const control = new Array(steps + 1);
  const errorArr = new Array(steps + 1);

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const y = state[plant.outputIndex];
    const error = sp - y;
    const u = controller.compute(error);

    time[i] = Number(t.toFixed(4));
    output[i] = y;
    control[i] = u;
    errorArr[i] = error;

    if (i < steps) {
      state = rk4Step(plant.derivative, state, u, dt, params);
    }
  }

  const metrics = computeMetrics(time, output, sp);

  return {
    plant: plantType,
    plantLabel: plant.label,
    params,
    pid,
    setpoint: sp,
    dt,
    duration,
    time,
    output,
    control,
    error: errorArr,
    metrics,
  };
}

module.exports = { runSimulation, plants };
