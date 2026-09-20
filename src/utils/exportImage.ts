/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DxfParsedData, PolygonTransform, PolygonStyle } from '../types/dxf';

export interface ExportImageOptions {
  resolution: '1x' | '2x';
  includeLegend: boolean;
  includeNorthArrow: boolean;
  includeScaleBar: boolean;
  includeVertices: boolean;
  includeDimensions: boolean;
  includeCenterPivot: boolean;
  mapCoords?: { lat: number; lng: number; zoom: number };
  satelliteProviderName?: string;
}

export interface ExportResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Calculates ground resolution in meters per pixel in Web Mercator projection
 */
export function getMetersPerPixel(latitude: number, zoomLevel: number): number {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / Math.pow(2, zoomLevel);
}

/**
 * Formats distance nicely
 */
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Captures the current view (Satellite Map + DXF Polygon Overlay) into a PNG image canvas
 */
export async function captureViewToCanvas(
  container: HTMLElement,
  dxfData: DxfParsedData | null,
  transform: PolygonTransform,
  style: PolygonStyle,
  options: ExportImageOptions
): Promise<ExportResult> {
  const containerRect = container.getBoundingClientRect();
  const width = containerRect.width;
  const height = containerRect.height;
  const scale = options.resolution === '2x' ? 2 : 1;

  const canvasWidth = Math.round(width * scale);
  const canvasHeight = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    throw new Error('Não foi possível obter o contexto 2D do Canvas.');
  }

  // 1. Fill base dark background
  ctx.fillStyle = '#020617'; // slate-950
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Draw Leaflet satellite tiles
  const mapContainer = container.querySelector('#satellite-map-container') || container;
  const tileImages = Array.from(
    mapContainer.querySelectorAll<HTMLImageElement>('.leaflet-tile-pane img.leaflet-tile')
  );

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  for (const img of tileImages) {
    if (!img.complete || img.naturalWidth === 0) continue;

    const imgRect = img.getBoundingClientRect();
    const dx = (imgRect.left - containerRect.left) * scale;
    const dy = (imgRect.top - containerRect.top) * scale;
    const dw = imgRect.width * scale;
    const dh = imgRect.height * scale;

    // Skip tiles outside viewable area
    if (dx + dw < 0 || dy + dh < 0 || dx > canvasWidth || dy > canvasHeight) {
      continue;
    }

    try {
      const opacity = parseFloat(window.getComputedStyle(img).opacity || '1');
      ctx.globalAlpha = isNaN(opacity) ? 1 : opacity;
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch (err) {
      console.warn('Could not draw tile image onto canvas:', err);
    }
  }
  ctx.globalAlpha = 1;

  // 3. Draw DXF Polygon Overlay from SVG
  const svgElement = container.querySelector('#polygon-overlay-svg') as SVGSVGElement | null;
  if (svgElement && dxfData && dxfData.entities.length > 0) {
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

    // Set XML namespaces
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clonedSvg.setAttribute('width', String(canvasWidth));
    clonedSvg.setAttribute('height', String(canvasHeight));
    clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Remove interactive edit widgets from the export
    // For instance, the rotate helper ring or cursor guidelines
    const allGroups = Array.from(clonedSvg.querySelectorAll('g, circle, rect, text'));
    allGroups.forEach((el) => {
      // Check if element has dashed stroke used by rotate guide
      const dash = el.getAttribute('stroke-dasharray');
      if (dash && dash.includes('6')) {
        el.parentElement?.removeChild(el);
      }
    });

    // Check vertex toggle
    if (!options.includeVertices) {
      const vertexGroups = clonedSvg.querySelectorAll('[key^="vertex-"], [id^="vertex-"]');
      vertexGroups.forEach((el) => el.parentElement?.removeChild(el));
      // Also match by vertex text P1, P2
      const texts = Array.from(clonedSvg.querySelectorAll('text'));
      texts.forEach((t) => {
        if (/^P\d+$/.test(t.textContent?.trim() || '')) {
          t.parentElement?.removeChild(t);
        }
      });
    }

    // Check dimension toggle
    if (!options.includeDimensions) {
      const texts = Array.from(clonedSvg.querySelectorAll('text'));
      texts.forEach((t) => {
        if (/(m|km)$/.test(t.textContent?.trim() || '')) {
          t.parentElement?.removeChild(t);
        }
      });
    }

    // Check center pivot toggle
    if (!options.includeCenterPivot) {
      const centerCircles = Array.from(clonedSvg.querySelectorAll('circle[fill="#ef4444"]'));
      centerCircles.forEach((c) => c.parentElement?.removeChild(c));
    }

    // Convert to Image and draw
    const svgXml = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    try {
      const svgImg = new Image();
      await new Promise<void>((resolve, reject) => {
        svgImg.onload = () => resolve();
        svgImg.onerror = (e) => reject(e);
        svgImg.src = svgUrl;
      });
      ctx.drawImage(svgImg, 0, 0, canvasWidth, canvasHeight);
    } catch (e) {
      console.warn('Failed to draw SVG overlay to canvas:', e);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  // 4. North Arrow / Rosa dos Ventos
  if (options.includeNorthArrow) {
    drawNorthArrow(ctx, canvasWidth - 36 * scale, 42 * scale, 22 * scale);
  }

  // 5. Graphic Scale Bar
  if (options.includeScaleBar && options.mapCoords) {
    drawScaleBar(ctx, 20 * scale, canvasHeight - 24 * scale, scale, options.mapCoords);
  }

  // 6. Professional Cartographic Stamp / Carimbo Técnico
  if (options.includeLegend && dxfData) {
    drawTechnicalStamp(ctx, canvasWidth, canvasHeight, scale, dxfData, transform, options);
  }

  // Convert canvas to Blob & DataURL
  return new Promise<ExportResult>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Falha ao gerar o arquivo PNG a partir da imagem do canvas.'));
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      resolve({
        canvas,
        dataUrl,
        blob,
        width: canvasWidth,
        height: canvasHeight,
      });
    }, 'image/png');
  });
}

/**
 * Draws a clean, modern North Arrow (Rosa dos Ventos)
 */
function drawNorthArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();
  // Outer circle background
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.stroke();

  // North pointer (Cyan)
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius * 0.75);
  ctx.lineTo(cx + radius * 0.35, cy + radius * 0.2);
  ctx.lineTo(cx, cy);
  ctx.fillStyle = '#06b6d4';
  ctx.fill();

  // North pointer shade
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius * 0.75);
  ctx.lineTo(cx - radius * 0.35, cy + radius * 0.2);
  ctx.lineTo(cx, cy);
  ctx.fillStyle = '#0891b2';
  ctx.fill();

  // South pointer (White / Slate)
  ctx.beginPath();
  ctx.moveTo(cx, cy + radius * 0.7);
  ctx.lineTo(cx + radius * 0.25, cy + radius * 0.1);
  ctx.lineTo(cx, cy);
  ctx.fillStyle = '#cbd5e1';
  ctx.fill();

  // 'N' label
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(radius * 0.55)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('N', cx, cy - radius * 0.8);
  ctx.restore();
}

/**
 * Draws a ground scale bar
 */
function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  coords: { lat: number; lng: number; zoom: number }
) {
  const mPerPx = getMetersPerPixel(coords.lat, coords.zoom);
  // Choose a nice round ground distance
  const targetBarPx = 120 * scale;
  const rawMeters = (targetBarPx / scale) * mPerPx;

  // Round to friendly increments (10, 20, 50, 100, 200, 500, 1000, 2000...)
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMeters)));
  const normalized = rawMeters / magnitude;
  let factor = 1;
  if (normalized >= 5) factor = 5;
  else if (normalized >= 2) factor = 2;
  else factor = 1;

  const roundedMeters = factor * magnitude;
  const actualBarWidth = (roundedMeters / mPerPx) * scale;
  const barHeight = 6 * scale;

  ctx.save();
  // Background pill
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(x - 8 * scale, y - 22 * scale, actualBarWidth + 16 * scale, 34 * scale, 6 * scale);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Scale label
  ctx.fillStyle = '#f8fafc';
  ctx.font = `bold ${Math.round(10 * scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatDistance(roundedMeters), x + actualBarWidth / 2, y - 10 * scale);

  // Bar segments
  ctx.fillStyle = '#facc15';
  ctx.fillRect(x, y, actualBarWidth / 2, barHeight);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + actualBarWidth / 2, y, actualBarWidth / 2, barHeight);

  // Outer border for bar
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, actualBarWidth, barHeight);
  ctx.restore();
}

/**
 * Draws the technical stamp / carimbo cartográfico with engineering info
 */
function drawTechnicalStamp(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  dxfData: DxfParsedData,
  transform: PolygonTransform,
  options: ExportImageOptions
) {
  const boxWidth = Math.min(canvasWidth - 32 * scale, 360 * scale);
  const padding = 12 * scale;
  const lineHeight = 16 * scale;

  // Compute text lines
  const lines: { label: string; value: string; highlight?: boolean }[] = [
    { label: 'Arquivo DXF:', value: dxfData.fileName },
    {
      label: 'Data / Hora:',
      value: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    },
  ];

  if (options.mapCoords) {
    lines.push({
      label: 'Coordenadas GPS:',
      value: `${options.mapCoords.lat.toFixed(5)}°, ${options.mapCoords.lng.toFixed(5)}°`,
    });
    lines.push({
      label: 'Satélite / Zoom:',
      value: `${options.satelliteProviderName || 'Satélite'} (Zoom ${options.mapCoords.zoom}x)`,
    });
  }

  if (dxfData.estimatedArea) {
    const areaM2 = dxfData.estimatedArea.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    const areaHa = (dxfData.estimatedArea / 10000).toFixed(3);
    lines.push({
      label: 'Área Estimada:',
      value: `${areaM2} m² (${areaHa} ha)`,
      highlight: true,
    });
  }

  if (dxfData.estimatedPerimeter) {
    const perimM = dxfData.estimatedPerimeter.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    lines.push({
      label: 'Perímetro:',
      value: `${perimM} m`,
    });
  }

  lines.push({
    label: 'Ajuste Gráfico:',
    value: `Rot: ${transform.rotation}° | Escala: ${(transform.scale * 100).toFixed(0)}%`,
  });

  const boxHeight = padding * 2 + 20 * scale + lines.length * lineHeight;
  const boxX = canvasWidth - boxWidth - 16 * scale;
  const boxY = canvasHeight - boxHeight - 16 * scale;

  ctx.save();
  // Backdrop box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 10 * scale);
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header Title
  ctx.fillStyle = '#38bdf8';
  ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('VISUALIZAÇÃO DXF SOBRE SATÉLITE', boxX + padding, boxY + padding);

  // Small accent line
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(boxX + padding, boxY + padding + 15 * scale, boxWidth - padding * 2, 1 * scale);

  // Content lines
  let curY = boxY + padding + 22 * scale;
  lines.forEach((item) => {
    ctx.font = `normal ${Math.round(10 * scale)}px sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, boxX + padding, curY);

    ctx.font = item.highlight
      ? `bold ${Math.round(10 * scale)}px monospace`
      : `normal ${Math.round(10 * scale)}px monospace`;
    ctx.fillStyle = item.highlight ? '#4ade80' : '#f8fafc';
    ctx.textAlign = 'right';
    ctx.fillText(item.value, boxX + boxWidth - padding, curY);

    curY += lineHeight;
  });

  ctx.restore();
}

/**
 * Helper to download Blob as a file
 */
export function downloadBlobAsFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to copy PNG image blob to system clipboard
 */
export async function copyBlobToClipboard(blob: Blob): Promise<boolean> {
  if (typeof navigator.clipboard?.write !== 'function' || typeof ClipboardItem === 'undefined') {
    return false;
  }
  try {
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.warn('Clipboard write failed:', err);
    return false;
  }
}
