import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Move,
  RotateCw,
  Maximize2,
  Map as MapIcon,
  RotateCcw,
  Compass,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  Layers,
  Palette,
  Info,
  Check,
  Eye,
  FlipHorizontal,
  FlipVertical,
  X,
  Download,
  FileImage,
} from 'lucide-react';
import { PolygonTransform, PolygonStyle, InteractionMode, DxfParsedData } from '../types/dxf';

interface SideButtonPanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  transform: PolygonTransform;
  onTransformChange: (t: PolygonTransform) => void;
  style: PolygonStyle;
  onStyleChange: (s: PolygonStyle) => void;
  interactionMode: InteractionMode;
  onInteractionModeChange: (mode: InteractionMode) => void;
  dxfData: DxfParsedData | null;
  onResetTransform: () => void;
  onCenterPolygon: () => void;
  onOpenExport?: () => void;
}

const HIGH_CONTRAST_COLORS = [
  { name: 'Amarelo Ouro', hex: '#facc15' },
  { name: 'Verde Neon', hex: '#22c55e' },
  { name: 'Ciano Elétrico', hex: '#06b6d4' },
  { name: 'Laranja Solar', hex: '#f97316' },
  { name: 'Vermelho Alerta', hex: '#ef4444' },
  { name: 'Branco Puro', hex: '#ffffff' },
  { name: 'Magenta', hex: '#ec4899' },
];

export const SideButtonPanel: React.FC<SideButtonPanelProps> = ({
  isOpen,
  onToggleOpen,
  transform,
  onTransformChange,
  style,
  onStyleChange,
  interactionMode,
  onInteractionModeChange,
  dxfData,
  onResetTransform,
  onCenterPolygon,
  onOpenExport,
}) => {
  const [activeTab, setActiveTab] = useState<'transform' | 'style' | 'info'>('transform');
  const [stepSize, setStepSize] = useState<number>(10); // pixels step for d-pad

  // Helper for D-pad move
  const handleNudge = (dx: number, dy: number) => {
    onTransformChange({
      ...transform,
      offsetX: transform.offsetX + dx * stepSize,
      offsetY: transform.offsetY + dy * stepSize,
    });
  };

  // Helper for quick angle change
  const handleAddAngle = (delta: number) => {
    let newRot = Math.round((transform.rotation + delta) % 360);
    if (newRot < 0) newRot += 360;
    onTransformChange({
      ...transform,
      rotation: newRot,
    });
  };

  return (
    <>
      {/* 
        THE SIDE BUTTON ("Botão Lateral"):
        Fixed to the right edge of the screen, clearly accessible by thumb on mobile.
      */}
      <div className="fixed top-1/2 -translate-y-1/2 right-0 z-40 flex items-center">
        <button
          id="side-options-button"
          type="button"
          onClick={onToggleOpen}
          className={`flex flex-col items-center justify-center gap-1 py-3.5 px-2.5 rounded-l-2xl shadow-2xl transition-all duration-300 border-l border-t border-b ${
            isOpen
              ? 'bg-slate-900/95 text-cyan-400 border-cyan-500/50 shadow-cyan-500/20 translate-x-1'
              : 'bg-gradient-to-b from-slate-900/95 to-slate-950/95 text-amber-400 hover:text-white border-amber-500/50 hover:border-amber-400 shadow-xl active:scale-95'
          } backdrop-blur-md`}
          aria-label="Abrir opções de mover e rotacionar"
        >
          {isOpen ? (
            <ChevronRight className="w-5 h-5 text-cyan-400 animate-pulse" />
          ) : (
            <>
              <SlidersHorizontal className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] font-bold tracking-wider uppercase [writing-mode:vertical-rl] rotate-180 py-1 text-slate-200">
                Ajustes
              </span>
              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {transform.rotation}°
              </span>
            </>
          )}
        </button>
      </div>

      {/* 
        THE SIDE DRAWER / PANEL:
        Slide-out options container containing move, rotate, scale, styling and technical info.
      */}
      <div
        id="side-panel-drawer"
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-[340px] sm:max-w-[380px] bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">Ajustes do Polígono</h2>
              <p className="text-[11px] text-slate-400">Mover, rotacionar e dimensionar</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleOpen}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800/80 bg-slate-900/40 p-1.5 gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('transform')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'transform'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Mover & Girar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('style')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'style'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Cores & Linhas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'info'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Dados</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-slate-200">
          {activeTab === 'transform' && (
            <>
              {/* Interaction Mode Selection (Screen Gestures) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Modo de Interação Direta na Tela
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onInteractionModeChange('move')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      interactionMode === 'move'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Move className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="text-left">
                      <div className="leading-tight">Arrastar Polígono</div>
                      <div className="text-[10px] text-slate-400 font-normal">Toque na tela</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onInteractionModeChange('rotate')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      interactionMode === 'rotate'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <RotateCw className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="text-left">
                      <div className="leading-tight">Rotacionar Polígono</div>
                      <div className="text-[10px] text-slate-400 font-normal">Giro na tela</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onInteractionModeChange('scale')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      interactionMode === 'scale'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Maximize2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-left">
                      <div className="leading-tight">Redimensionar</div>
                      <div className="text-[10px] text-slate-400 font-normal">Escalar</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onInteractionModeChange('map')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                      interactionMode === 'map'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-md shadow-blue-500/10'
                        : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <MapIcon className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="text-left">
                      <div className="leading-tight">Navegar Satélite</div>
                      <div className="text-[10px] text-slate-400 font-normal">Mover mapa</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* ROTATE CONTROLS (Rotacionar) */}
              <div className="bg-slate-900/70 rounded-2xl p-3.5 border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <RotateCw className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Rotacionar</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-700/50">
                      {transform.rotation}°
                    </span>
                    <button
                      type="button"
                      onClick={() => onTransformChange({ ...transform, rotation: 0 })}
                      className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 transition-colors"
                      title="Zerar rotação (0°)"
                    >
                      0°
                    </button>
                  </div>
                </div>

                {/* Angle Slider */}
                <div className="mb-3">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={transform.rotation}
                    onChange={(e) =>
                      onTransformChange({
                        ...transform,
                        rotation: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-mono">
                    <span>0° (N)</span>
                    <span>90° (L)</span>
                    <span>180° (S)</span>
                    <span>270° (O)</span>
                    <span>360°</span>
                  </div>
                </div>

                {/* Quick Angle Adjust Buttons */}
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleAddAngle(-45)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-[11px] transition-colors active:scale-95"
                  >
                    -45°
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAngle(-5)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-[11px] transition-colors active:scale-95"
                  >
                    -5°
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAngle(-1)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg font-mono text-[11px] transition-colors active:scale-95"
                  >
                    -1°
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAngle(1)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg font-mono text-[11px] transition-colors active:scale-95"
                  >
                    +1°
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAngle(5)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-[11px] transition-colors active:scale-95"
                  >
                    +5°
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAngle(45)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-[11px] transition-colors active:scale-95"
                  >
                    +45°
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAngle(90)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-[11px] transition-colors active:scale-95"
                  >
                    +90°
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAngle(180)}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-mono text-[11px] transition-colors active:scale-95"
                  >
                    180°
                  </button>
                </div>
              </div>

              {/* MOVE CONTROLS (Mover / Translação) */}
              <div className="bg-slate-900/70 rounded-2xl p-3.5 border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Mover Polígono</span>
                  </div>
                  <button
                    type="button"
                    onClick={onCenterPolygon}
                    className="text-[10px] text-amber-300 hover:text-white px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 flex items-center gap-1 transition-colors"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>Centralizar</span>
                  </button>
                </div>

                {/* Step Size Selector */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span>Passo do ajuste:</span>
                  <div className="flex gap-1">
                    {[1, 5, 20, 100].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setStepSize(sz)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          stepSize === sz
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {sz}px
                      </button>
                    ))}
                  </div>
                </div>

                {/* D-Pad Directional Arrows */}
                <div className="flex justify-center my-3">
                  <div className="grid grid-cols-3 gap-1.5 w-36">
                    <div></div>
                    <button
                      type="button"
                      onClick={() => handleNudge(0, -1)}
                      className="h-10 bg-slate-800 hover:bg-amber-500/30 active:bg-amber-500 text-white rounded-xl flex items-center justify-center border border-slate-700 active:scale-95 transition-all shadow-md"
                      title="Mover para Cima"
                    >
                      <ArrowUp className="w-5 h-5 text-amber-400" />
                    </button>
                    <div></div>

                    <button
                      type="button"
                      onClick={() => handleNudge(-1, 0)}
                      className="h-10 bg-slate-800 hover:bg-amber-500/30 active:bg-amber-500 text-white rounded-xl flex items-center justify-center border border-slate-700 active:scale-95 transition-all shadow-md"
                      title="Mover para Esquerda"
                    >
                      <ArrowLeft className="w-5 h-5 text-amber-400" />
                    </button>
                    <button
                      type="button"
                      onClick={onCenterPolygon}
                      className="h-10 bg-slate-900 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center justify-center border border-slate-700/80 text-[10px] font-mono"
                      title="Centro"
                    >
                      <Crosshair className="w-4 h-4 text-amber-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudge(1, 0)}
                      className="h-10 bg-slate-800 hover:bg-amber-500/30 active:bg-amber-500 text-white rounded-xl flex items-center justify-center border border-slate-700 active:scale-95 transition-all shadow-md"
                      title="Mover para Direita"
                    >
                      <ArrowRight className="w-5 h-5 text-amber-400" />
                    </button>

                    <div></div>
                    <button
                      type="button"
                      onClick={() => handleNudge(0, 1)}
                      className="h-10 bg-slate-800 hover:bg-amber-500/30 active:bg-amber-500 text-white rounded-xl flex items-center justify-center border border-slate-700 active:scale-95 transition-all shadow-md"
                      title="Mover para Baixo"
                    >
                      <ArrowDown className="w-5 h-5 text-amber-400" />
                    </button>
                    <div></div>
                  </div>
                </div>

                {/* Position Coordinates display */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Offset X</span>
                    <span className="text-amber-300 font-semibold">{transform.offsetX} px</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Offset Y</span>
                    <span className="text-amber-300 font-semibold">{transform.offsetY} px</span>
                  </div>
                </div>
              </div>

              {/* SCALE & FLIP CONTROLS */}
              <div className="bg-slate-900/70 rounded-2xl p-3.5 border border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Escala & Tamanho</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50">
                    {Math.round(transform.scale * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  min={0.1}
                  max={4.0}
                  step={0.05}
                  value={transform.scale}
                  onChange={(e) =>
                    onTransformChange({
                      ...transform,
                      scale: parseFloat(e.target.value) || 1,
                    })
                  }
                  className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-800 rounded-lg mb-2"
                />

                <div className="flex items-center gap-1.5 mb-3">
                  {[0.5, 1.0, 1.5, 2.0].map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => onTransformChange({ ...transform, scale: sc })}
                      className={`flex-1 py-1 rounded text-[11px] font-mono transition-colors ${
                        transform.scale === sc
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {Math.round(sc * 100)}%
                    </button>
                  ))}
                </div>

                {/* Flip options */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onTransformChange({ ...transform, flipX: !transform.flipX })}
                    className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      transform.flipX
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700'
                    }`}
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                    <span>Espelhar Horiz.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onTransformChange({ ...transform, flipY: !transform.flipY })}
                    className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                      transform.flipY
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700'
                    }`}
                  >
                    <FlipVertical className="w-3.5 h-3.5" />
                    <span>Espelhar Vert.</span>
                  </button>
                </div>
              </div>

              {/* Reset Button */}
              <button
                type="button"
                onClick={onResetTransform}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-800/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Posição Original</span>
              </button>
            </>
          )}

          {activeTab === 'style' && (
            <>
              {/* Color Palette for Satellite Contrast */}
              <div className="bg-slate-900/70 rounded-2xl p-3.5 border border-slate-800/80">
                <label className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
                  Cor da Linha no Satélite
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {HIGH_CONTRAST_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => onStyleChange({ ...style, strokeColor: c.hex, fillColor: c.hex })}
                      className="group relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all"
                      style={{
                        borderColor: style.strokeColor === c.hex ? c.hex : 'rgba(51, 65, 85, 0.6)',
                        backgroundColor: style.strokeColor === c.hex ? `${c.hex}15` : 'rgba(15, 23, 42, 0.6)',
                      }}
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white/40 shadow-sm"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-[9px] text-slate-300 truncate w-full text-center">{c.name}</span>
                      {style.strokeColor === c.hex && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Stroke Width Slider */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                    <span>Espessura do Traço:</span>
                    <span className="font-mono text-cyan-300">{style.strokeWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={1}
                    value={style.strokeWidth}
                    onChange={(e) =>
                      onStyleChange({
                        ...style,
                        strokeWidth: parseInt(e.target.value, 10) || 2,
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Fill Opacity */}
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                    <span>Transparência de Preenchimento:</span>
                    <span className="font-mono text-cyan-300">{Math.round(style.fillOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.8}
                    step={0.05}
                    value={style.fillOpacity}
                    onChange={(e) =>
                      onStyleChange({
                        ...style,
                        fillOpacity: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-slate-900/70 rounded-2xl p-3.5 border border-slate-800/80 space-y-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">Elementos Visuais</span>

                {/* Vertices toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-200">Mostrar Vértices / Nós (P1, P2...)</span>
                  <input
                    type="checkbox"
                    checked={style.showVertices}
                    onChange={(e) => onStyleChange({ ...style, showVertices: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                </label>

                {/* Dimensions toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-200">Mostrar Cotas / Comprimento dos Lados</span>
                  <input
                    type="checkbox"
                    checked={style.showDimensions}
                    onChange={(e) => onStyleChange({ ...style, showDimensions: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                </label>

                {/* Pivot toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-slate-200">Mostrar Pivô Central de Rotação</span>
                  <input
                    type="checkbox"
                    checked={style.showCenterPivot}
                    onChange={(e) => onStyleChange({ ...style, showCenterPivot: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                </label>
              </div>
            </>
          )}

          {activeTab === 'info' && (
            <>
              {dxfData ? (
                <div className="space-y-3">
                  {/* File card */}
                  <div className="bg-slate-900/70 rounded-2xl p-3.5 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Arquivo Carregado
                    </span>
                    <h3 className="text-sm font-bold text-white truncate">{dxfData.fileName}</h3>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {dxfData.layers.map((l) => (
                        <span
                          key={l}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700"
                        >
                          Layer: {l}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Calculated metrics */}
                  <div className="bg-slate-900/70 rounded-2xl p-3.5 border border-slate-800/80 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Dimensões Geométricas
                    </span>

                    {dxfData.estimatedArea && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800">
                        <span className="text-xs text-slate-300">Área Estimada:</span>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {dxfData.estimatedArea.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m²
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            ({(dxfData.estimatedArea / 10000).toFixed(3)} ha)
                          </span>
                        </div>
                      </div>
                    )}

                    {dxfData.estimatedPerimeter && (
                      <div className="flex items-center justify-between py-1 border-b border-slate-800">
                        <span className="text-xs text-slate-300">Perímetro Total:</span>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {dxfData.estimatedPerimeter.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-1 border-b border-slate-800">
                      <span className="text-xs text-slate-300">Total de Entidades:</span>
                      <span className="text-xs font-mono text-slate-200">{dxfData.entities.length}</span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-slate-300">Vértices CAD:</span>
                      <span className="text-xs font-mono text-slate-200">{dxfData.totalPoints}</span>
                    </div>
                  </div>

                  {/* Transform status */}
                  <div className="bg-slate-900/70 rounded-2xl p-3.5 border border-slate-800/80 text-xs text-slate-300 space-y-1 font-mono">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block font-sans mb-1">
                      Ajuste Atual na Tela
                    </span>
                    <div>Rotação: <span className="text-cyan-300 font-bold">{transform.rotation}°</span></div>
                    <div>Deslocamento X/Y: <span className="text-amber-300 font-bold">{transform.offsetX}px, {transform.offsetY}px</span></div>
                    <div>Fator de Escala: <span className="text-emerald-300 font-bold">{transform.scale}x</span></div>
                  </div>

                  {/* Export action in info tab */}
                  {onOpenExport && (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleOpen();
                        onOpenExport();
                      }}
                      className="w-full py-3 px-4 bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                      <span>Exportar Imagem PNG (Satélite + DXF)</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nenhum arquivo DXF importado no momento.
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Drawer Actions */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex flex-col gap-2">
          {onOpenExport && (
            <button
              id="btn-drawer-export-png"
              type="button"
              onClick={() => {
                onToggleOpen();
                onOpenExport();
              }}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-950/30 flex items-center justify-center gap-2 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Visualização PNG</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleOpen}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all active:scale-95 text-center"
          >
            Confirmar e Voltar à Tela
          </button>
        </div>
      </div>

      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
        />
      )}
    </>
  );
};
