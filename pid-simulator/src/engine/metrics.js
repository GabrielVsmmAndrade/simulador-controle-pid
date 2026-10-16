/**
 * Calcula as métricas clássicas de resposta de um sistema de controle:
 *  - overshootPercent: quanto a resposta ultrapassou o setpoint (%)
 *  - riseTime: tempo entre 10% e 90% do setpoint
 *  - settlingTime: tempo até a resposta entrar e permanecer numa
 *    faixa de ±2% do setpoint
 *  - steadyStateError: erro remanescente ao final da simulação
 */
function computeMetrics(time, output, setpoint) {
  const n = output.length;
  const finalValue = output[n - 1];
  const maxValue = Math.max(...output);

  const overshoot = Math.max(0, maxValue - setpoint);
  const overshootPercent =
    setpoint !== 0 ? (overshoot / Math.abs(setpoint)) * 100 : 0;

  const rise10 = setpoint * 0.1;
  const rise90 = setpoint * 0.9;
  let t10 = null;
  let t90 = null;
  for (let i = 0; i < n; i++) {
    if (t10 === null && output[i] >= rise10) t10 = time[i];
    if (t90 === null && output[i] >= rise90) {
      t90 = time[i];
      break;
    }
  }
  const riseTime = t10 !== null && t90 !== null ? t90 - t10 : null;

  const tolerance = Math.abs(setpoint) * 0.02;
  let settlingTime = null;
  for (let i = n - 1; i >= 0; i--) {
    if (Math.abs(output[i] - setpoint) > tolerance) {
      settlingTime = i + 1 < n ? time[i + 1] : null;
      break;
    }
  }
  if (settlingTime === null && Math.abs(output[0] - setpoint) <= tolerance) {
    settlingTime = time[0];
  }

  const steadyStateError = Math.abs(setpoint - finalValue);

  return {
    overshootPercent: Number(overshootPercent.toFixed(2)),
    riseTime: riseTime !== null ? Number(riseTime.toFixed(3)) : null,
    settlingTime: settlingTime !== null ? Number(settlingTime.toFixed(3)) : null,
    steadyStateError: Number(steadyStateError.toFixed(4)),
  };
}

module.exports = { computeMetrics };
