export function clamp(value: number, minimum: number, maximum: number): number {
  if (minimum > maximum) {
    throw new RangeError('The minimum value cannot be greater than the maximum value.');
  }

  return Math.min(maximum, Math.max(minimum, value));
}

export function snapTo(number: number, unit = 5): number {
  if (!Number.isFinite(number)) {
    return number;
  }

  if (!Number.isFinite(unit) || unit <= 0) {
    throw new RangeError('The snapping unit must be a positive finite number.');
  }

  return Math.round(number / unit) * unit;
}
