import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X, Navigation, Compass } from 'lucide-react';
import { searchLocation, parseCoordinates, GeocodingResult } from '../utils/geocoding';

interface LocationSearchBarProps {
  onSelectLocation: (lat: number, lng: number, name: string) => void;
  className?: string;
}

const QUICK_PRESETS = [
  { name: 'Brasília - DF', lat: -15.7942, lng: -47.8822, desc: 'Plano Piloto' },
  { name: 'Goiânia - GO', lat: -16.6869, lng: -49.2648, desc: 'Centro-Oeste Agrícola' },
  { name: 'Ribeirão Preto - SP', lat: -21.1775, lng: -47.8103, desc: 'Polo Agroindustrial' },
  { name: 'Cuiabá - MT', lat: -15.6014, lng: -56.0979, desc: 'Mato Grosso' },
  { name: 'São Paulo - SP', lat: -23.5505, lng: -46.6333, desc: 'Capital' },
];

export const LocationSearchBar: React.FC<LocationSearchBarProps> = ({
  onSelectLocation,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search on typing
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) {
      setResults([]);
      setIsLoading(false);
      setHasSearched(false);
      return;
    }

    // Direct coordinates detection: no delay needed
    const directCoords = parseCoordinates(trimmed);
    if (directCoords) {
      setResults([
        {
          id: 'direct-coord',
          name: `Coordenadas: ${directCoords.lat.toFixed(5)}, ${directCoords.lng.toFixed(5)}`,
          displayName: `Latitude: ${directCoords.lat.toFixed(6)}, Longitude: ${directCoords.lng.toFixed(6)}`,
          lat: directCoords.lat,
          lng: directCoords.lng,
          type: 'coordinate',
        },
      ]);
      setIsOpen(true);
      setHasSearched(true);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchLocation(trimmed, controller.signal);
        setResults(data);
        setIsOpen(true);
        setHasSearched(true);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Error fetching locations:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // Check direct coordinates
    const directCoords = parseCoordinates(trimmed);
    if (directCoords) {
      onSelectLocation(
        directCoords.lat,
        directCoords.lng,
        `Coordenadas (${directCoords.lat.toFixed(5)}, ${directCoords.lng.toFixed(5)})`
      );
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await searchLocation(trimmed);
      setResults(data);
      setHasSearched(true);
      setIsOpen(true);

      if (data.length > 0) {
        const first = data[0];
        onSelectLocation(first.lat, first.lng, first.displayName);
        setIsOpen(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectResult = (item: GeocodingResult) => {
    setQuery(item.name);
    setIsOpen(false);
    onSelectLocation(item.lat, item.lng, item.displayName);
  };

  const handleSelectPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setQuery(preset.name);
    setIsOpen(false);
    onSelectLocation(preset.lat, preset.lng, `${preset.name} (${preset.desc})`);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative pointer-events-auto ${className}`}>
      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="relative w-full flex items-center bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md border border-slate-700/80 focus-within:border-amber-400/80 rounded-2xl shadow-xl transition-all">
          <div className="pl-3.5 pr-2 text-slate-400 flex items-center pointer-events-none">
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-amber-400" />
            )}
          </div>

          <input
            ref={inputRef}
            id="input-location-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Digite local, cidade ou coordenadas (ex: -15.79, -47.88)..."
            className="w-full py-2 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none pr-16"
            autoComplete="off"
          />

          {/* Action Buttons inside input */}
          <div className="absolute right-1.5 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                title="Limpar texto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-bold text-[11px] rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1"
              title="Buscar e ir para o local"
            >
              <Navigation className="w-3 h-3" />
              <span className="hidden xs:inline">Ir</span>
            </button>
          </div>
        </div>
      </form>

      {/* Autocomplete / Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Results List */}
          {results.length > 0 ? (
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60 p-1">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-between">
                <span>Resultados Encontrados</span>
                <span className="text-amber-400 lowercase text-[9px]">clique para navegar</span>
              </div>
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectResult(item)}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-800/80 rounded-xl transition-colors flex items-start gap-2.5 group"
                >
                  <div className="mt-0.5 w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate group-hover:text-amber-300">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate leading-snug">
                      {item.displayName}
                    </p>
                    <p className="text-[9px] font-mono text-emerald-400/80 mt-0.5">
                      Lat: {item.lat.toFixed(5)}, Lng: {item.lng.toFixed(5)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : hasSearched && !isLoading ? (
            <div className="p-4 text-center">
              <MapPin className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-300">Nenhum local encontrado</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Verifique o nome digitado ou tente colar coordenadas GPS no formato: <br />
                <code className="text-amber-300 font-mono text-[10px]">-15.7942, -47.8822</code>
              </p>
            </div>
          ) : (
            /* Quick Presets when input is empty or before search */
            <div className="p-2">
              <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-cyan-400" />
                <span>Locais Rápidos / Polos Regionais</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="text-left px-2.5 py-2 hover:bg-slate-800/80 rounded-xl transition-colors flex items-center gap-2 group"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                        {preset.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{preset.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
