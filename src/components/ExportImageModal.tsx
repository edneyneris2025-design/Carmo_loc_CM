/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download,
  Copy,
  Check,
  Share2,
  X,
  FileImage,
  Sparkles,
  Layers,
  Compass,
  FileText,
  Maximize,
  ZoomIn,
  RefreshCw,
  Eye,
  Sliders,
} from 'lucide-react';
import { DxfParsedData, PolygonTransform, PolygonStyle } from '../types/dxf';
import {
  ExportImageOptions,
  ExportResult,
  captureViewToCanvas,
  downloadBlobAsFile,
  copyBlobToClipboard,
} from '../utils/exportImage';

interface ExportImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  containerElement: HTMLElement | null;
  dxfData: DxfParsedData | null;
  transform: PolygonTransform;
  style: PolygonStyle;
  mapCoords?: { lat: number; lng: number; zoom: number };
  satelliteProviderName?: string;
}

export const ExportImageModal: React.FC<ExportImageModalProps> = ({
  isOpen,
  onClose,
  containerElement,
  dxfData,
  transform,
  style,
  mapCoords,
  satelliteProviderName,
}) => {
  const [resolution, setResolution] = useState<'1x' | '2x'>('2x');
  const [includeLegend, setIncludeLegend] = useState(true);
  const [includeNorthArrow, setIncludeNorthArrow] = useState(true);
  const [includeScaleBar, setIncludeScaleBar] = useState(true);
  const [includeVertices, setIncludeVertices] = useState(style.showVertices);
  const [includeDimensions, setIncludeDimensions] = useState(style.showDimensions);
  const [includeCenterPivot, setIncludeCenterPivot] = useState(false); // Clean export by default

  const [isGenerating, setIsGenerating] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canShare, setCanShare] = useState(false);

  // Check if navigator.share with files is supported
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanShare(true);
    }
  }, []);

  // Generate the image export
  const generateExport = useCallback(async () => {
    if (!containerElement || !isOpen) return;

    setIsGenerating(true);
    setErrorMessage(null);

    const options: ExportImageOptions = {
      resolution,
      includeLegend,
      includeNorthArrow,
      includeScaleBar,
      includeVertices,
      includeDimensions,
      includeCenterPivot,
      mapCoords,
      satelliteProviderName,
    };

    try {
      // Short delay so DOM is stable
      await new Promise((r) => setTimeout(r, 60));
      const result = await captureViewToCanvas(
        containerElement,
        dxfData,
        transform,
        style,
        options
      );
      setExportResult(result);
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMessage(
        err?.message || 'Erro ao capturar a visualização. Verifique se o mapa carregou completamente.'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [
    containerElement,
    isOpen,
    resolution,
    includeLegend,
    includeNorthArrow,
    includeScaleBar,
    includeVertices,
    includeDimensions,
    includeCenterPivot,
    dxfData,
    transform,
    style,
    mapCoords,
    satelliteProviderName,
  ]);

  // Trigger generation when opened or options change
  useEffect(() => {
    if (isOpen) {
      generateExport();
    } else {
      setExportResult(null);
      setCopiedSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen, generateExport]);

  if (!isOpen) return null;

  // Build clean filename
  const rawName = dxfData?.fileName ? dxfData.fileName.replace(/\.dxf$/i, '') : 'poligono';
  const cleanBaseName = rawName.toLowerCase().replace(/[^a-z0-9_-]/gi, '-');
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `dxf-satelite-${cleanBaseName}-${dateStamp}.png`;

  const handleDownload = () => {
    if (!exportResult) return;
    downloadBlobAsFile(exportResult.blob, fileName);
  };

  const handleCopy = async () => {
    if (!exportResult) return;
    const success = await copyBlobToClipboard(exportResult.blob);
    if (success) {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    } else {
      alert('Não foi possível copiar para a área de transferência. Use o botão Baixar PNG.');
    }
  };

  const handleShare = async () => {
    if (!exportResult || !canShare) return;
    try {
      const file = new File([exportResult.blob], fileName, { type: 'image/png' });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        throw new Error('Compartilhamento de arquivo não suportado');
      }
      await navigator.share({
        title: `DXF Satélite: ${dxfData?.fileName || 'Polígono'}`,
        text: 'Visualização de arquivo DXF sobreposto em imagem de satélite.',
        files: [file],
      });
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        console.warn('Share error:', e);
        handleDownload();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm select-none">
      <div
        id="export-png-modal"
        className="relative w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <FileImage className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Exportar Visualização PNG
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Satélite + DXF
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Captura de alta fidelidade com sobreposição precisa do polígono
              </p>
            </div>
          </div>
          <button
            id="btn-close-export-modal"
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left Preview, Right Controls */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Preview Container (7 Cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                Prévia da Imagem
              </span>
              {exportResult && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {exportResult.width} × {exportResult.height} px
                </span>
              )}
            </div>

            {/* Visual Preview Box */}
            <div className="relative w-full aspect-video sm:aspect-4/3 rounded-2xl border border-slate-700/60 bg-slate-950 overflow-hidden flex items-center justify-center shadow-inner group">
              {isGenerating && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-slate-950/85 backdrop-blur-xs">
                  <RefreshCw className="w-7 h-7 text-amber-400 animate-spin" />
                  <span className="text-xs font-semibold text-slate-200">
                    Processando satélite e vetores...
                  </span>
                </div>
              )}

              {errorMessage && (
                <div className="p-4 text-center text-xs text-rose-300 max-w-sm">
                  <p className="font-semibold mb-1">Não foi possível gerar a captura</p>
                  <p className="text-slate-400 mb-3">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={generateExport}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tentar Novamente
                  </button>
                </div>
              )}

              {!isGenerating && exportResult && (
                <img
                  src={exportResult.dataUrl}
                  alt="Prévia da exportação DXF com satélite"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Quick Refresh Button */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>{fileName}</span>
              <button
                type="button"
                onClick={generateExport}
                disabled={isGenerating}
                className="hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Atualizar prévia</span>
              </button>
            </div>
          </div>

          {/* Export Options & Settings (5 Cols on desktop) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              {/* Resolution Selector */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Qualidade da Imagem
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolution('1x')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-start transition-all ${
                      resolution === '1x'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/60 shadow-md'
                        : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold">1x Padrão</span>
                    <span className="text-[10px] opacity-75">Resolução de tela</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolution('2x')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-start transition-all ${
                      resolution === '2x'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/60 shadow-md'
                        : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1">
                      2x Alta Definição (HD)
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                    </span>
                    <span className="text-[10px] opacity-75">Ideal para relatórios e laudos</span>
                  </button>
                </div>
              </div>

              {/* Composition Toggles */}
              <div>
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Elementos Técnicos Inclusos
                </label>
                <div className="space-y-2 bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                  {/* Carimbo / Legenda */}
                  <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/50 cursor-pointer">
                    <div className="flex items-center gap-2 text-xs text-slate-200">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="font-semibold">Carimbo Técnico / Legenda</div>
                        <div className="text-[10px] text-slate-400">
                          Arquivo, coordenadas, área e perímetro
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeLegend}
                      onChange={(e) => setIncludeLegend(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                  </label>

                  {/* Rosa dos Ventos */}
                  <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/50 cursor-pointer">
                    <div className="flex items-center gap-2 text-xs text-slate-200">
                      <Compass className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-semibold">Indicador de Norte Geográfico</div>
                        <div className="text-[10px] text-slate-400">Rosa dos ventos cartográfica</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeNorthArrow}
                      onChange={(e) => setIncludeNorthArrow(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                  </label>

                  {/* Barra de Escala */}
                  <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/50 cursor-pointer">
                    <div className="flex items-center gap-2 text-xs text-slate-200">
                      <Maximize className="w-4 h-4 text-yellow-400" />
                      <div>
                        <div className="font-semibold">Barra de Escala Métrica</div>
                        <div className="text-[10px] text-slate-400">
                          Escala gráfica correspondente ao zoom
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeScaleBar}
                      onChange={(e) => setIncludeScaleBar(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                  </label>

                  {/* Vértices CAD */}
                  <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/50 cursor-pointer">
                    <div className="flex items-center gap-2 text-xs text-slate-200">
                      <span className="w-4 h-4 rounded-full border border-white/60 flex items-center justify-center text-[9px] font-bold text-slate-200">
                        P
                      </span>
                      <div>
                        <div className="font-semibold">Marcadores de Vértices</div>
                        <div className="text-[10px] text-slate-400">Identificação P1, P2, P3...</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeVertices}
                      onChange={(e) => setIncludeVertices(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                  </label>

                  {/* Dimensões dos Lados */}
                  <label className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/50 cursor-pointer">
                    <div className="flex items-center gap-2 text-xs text-slate-200">
                      <span className="text-[11px] font-mono text-amber-400 font-bold">m</span>
                      <div>
                        <div className="font-semibold">Cotas de Distância dos Lados</div>
                        <div className="text-[10px] text-slate-400">
                          Medidas dos segmentos de reta
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeDimensions}
                      onChange={(e) => setIncludeDimensions(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              {/* Primary Download Button */}
              <button
                id="btn-download-png"
                type="button"
                onClick={handleDownload}
                disabled={isGenerating || !exportResult}
                className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-98"
              >
                <Download className="w-5 h-5" />
                <span>Baixar Imagem PNG</span>
              </button>

              {/* Secondary Actions: Copy & Share */}
              <div className="flex gap-2">
                <button
                  id="btn-copy-png"
                  type="button"
                  onClick={handleCopy}
                  disabled={isGenerating || !exportResult}
                  className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                >
                  {copiedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Imagem Copiada!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-cyan-400" />
                      <span>Copiar Imagem</span>
                    </>
                  )}
                </button>

                {canShare && (
                  <button
                    id="btn-share-png"
                    type="button"
                    onClick={handleShare}
                    disabled={isGenerating || !exportResult}
                    className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-amber-400" />
                    <span>Compartilhar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
