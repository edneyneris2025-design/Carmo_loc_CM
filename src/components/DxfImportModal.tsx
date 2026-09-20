import React, { useState, useRef } from 'react';
import { Upload, FileCode, CheckCircle2, AlertCircle, X, Sparkles, FolderOpen } from 'lucide-react';
import { parseDxfContent } from '../utils/dxfParser';
import { SAMPLE_DXF_FILES } from '../utils/sampleDxf';
import { DxfParsedData } from '../types/dxf';

interface DxfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDxfLoaded: (parsedData: DxfParsedData) => void;
}

export const DxfImportModal: React.FC<DxfImportModalProps> = ({
  isOpen,
  onClose,
  onDxfLoaded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = (file: File) => {
    setIsLoading(true);
    setErrorMsg(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          throw new Error('O arquivo DXF está vazio.');
        }

        const parsed = parseDxfContent(text, file.name);

        if (parsed.entities.length === 0) {
          throw new Error('Nenhum polígono, polilinha ou linha foi detectado neste arquivo DXF.');
        }

        setIsLoading(false);
        onDxfLoaded(parsed);
        onClose();
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Erro ao processar o arquivo DXF. Verifique o formato.');
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      setErrorMsg('Falha na leitura do arquivo local.');
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileProcess(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_DXF_FILES.find((s) => s.id === sampleId);
    if (!sample) return;

    setIsLoading(true);
    try {
      const parsed = parseDxfContent(sample.content, `${sample.name}.dxf`);
      setIsLoading(false);
      onDxfLoaded(parsed);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg('Erro ao carregar exemplo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Importar Arquivo DXF</h2>
              <p className="text-xs text-slate-400">Carregar desenho vetorial CAD / Topográfico</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl flex items-start gap-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                : 'border-slate-700 hover:border-amber-500/50 bg-slate-950/40 hover:bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".dxf,text/plain"
              className="hidden"
              onChange={handleFileInputChange}
            />

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
              <FileCode className="w-7 h-7" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                Clique para selecionar seu arquivo <span className="text-amber-400">.dxf</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ou arraste e solte o arquivo diretamente aqui
              </p>
            </div>

            <div className="px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-full text-[10px] text-slate-400 font-mono">
              Compatível com AutoCAD, QGIS, TopoGRAPH, Civil 3D
            </div>
          </div>

          {/* Preset Sample DXFs for Instant Test */}
          <div>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ou teste com exemplos prontos:
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {SAMPLE_DXF_FILES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleLoadSample(sample.id)}
                  className="p-3 bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left transition-all flex items-center justify-between group active:scale-[0.99]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        {sample.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                        {sample.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{sample.description}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-400 flex items-center justify-center shrink-0 ml-2 transition-colors">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>O polígono será centralizado automaticamente sobre o satélite.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
