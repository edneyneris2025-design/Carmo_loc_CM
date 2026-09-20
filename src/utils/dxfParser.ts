import DxfParser from 'dxf-parser';
import { DxfEntity, DxfParsedData, Point2D } from '../types/dxf';

// Helper to calculate area of polygon via Shoelace formula
export function calculatePolygonArea(points: Point2D[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

// Helper to calculate perimeter
export function calculatePolygonPerimeter(points: Point2D[], closed = true): number {
  if (points.length < 2) return 0;
  let perimeter = 0;
  const count = closed ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const nextIdx = (i + 1) % points.length;
    const dx = points[nextIdx].x - points[i].x;
    const dy = points[nextIdx].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

// Fallback ASCII DXF parser in case dxf-parser encounters unsupported versions or custom tags
function parseAsciiDxfFallback(dxfText: string, fileName: string): DxfParsedData {
  const lines = dxfText.split(/\r\n|\r|\n/);
  const entities: DxfEntity[] = [];
  const layersSet = new Set<string>();

  let inEntitiesSection = false;
  let currentEntity: Partial<DxfEntity> | null = null;
  let currentPoints: Point2D[] = [];
  let currentLayer = '0';
  let isClosed = false;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function registerPoint(pt: Point2D) {
    if (isNaN(pt.x) || isNaN(pt.y)) return;
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }

  function flushEntity() {
    if (currentEntity && currentEntity.type) {
      if (currentPoints.length > 0) {
        currentPoints.forEach(registerPoint);
        entities.push({
          id: `ent-${entities.length + 1}`,
          type: currentEntity.type,
          points: [...currentPoints],
          closed: isClosed || currentEntity.type === 'CIRCLE',
          layer: currentLayer,
          radius: currentEntity.radius,
        });
      }
    }
    currentEntity = null;
    currentPoints = [];
    isClosed = false;
  }

  let i = 0;
  while (i < lines.length - 1) {
    const code = lines[i].trim();
    const val = lines[i + 1] ? lines[i + 1].trim() : '';
    i += 2;

    if (code === '0' && val === 'SECTION') {
      const nextCode = lines[i]?.trim();
      const nextVal = lines[i + 1]?.trim();
      if (nextCode === '2' && nextVal === 'ENTITIES') {
        inEntitiesSection = true;
        i += 2;
        continue;
      }
    }

    if (code === '0' && val === 'ENDSEC') {
      if (inEntitiesSection) {
        flushEntity();
        inEntitiesSection = false;
      }
      continue;
    }

    if (!inEntitiesSection) continue;

    if (code === '0') {
      // New entity start
      flushEntity();

      if (['LWPOLYLINE', 'POLYLINE', 'LINE', 'CIRCLE', 'ARC', 'SPLINE'].includes(val)) {
        currentEntity = {
          type: val as DxfEntity['type'],
        };
      }
      continue;
    }

    if (!currentEntity) continue;

    if (code === '8') {
      currentLayer = val;
      layersSet.add(val);
    } else if (code === '70') {
      const flag = parseInt(val, 10);
      if (!isNaN(flag) && (flag & 1) === 1) {
        isClosed = true;
      }
    } else if (code === '10') {
      // X coordinate
      const x = parseFloat(val);
      // peek next 20 for Y
      let y = 0;
      if (lines[i]?.trim() === '20') {
        y = parseFloat(lines[i + 1]?.trim() || '0');
        i += 2;
      }
      if (!isNaN(x) && !isNaN(y)) {
        currentPoints.push({ x, y });
      }
    } else if (code === '11') {
      // Endpoint for LINE
      const x = parseFloat(val);
      let y = 0;
      if (lines[i]?.trim() === '21') {
        y = parseFloat(lines[i + 1]?.trim() || '0');
        i += 2;
      }
      if (!isNaN(x) && !isNaN(y)) {
        currentPoints.push({ x, y });
      }
    } else if (code === '40') {
      currentEntity.radius = parseFloat(val);
    }
  }

  flushEntity();

  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }

  const width = Math.max(maxX - minX, 0.001);
  const height = Math.max(maxY - minY, 0.001);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  let totalPoints = 0;
  let totalArea = 0;
  let totalPerimeter = 0;

  entities.forEach((ent) => {
    totalPoints += ent.points.length;
    if (ent.points.length >= 3 && ent.closed) {
      totalArea += calculatePolygonArea(ent.points);
    }
    totalPerimeter += calculatePolygonPerimeter(ent.points, ent.closed);
  });

  return {
    fileName,
    layers: Array.from(layersSet).length > 0 ? Array.from(layersSet) : ['0'],
    entities,
    bounds: { minX, minY, maxX, maxY, width, height, centerX, centerY },
    totalPoints,
    estimatedArea: totalArea > 0 ? totalArea : undefined,
    estimatedPerimeter: totalPerimeter > 0 ? totalPerimeter : undefined,
  };
}

export function parseDxfContent(dxfText: string, fileName = 'desenho.dxf'): DxfParsedData {
  try {
    const parser = new DxfParser();
    const parsed = parser.parseSync(dxfText);

    if (parsed && parsed.entities && parsed.entities.length > 0) {
      const entities: DxfEntity[] = [];
      const layersSet = new Set<string>();

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      function checkCoord(x: number, y: number) {
        if (isNaN(x) || isNaN(y)) return;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      parsed.entities.forEach((ent: any, idx: number) => {
        const layer = ent.layer || '0';
        layersSet.add(layer);

        if (ent.type === 'LWPOLYLINE' || ent.type === 'POLYLINE') {
          const rawVertices = ent.vertices || [];
          const pts: Point2D[] = [];
          rawVertices.forEach((v: any) => {
            const x = typeof v.x === 'number' ? v.x : 0;
            const y = typeof v.y === 'number' ? v.y : 0;
            pts.push({ x, y });
            checkCoord(x, y);
          });
          if (pts.length > 0) {
            entities.push({
              id: `ent-${idx}-${ent.type}`,
              type: ent.type,
              points: pts,
              closed: ent.shape || ent.closed || (ent.flags & 1) === 1,
              layer,
            });
          }
        } else if (ent.type === 'LINE') {
          const rawVertices = ent.vertices || [];
          if (rawVertices.length >= 2) {
            const p1 = { x: rawVertices[0].x || 0, y: rawVertices[0].y || 0 };
            const p2 = { x: rawVertices[1].x || 0, y: rawVertices[1].y || 0 };
            checkCoord(p1.x, p1.y);
            checkCoord(p2.x, p2.y);
            entities.push({
              id: `ent-${idx}-LINE`,
              type: 'LINE',
              points: [p1, p2],
              closed: false,
              layer,
            });
          }
        } else if (ent.type === 'CIRCLE') {
          const center = ent.center || { x: 0, y: 0 };
          const r = ent.radius || 10;
          checkCoord(center.x - r, center.y - r);
          checkCoord(center.x + r, center.y + r);

          // Approximate circle as a 36-point polygon for uniform rendering
          const circlePts: Point2D[] = [];
          for (let deg = 0; deg < 360; deg += 10) {
            const rad = (deg * Math.PI) / 180;
            circlePts.push({
              x: center.x + r * Math.cos(rad),
              y: center.y + r * Math.sin(rad),
            });
          }
          entities.push({
            id: `ent-${idx}-CIRCLE`,
            type: 'CIRCLE',
            points: circlePts,
            closed: true,
            radius: r,
            layer,
          });
        } else if (ent.type === 'ARC') {
          const center = ent.center || { x: 0, y: 0 };
          const r = ent.radius || 10;
          const sAngle = (ent.startAngle || 0) * (Math.PI / 180);
          const eAngle = (ent.endAngle || 360) * (Math.PI / 180);
          const arcPts: Point2D[] = [];
          const steps = 18;
          for (let step = 0; step <= steps; step++) {
            const angle = sAngle + ((eAngle - sAngle) * step) / steps;
            const px = center.x + r * Math.cos(angle);
            const py = center.y + r * Math.sin(angle);
            arcPts.push({ x: px, y: py });
            checkCoord(px, py);
          }
          entities.push({
            id: `ent-${idx}-ARC`,
            type: 'ARC',
            points: arcPts,
            closed: false,
            radius: r,
            layer,
          });
        }
      });

      if (entities.length > 0) {
        const width = Math.max(maxX - minX, 0.001);
        const height = Math.max(maxY - minY, 0.001);
        const centerX = minX + width / 2;
        const centerY = minY + height / 2;

        let totalPoints = 0;
        let totalArea = 0;
        let totalPerimeter = 0;

        entities.forEach((ent) => {
          totalPoints += ent.points.length;
          if (ent.points.length >= 3 && ent.closed) {
            totalArea += calculatePolygonArea(ent.points);
          }
          totalPerimeter += calculatePolygonPerimeter(ent.points, ent.closed);
        });

        return {
          fileName,
          layers: Array.from(layersSet),
          entities,
          bounds: { minX, minY, maxX, maxY, width, height, centerX, centerY },
          totalPoints,
          estimatedArea: totalArea > 0 ? totalArea : undefined,
          estimatedPerimeter: totalPerimeter > 0 ? totalPerimeter : undefined,
        };
      }
    }
  } catch (err) {
    console.warn('dxf-parser threw error, falling back to ASCII stream parser', err);
  }

  // Fallback to custom ASCII parser
  return parseAsciiDxfFallback(dxfText, fileName);
}
