/**
 * Integração numérica por Runge-Kutta de 4ª ordem (RK4).
 * Mais precisa que o método de Euler para o mesmo passo de tempo,
 * o que permite usar um dt maior sem perder estabilidade numérica.
 *
 * O sinal de controle u é mantido constante durante o passo (hold),
 * como ocorre num controlador digital real amostrando a planta.
 */
function rk4Step(derivativeFn, state, u, dt, params) {
  const addScaled = (base, delta, scale) =>
    base.map((v, i) => v + delta[i] * scale);

  const k1 = derivativeFn(state, u, params);
  const k2 = derivativeFn(addScaled(state, k1, dt / 2), u, params);
  const k3 = derivativeFn(addScaled(state, k2, dt / 2), u, params);
  const k4 = derivativeFn(addScaled(state, k3, dt), u, params);

  return state.map(
    (v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])
  );
}

module.exports = { rk4Step };
