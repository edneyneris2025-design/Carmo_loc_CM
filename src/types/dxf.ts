export interface Point2D {
  x: number;
  y: number;
}

export interface DxfEntity {
  id: string;
  type: 'LWPOLYLINE' | 'POLYLINE' | 'LINE' | 'CIRCLE' | 'ARC' | 'SPLINE' | 'OTHER';
  points: Point2D[];
  closed?: boolean;
  layer?: string;
  color?: string;
  radius?: number; // for circle/arc
  startAngle?: number;
  endAngle?: number;
}

export interface DxfParsedData {
  fileName: string;
  layers: string[];
  entities: DxfEntity[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
  totalPoints: number;
  estimatedArea?: number;
  estimatedPerimeter?: number;
}

export interface PolygonTransform {
  // Screen offset from center in pixels or map delta
  offsetX: number;
  offsetY: number;
  rotation: number; // degrees 0-360
  scale: number; // 1.0 = 100%
  flipX: boolean;
  flipY: boolean;
}

export interface PolygonStyle {
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  fillOpacity: number;
  showVertices: boolean;
  showDimensions: boolean;
  showCenterPivot: boolean;
}

export type InteractionMode = 'map' | 'move' | 'rotate' | 'scale';
