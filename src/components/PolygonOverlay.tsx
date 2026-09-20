import React, { useRef, useState, useEffect } from 'react';
import { DxfParsedData, PolygonTransform, PolygonStyle, InteractionMode, Point2D } from '../types/dxf';

interface PolygonOverlayProps {
  dxfData: DxfParsedData | null;
  transform: PolygonTransform;
  onTransformChange: (newTransform: PolygonTransform) => void;
  style: PolygonStyle;
  interactionMode: InteractionMode;
  containerWidth: number;
  containerHeight: number;
}

export const PolygonOverlay: React.FC<PolygonOverlayProps> = ({
  dxfData,
  transform,
  onTransformChange,
  style,
  interactionMode,
  containerWidth,
  containerHeight,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isScaling, setIsScaling] = useState(false);

  // Drag start state
  const dragStartRef = useRef<{ startX: number; startY: number; initialOffsetX: number; initialOffsetY: number }>({
    startX: 0,
    startY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
  });

  // Rotate start state
  const rotateStartRef = useRef<{ initialAngle: number; initialRotation: number }>({
    initialAngle: 0,
    initialRotation: 0,
  });

  // Scale start state
  const scaleStartRef = useRef<{ initialDist: number; initialScale: number }>({
    initialDist: 1,
    initialScale: 1,
  });

  if (!dxfData || dxfData.entities.length === 0) {
    return null;
  }

  // Base center point in screen coordinates
  const screenCenterX = containerWidth / 2 + transform.offsetX;
  const screenCenterY = containerHeight / 2 + transform.offsetY;

  // Compute normalization scale so that the DXF geometry fits comfortably in the initial screen view
  const bounds = dxfData.bounds;
  const targetDim = Math.min(containerWidth, containerHeight) * 0.55;
  const maxDxfDim = Math.max(bounds.width, bounds.height) || 1;
  const baseScale = targetDim / maxDxfDim;

  // Convert a DXF local coordinate into relative coordinate centered around (0,0)
  const toLocalRel = (pt: Point2D) => {
    // Note: CAD Y is usually up, screen Y is down, so we invert Y for natural CAD orientation
    const relX = (pt.x - bounds.centerX) * baseScale;
    const relY = -(pt.y - bounds.centerY) * baseScale;
    return { x: relX, y: relY };
  };

  // Helper for touch & mouse pointer events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (interactionMode === 'map') return;

    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (interactionMode === 'move') {
      setIsDragging(true);
      dragStartRef.current = {
        startX: clientX,
        startY: clientY,
        initialOffsetX: transform.offsetX,
        initialOffsetY: transform.offsetY,
      };
    } else if (interactionMode === 'rotate') {
      setIsRotating(true);
      const angleRad = Math.atan2(clientY - screenCenterY, clientX - screenCenterX);
      rotateStartRef.current = {
        initialAngle: angleRad,
        initialRotation: transform.rotation,
      };
    } else if (interactionMode === 'scale') {
      setIsScaling(true);
      const dist = Math.hypot(clientX - screenCenterX, clientY - screenCenterY) || 1;
      scaleStartRef.current = {
        initialDist: dist,
        initialScale: transform.scale,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging && !isRotating && !isScaling) return;
    e.stopPropagation();

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (isDragging) {
      const dx = clientX - dragStartRef.current.startX;
      const dy = clientY - dragStartRef.current.startY;
      onTransformChange({
        ...transform,
        offsetX: Math.round(dragStartRef.current.initialOffsetX + dx),
        offsetY: Math.round(dragStartRef.current.initialOffsetY + dy),
      });
    } else if (isRotating) {
      const currentAngleRad = Math.atan2(clientY - screenCenterY, clientX - screenCenterX);
      const deltaRad = currentAngleRad - rotateStartRef.current.initialAngle;
      const deltaDeg = (deltaRad * 180) / Math.PI;
      let newRot = Math.round((rotateStartRef.current.initialRotation + deltaDeg) % 360);
      if (newRot < 0) newRot += 360;
      onTransformChange({
        ...transform,
        rotation: newRot,
      });
    } else if (isScaling) {
      const currentDist = Math.hypot(clientX - screenCenterX, clientY - screenCenterY);
      const factor = currentDist / scaleStartRef.current.initialDist;
      const newScale = Math.max(0.1, Math.min(5.0, Number((scaleStartRef.current.initialScale * factor).toFixed(2))));
      onTransformChange({
        ...transform,
        scale: newScale,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    setIsDragging(false);
    setIsRotating(false);
    setIsScaling(false);
  };

  // Radius for rotation ring
  const ringRadius = Math.max((maxDxfDim * baseScale * transform.scale) / 2 + 40, 70);

  // SVG transform attribute: translate to screen center, rotate, scale
  const transformAttr = `translate(${screenCenterX}, ${screenCenterY}) rotate(${transform.rotation}) scale(${
    (transform.flipX ? -1 : 1) * transform.scale
  }, ${(transform.flipY ? -1 : 1) * transform.scale})`;

  // Collect primary vertices for labels and dimensions
  const primaryEntity = dxfData.entities.find((e) => e.points.length >= 3) || dxfData.entities[0];
  const verticesWithLabels = primaryEntity ? primaryEntity.points : [];

  return (
    <svg
      id="polygon-overlay-svg"
      ref={svgRef}
      className={`absolute inset-0 w-full h-full z-10 ${
        interactionMode === 'map'
          ? 'pointer-events-none'
          : interactionMode === 'move'
          ? 'cursor-grab active:cursor-grabbing pointer-events-auto'
          : interactionMode === 'rotate'
          ? 'cursor-crosshair pointer-events-auto'
          : 'cursor-nwse-resize pointer-events-auto'
      }`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <defs>
        {/* Glow filter for high contrast on dark / complex satellite images */}
        <filter id="dxf-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#000000" floodOpacity="0.8" />
        </filter>
        <filter id="text-backdrop" x="-10%" y="-10%" width="120%" height="120%">
          <feFlood floodColor="#0f172a" floodOpacity="0.85" result="bg" />
          <feMerge>
            <feMergeNode in="bg" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main Group transformed to user offset, rotation and scale */}
      <g id="dxf-transformed-group" transform={transformAttr}>
        {/* Render all DXF entities */}
        {dxfData.entities.map((entity) => {
          if (entity.points.length === 0) return null;

          const localPts = entity.points.map(toLocalRel);

          if (entity.closed && localPts.length >= 3) {
            // Closed polygon
            const pointsStr = localPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
            return (
              <polygon
                key={entity.id}
                points={pointsStr}
                fill={style.fillColor}
                fillOpacity={style.fillOpacity}
                stroke={style.strokeColor}
                strokeWidth={style.strokeWidth / transform.scale}
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#dxf-glow)"
              />
            );
          } else {
            // Polyline or line or open arc
            const dStr = localPts.reduce(
              (acc, pt, i) => (i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`),
              ''
            );
            return (
              <path
                key={entity.id}
                d={dStr}
                fill="none"
                stroke={style.strokeColor}
                strokeWidth={style.strokeWidth / transform.scale}
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#dxf-glow)"
              />
            );
          }
        })}

        {/* Vertex markers (P1, P2, P3...) */}
        {style.showVertices &&
          verticesWithLabels.map((pt, idx) => {
            const local = toLocalRel(pt);
            const radius = Math.max(4, 5 / transform.scale);
            return (
              <g key={`vertex-${idx}`}>
                <circle
                  cx={local.x}
                  cy={local.y}
                  r={radius + 1.5}
                  fill="#000000"
                  opacity={0.7}
                />
                <circle
                  cx={local.x}
                  cy={local.y}
                  r={radius}
                  fill="#ffffff"
                  stroke={style.strokeColor}
                  strokeWidth={2 / transform.scale}
                />
                <text
                  x={local.x + 8 / transform.scale}
                  y={local.y - 8 / transform.scale}
                  fill="#ffffff"
                  fontSize={Math.max(10, 12 / transform.scale)}
                  fontWeight="bold"
                  filter="url(#text-backdrop)"
                >
                  P{idx + 1}
                </text>
              </g>
            );
          })}

        {/* Side dimensions (lengths between vertices) */}
        {style.showDimensions &&
          verticesWithLabels.length >= 2 &&
          verticesWithLabels.map((pt, idx) => {
            const nextIdx = (idx + 1) % verticesWithLabels.length;
            if (!primaryEntity?.closed && idx === verticesWithLabels.length - 1) return null;

            const p1 = toLocalRel(pt);
            const p2 = toLocalRel(verticesWithLabels[nextIdx]);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            // Distance in DXF units
            const origP1 = pt;
            const origP2 = verticesWithLabels[nextIdx];
            const dist = Math.hypot(origP2.x - origP1.x, origP2.y - origP1.y);
            const distLabel = dist > 1000 ? `${(dist / 1000).toFixed(2)} km` : `${dist.toFixed(1)} m`;

            return (
              <g key={`dim-${idx}`}>
                <text
                  x={midX}
                  y={midY}
                  fill="#facc15"
                  fontSize={Math.max(9, 11 / transform.scale)}
                  fontWeight="600"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  filter="url(#text-backdrop)"
                >
                  {distLabel}
                </text>
              </g>
            );
          })}

        {/* Pivot Center Indicator */}
        {style.showCenterPivot && (
          <g>
            <circle cx={0} cy={0} r={4 / transform.scale} fill="#ef4444" />
            <line
              x1={-12 / transform.scale}
              y1={0}
              x2={12 / transform.scale}
              y2={0}
              stroke="#ef4444"
              strokeWidth={1.5 / transform.scale}
            />
            <line
              x1={0}
              y1={-12 / transform.scale}
              x2={0}
              y2={12 / transform.scale}
              stroke="#ef4444"
              strokeWidth={1.5 / transform.scale}
            />
          </g>
        )}
      </g>

      {/* Interactive on-screen rotate guide ring when in 'rotate' mode */}
      {interactionMode === 'rotate' && (
        <g transform={`translate(${screenCenterX}, ${screenCenterY})`}>
          <circle
            cx={0}
            cy={0}
            r={ringRadius}
            fill="none"
            stroke="rgba(56, 189, 248, 0.5)"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          {/* Angle degree indicator badge */}
          <g transform={`rotate(${transform.rotation})`}>
            <line x1={0} y1={0} x2={ringRadius + 16} y2={0} stroke="#38bdf8" strokeWidth="2" />
            <circle cx={ringRadius} cy={0} r="10" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
            <circle cx={ringRadius} cy={0} r="4" fill="#ffffff" />
          </g>
          {/* Center degree badge */}
          <rect
            x={-35}
            y={-14}
            width={70}
            height={28}
            rx={14}
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="1.5"
            opacity={0.9}
          />
          <text
            x={0}
            y={4}
            fill="#38bdf8"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            {transform.rotation}°
          </text>
        </g>
      )}

      {/* Interactive scale box when in 'scale' mode */}
      {interactionMode === 'scale' && (
        <g transform={`translate(${screenCenterX}, ${screenCenterY})`}>
          <rect
            x={-ringRadius * 0.8}
            y={-ringRadius * 0.8}
            width={ringRadius * 1.6}
            height={ringRadius * 1.6}
            fill="none"
            stroke="rgba(234, 179, 8, 0.6)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          {/* 4 corner handles */}
          {[-1, 1].map((sx) =>
            [-1, 1].map((sy) => (
              <rect
                key={`handle-${sx}-${sy}`}
                x={sx * ringRadius * 0.8 - 6}
                y={sy * ringRadius * 0.8 - 6}
                width={12}
                height={12}
                fill="#eab308"
                stroke="#ffffff"
                strokeWidth="2"
                rx={2}
              />
            ))
          )}
          <rect
            x={-35}
            y={-14}
            width={70}
            height={28}
            rx={14}
            fill="#0f172a"
            stroke="#eab308"
            strokeWidth="1.5"
            opacity={0.9}
          />
          <text
            x={0}
            y={4}
            fill="#eab308"
            fontSize="12"
            fontWeight="bold"
            textAnchor="middle"
          >
            {Math.round(transform.scale * 100)}%
          </text>
        </g>
      )}
    </svg>
  );
};
