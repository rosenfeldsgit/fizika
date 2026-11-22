import { g, mean } from "./lab-models.js?v=grade11-1";

export const modeledTime = (length, periods) => 2 * Math.PI * Math.sqrt(length / g) * periods;

export function pendulumResult(length, periods, readings) {
  const time = mean(readings);
  const scatter = mean(readings.map(reading => Math.abs(reading - time)));
  const period = time / periods;
  const gravity = 4 * Math.PI ** 2 * length / period ** 2;
  const delta = gravity * (.0055 / length + 2 * scatter / time);
  return { time, scatter, period, gravity, delta, clock: gravity * 2 / time };
}
