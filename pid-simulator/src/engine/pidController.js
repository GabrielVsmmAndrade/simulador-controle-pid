/**
 * Controlador PID discreto.
 * u(t) = Kp*e(t) + Ki*∫e(t)dt + Kd*de(t)/dt
 *
 * Anti-windup simples: o termo integral só acumula quando a saída
 * NÃO está saturada, evitando que o integrador "infle" sem limite
 * enquanto o atuador já está no máximo/mínimo.
 */
class PIDController {
  constructor({ kp, ki, kd, dt, limits }) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.dt = dt;
    this.limits = limits || { min: -Infinity, max: Infinity };

    this.integral = 0;
    this.prevError = 0;
    this.firstRun = true;
  }

  compute(error) {
    const derivative = this.firstRun ? 0 : (error - this.prevError) / this.dt;

    const proposedIntegral = this.integral + error * this.dt;
    let output = this.kp * error + this.ki * proposedIntegral + this.kd * derivative;

    const saturated = output > this.limits.max || output < this.limits.min;
    if (!saturated) {
      this.integral = proposedIntegral;
    }

    output = Math.min(Math.max(output, this.limits.min), this.limits.max);

    this.prevError = error;
    this.firstRun = false;
    return output;
  }
}

module.exports = PIDController;
