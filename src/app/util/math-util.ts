import type { TemplatePortMetadata } from '../model/utilities';
import { clamp } from './numeric.util';

export function calculatePortEndPosition(
  port: TemplatePortMetadata,
  position: DOMPoint,
  length: number,
): DOMPoint {
  const directionInRadians = (port.direction * Math.PI) / 180;

  return new DOMPoint(
    position.x + Math.cos(directionInRadians) * length,
    position.y + Math.sin(directionInRadians) * length,
  );
}

export function calculateCurveControlPoint(
  startPoint: DOMPoint,
  curvePoint: DOMPoint,
  destinationPoint: DOMPoint,
  gridUnit: number,
  curveScale = 2,
): DOMPoint {
  const directionX = curvePoint.x - startPoint.x;
  const directionY = curvePoint.y - startPoint.y;
  const directionLength = Math.hypot(directionX, directionY);

  if (directionLength === 0) {
    return new DOMPoint(curvePoint.x, curvePoint.y);
  }

  const unitX = directionX / directionLength;
  const unitY = directionY / directionLength;
  const distanceToDestination = Math.hypot(
    destinationPoint.x - curvePoint.x,
    destinationPoint.y - curvePoint.y,
  );
  const controlLength = clamp(
    distanceToDestination * 0.5,
    gridUnit,
    gridUnit * curveScale,
  );

  return new DOMPoint(
    curvePoint.x + unitX * controlLength,
    curvePoint.y + unitY * controlLength,
  );
}

export function getMidpoint(firstPoint: DOMPoint, secondPoint: DOMPoint): DOMPoint {
  return new DOMPoint(
    (firstPoint.x + secondPoint.x) / 2,
    (firstPoint.y + secondPoint.y) / 2,
  );
}

export function createCurve(
  fromStart: DOMPoint,
  fromEnd: DOMPoint,
  destinationStart: DOMPoint,
  destinationEnd: DOMPoint,
  gridUnit = 10,
  curveScale = 2,
): string {
  const curveEndPoint = getMidpoint(fromEnd, destinationEnd);
  const firstControlPoint = calculateCurveControlPoint(
    fromStart,
    fromEnd,
    curveEndPoint,
    gridUnit,
    curveScale,
  );
  const secondControlPoint = calculateCurveControlPoint(
    destinationStart,
    destinationEnd,
    curveEndPoint,
    gridUnit,
    curveScale,
  );

  return (
    `M ${fromStart.x} ${fromStart.y} ` +
    `L ${fromEnd.x} ${fromEnd.y} ` +
    `Q ${firstControlPoint.x} ${firstControlPoint.y} ` +
    `${curveEndPoint.x} ${curveEndPoint.y} ` +
    `Q ${secondControlPoint.x} ${secondControlPoint.y} ` +
    `${destinationEnd.x} ${destinationEnd.y} ` +
    `L ${destinationStart.x} ${destinationStart.y}`
  );
}
