/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Move,
  RotateCw,
  Map as MapIcon,
  Crosshair,
  SlidersHorizontal,
  Maximize2,
  HelpCircle,
  FileCheck2,
  Download,
} from 'lucide-react';
import { SatelliteMap } from './components/SatelliteMap';
import { PolygonOverlay } from './components/PolygonOverlay';
import { SideButtonPanel } from './components/SideButtonPanel';
import { DxfImportModal } from './components/DxfImportModal';
import { ExportImageModal } from './components/ExportImageModal';
import { LocationSearchBar } from './components/LocationSearchBar';
import { DxfParsedData, PolygonTransform, PolygonStyle, InteractionMode } from './types/dxf';
import { parseDxfContent } from './utils/dxfParser';
import { SAMPLE_DXF_FILES } from './utils/sampleDxf';

export default function App() {
  // Container dimensions for responsive SVG coordinate calculation
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  // DXF Parsed data state
  const [dxfData, setDxfData] = useState<DxfParsedData | null>(null);

  // Transform state: offset in pixels, rotation in degrees, scale factor
  const [transform, setTransform] = useState<PolygonTransform>({
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    scale: 1.0,
    flipX: false,
    flipY: false,
  });

  // Visual style state
  const [polygonStyle, setPolygonStyle] = useState<PolygonStyle>({
    strokeColor: '#facc15', // Vibrant golden yellow for satellite contrast
    strokeWidth: 3,
    fillColor: '#facc15',
    fillOpacity: 0.15,
    showVertices: true,
    showDimensions: true,
    showCenterPivot: true,
  });

  // Interaction mode: 'map' navigates satellite, 'move' drags polygon, 'rotate' rotates polygon, 'scale' resizes
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('move');

  // UI state
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [showQuickHelp, setShowQuickHelp] = useState(false);

  // Satellite map state for export metadata
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: -15.7942,
    lng: -47.8822,
    zoom: 16,
  });
  const [satelliteProviderName, setSatelliteProviderName] = useState<string>(
    'Esri World Imagery (Alta Resolução)'
  );

  // Target location for map fly-to navigation (from LocationSearchBar)
  const [flyToLocation, setFlyToLocation] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    timestamp: number;
    name?: string;
  } | null>(null);

  const handleSelectLocation = (lat: number, lng: number, name: string) => {
    setFlyToLocation({
      lat,
      lng,
      zoom: 17,
      timestamp: Date.now(),
      name,
    });
  };

  // ResizeObserver to track container size accurately
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Pre-load default sample on startup so the app is immediately working and visual
  useEffect(() => {
    try {
      const sample = SAMPLE_DXF_FILES[0];
      const parsed = parseDxfContent(sample.content, `${sample.name}.dxf`);
      setDxfData(parsed);
    } catch (e) {
      console.warn('Failed to load initial sample DXF', e);
    }
  }, []);

  // Center polygon action
  const handleCenterPolygon = () => {
    setTransform((prev) => ({
      ...prev,
      offsetX: 0,
      offsetY: 0,
    }));
  };

  // Reset all transforms
  const handleResetTransform = () => {
    setTransform({
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      scale: 1.0,
      flipX: false,
      flipY: false,
    });
  };

  // Callback when a new DXF is imported
  const handleDxfLoaded = (newDxf: DxfParsedData) => {
    setDxfData(newDxf);
    handleResetTransform();
    setInteractionMode('move');
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-full h-full overflow-hidden bg-slate-950 font-sans select-none touch-none"
    >
      {/* 
        1. SATELLITE BACKGROUND COVERING 100% OF SCREEN
        Full mobile screen high-res satellite tile map
      */}
      <SatelliteMap
        isMapInteractionMode={interactionMode === 'map'}
        onMapCenterChange={(lat, lng, zoom) => setMapCoords({ lat, lng, zoom })}
        onProviderChange={setSatelliteProviderName}
        flyToLocation={flyToLocation}
      />

      {/* 
        2. INTERACTIVE DXF POLYGON OVERLAY
        Renders the vector polygon, vertices, dimensions and handles touch/drag/rotate
      */}
      <PolygonOverlay
        dxfData={dxfData}
        transform={transform}
        onTransformChange={setTransform}
        style={polygonStyle}
        interactionMode={interactionMode}
        containerWidth={dimensions.width}
        containerHeight={dimensions.height}
      />

      {/* 
        3. TOP FLOATING CONTROL BAR (Mobile optimized)
      */}
      <header className="absolute top-3 left-3 right-3 z-30 pointer-events-none flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
        {/* Title & Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <div>
              <h1 className="text-xs font-bold text-white tracking-wide leading-none">
                DXF Satélite
              </h1>
              <span className="text-[10px] text-slate-400 font-medium">
                {dxfData ? dxfData.fileName.replace('.dxf', '') : 'Carregando...'}
              </span>
            </div>
          </div>

          <button
            id="btn-import-dxf"
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-amber-950/40 transition-all active:scale-95"
            title="Importar outro arquivo DXF"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden xs:inline">Importar</span> DXF
          </button>

          <button
            id="btn-export-png"
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
            title="Exportar a visualização atual como imagem PNG"
          >
            <Download className="w-4 h-4" />
            <span className="hidden xs:inline">Exportar</span> PNG
          </button>
        </div>

        {/* Location Search Input Box (Requested: Digitar local desejado) */}
        <div className="w-full md:max-w-md pointer-events-auto">
          <LocationSearchBar onSelectLocation={handleSelectLocation} />
        </div>

        {/* Quick Mode Switcher Pills on Header */}
        <div className="pointer-events-auto flex items-center justify-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-xl self-center shrink-0">
          <button
            type="button"
            onClick={() => setInteractionMode('move')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              interactionMode === 'move'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Arrastar e mover o polígono na tela"
          >
            <Move className="w-3.5 h-3.5" />
            <span>Mover</span>
          </button>

          <button
            type="button"
            onClick={() => setInteractionMode('rotate')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              interactionMode === 'rotate'
                ? 'bg-cyan-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Rotacionar o polígono na tela"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Girar</span>
          </button>

          <button
            type="button"
            onClick={() => setInteractionMode('scale')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              interactionMode === 'scale'
                ? 'bg-emerald-400 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Redimensionar escala do polígono"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Escala</span>
          </button>

          <button
            type="button"
            onClick={() => setInteractionMode('map')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              interactionMode === 'map'
                ? 'bg-blue-500 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Navegar e arrastar o mapa de satélite"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Satélite</span>
          </button>
        </div>
      </header>

      {/* 
        4. FLOATING GESTURE HINT BANNER
      */}
      <div className="absolute top-32 sm:top-28 md:top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all">
        <div className="px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-[11px] font-medium text-slate-200 shadow-lg flex items-center gap-2">
          {interactionMode === 'move' && (
            <>
              <Move className="w-3.5 h-3.5 text-amber-400" />
              <span>Arraste o polígono na tela ou use o botão lateral</span>
            </>
          )}
          {interactionMode === 'rotate' && (
            <>
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Gire com o dedo no anel ou clique no botão lateral</span>
            </>
          )}
          {interactionMode === 'scale' && (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Arraste os nós para escalar ou use o botão lateral</span>
            </>
          )}
          {interactionMode === 'map' && (
            <>
              <MapIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>Navegue pelo satélite. Mude para 'Mover' para ajustar o DXF</span>
            </>
          )}
        </div>
      </div>

      {/* 
        5. LATERAL BUTTON & DRAWER PANEL (Core user requirement!)
        "crie um botão lateral que eu consiga carregar as opções de mover e rotacionar o polígono importado do dxf na tela"
      */}
      <SideButtonPanel
        isOpen={isSidePanelOpen}
        onToggleOpen={() => setIsSidePanelOpen(!isSidePanelOpen)}
        transform={transform}
        onTransformChange={setTransform}
        style={polygonStyle}
        onStyleChange={setPolygonStyle}
        interactionMode={interactionMode}
        onInteractionModeChange={setInteractionMode}
        dxfData={dxfData}
        onResetTransform={handleResetTransform}
        onCenterPolygon={handleCenterPolygon}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* 
        6. IMPORT DXF MODAL
      */}
      <DxfImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onDxfLoaded={handleDxfLoaded}
      />

      {/* 
        7. EXPORT VIEW AS PNG MODAL (Satellite + DXF Overlay)
      */}
      <ExportImageModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        containerElement={containerRef.current}
        dxfData={dxfData}
        transform={transform}
        style={polygonStyle}
        mapCoords={mapCoords}
        satelliteProviderName={satelliteProviderName}
      />
    </div>
  );
}
