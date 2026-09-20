import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Crosshair, ZoomIn, ZoomOut, MapPin } from 'lucide-react';

interface SatelliteMapProps {
  isMapInteractionMode: boolean;
  onMapCenterChange?: (lat: number, lng: number, zoom: number) => void;
  onProviderChange?: (providerName: string) => void;
  flyToLocation?: { lat: number; lng: number; zoom?: number; timestamp: number; name?: string } | null;
}

export type SatelliteLayerType = 'esri' | 'esri_clarity' | 'google_hybrid' | 'osm';

export const SATELLITE_PROVIDERS: { id: SatelliteLayerType; name: string; attribution: string; url: string; subdomains?: string[] }[] = [
  {
    id: 'esri',
    name: 'Esri World Imagery (Alta Resolução)',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
  {
    id: 'esri_clarity',
    name: 'Esri Clarity (Satélite Nítido)',
    attribution: 'Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community',
    url: 'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
  {
    id: 'google_hybrid',
    name: 'Google Satélite & Estradas',
    attribution: '&copy; Google Maps',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
  },
  {
    id: 'osm',
    name: 'OpenStreetMap (Topografia)',
    attribution: '&copy; OpenStreetMap contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c']
  }
];

export const SatelliteMap: React.FC<SatelliteMapProps> = ({
  isMapInteractionMode,
  onMapCenterChange,
  onProviderChange,
  flyToLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);

  const [activeProvider, setActiveProvider] = useState<SatelliteLayerType>('esri');
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: -15.7942, // Brasília / Cerrado (centro do Brasil, excelente para áreas rurais e urbanas)
    lng: -47.8822,
    zoom: 16,
  });
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map with full screen touch support
      const map = L.map(mapContainerRef.current, {
        center: [currentCoords.lat, currentCoords.lng],
        zoom: currentCoords.zoom,
        zoomControl: false, // Custom mobile controls
        attributionControl: false,
        fadeAnimation: true,
        zoomAnimation: true,
        maxZoom: 20,
      });

      mapInstanceRef.current = map;

      const provider = SATELLITE_PROVIDERS.find((p) => p.id === activeProvider) || SATELLITE_PROVIDERS[0];
      const layer = L.tileLayer(provider.url, {
        maxZoom: 20,
        subdomains: provider.subdomains || 'abc',
        crossOrigin: 'anonymous',
      }).addTo(map);

      tileLayerRef.current = layer;
      if (onProviderChange) {
        onProviderChange(provider.name);
      }

      map.on('moveend', () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        setCurrentCoords({ lat: center.lat, lng: center.lng, zoom });
        if (onMapCenterChange) {
          onMapCenterChange(center.lat, center.lng, zoom);
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update tile layer when provider changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const provider = SATELLITE_PROVIDERS.find((p) => p.id === activeProvider) || SATELLITE_PROVIDERS[0];

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newLayer = L.tileLayer(provider.url, {
      maxZoom: 20,
      subdomains: provider.subdomains || 'abc',
      crossOrigin: 'anonymous',
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
    if (onProviderChange) {
      onProviderChange(provider.name);
    }
  }, [activeProvider]);

  // Enable / disable map dragging based on whether the user is in "Map navigation" mode or interacting with the polygon
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    if (isMapInteractionMode) {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
    } else {
      // In move/rotate mode, allow dragging map with 2 fingers or keep map static so single finger moves polygon
      map.dragging.disable();
    }
  }, [isMapInteractionMode]);

  // Handle flying to requested location (from LocationSearchBar or presets)
  useEffect(() => {
    if (!mapInstanceRef.current || !flyToLocation) return;
    const map = mapInstanceRef.current;
    const targetZoom = flyToLocation.zoom || 16;

    map.flyTo([flyToLocation.lat, flyToLocation.lng], targetZoom, {
      duration: 1.5,
    });

    // Remove previous search marker if any
    if (searchMarkerRef.current) {
      map.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }

    // Add animated custom pulse pin for the searched location
    const customIcon = L.divIcon({
      className: 'search-location-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; transform: translate(-50%, -100%);">
          <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: rgba(245, 158, 11, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #f59e0b; border: 2.5px solid #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #0f172a;"></div>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    const marker = L.marker([flyToLocation.lat, flyToLocation.lng], { icon: customIcon }).addTo(map);

    if (flyToLocation.name) {
      marker
        .bindPopup(
          `<div style="font-family: sans-serif; font-size: 11px; font-weight: bold; color: #0f172a; padding: 2px 4px; max-width: 220px; text-align: center;">
            ${flyToLocation.name}
            <div style="font-size: 9px; font-weight: normal; color: #64748b; margin-top: 2px; font-family: monospace;">
              ${flyToLocation.lat.toFixed(5)}, ${flyToLocation.lng.toFixed(5)}
            </div>
          </div>`,
          { closeButton: false, offset: [0, -20] }
        )
        .openPopup();
    }

    searchMarkerRef.current = marker;
  }, [flyToLocation]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada no seu navegador.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 17, {
            duration: 1.5,
          });
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('Não foi possível obter a localização atual. Verifique as permissões de GPS.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none">
      {/* Leaflet container filling full screen */}
      <div
        id="satellite-map-container"
        ref={mapContainerRef}
        className="w-full h-full z-0 bg-slate-950"
      />

      {/* Subtle crosshair / target guide at center of screen for alignment */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10 opacity-30">
        <div className="w-8 h-8 relative flex items-center justify-center">
          <div className="w-8 h-[1px] bg-white/70 absolute"></div>
          <div className="h-8 w-[1px] bg-white/70 absolute"></div>
          <div className="w-3 h-3 rounded-full border border-white/80"></div>
        </div>
      </div>

      {/* Floating map controls on bottom-left for mobile thumb access */}
      <div className="absolute bottom-6 left-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          id="btn-zoom-in"
          type="button"
          onClick={handleZoomIn}
          className="w-11 h-11 bg-slate-900/85 hover:bg-slate-800 text-white rounded-xl shadow-lg backdrop-blur-md border border-slate-700/60 flex items-center justify-center transition-transform active:scale-95"
          title="Aproximar Zoom"
        >
          <ZoomIn className="w-5 h-5 text-emerald-400" />
        </button>
        <button
          id="btn-zoom-out"
          type="button"
          onClick={handleZoomOut}
          className="w-11 h-11 bg-slate-900/85 hover:bg-slate-800 text-white rounded-xl shadow-lg backdrop-blur-md border border-slate-700/60 flex items-center justify-center transition-transform active:scale-95"
          title="Afastar Zoom"
        >
          <ZoomOut className="w-5 h-5 text-emerald-400" />
        </button>
        <button
          id="btn-gps-locate"
          type="button"
          onClick={handleGeolocation}
          disabled={isLocating}
          className={`w-11 h-11 bg-slate-900/85 hover:bg-slate-800 text-white rounded-xl shadow-lg backdrop-blur-md border border-slate-700/60 flex items-center justify-center transition-transform active:scale-95 ${
            isLocating ? 'animate-pulse text-cyan-400' : ''
          }`}
          title="Minha Localização GPS"
        >
          <Crosshair className={`w-5 h-5 ${isLocating ? 'text-cyan-400 animate-spin' : 'text-cyan-400'}`} />
        </button>

        {/* Layer selector toggle */}
        <div className="relative">
          <button
            id="btn-layer-selector"
            type="button"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className={`w-11 h-11 ${
              showLayerMenu ? 'bg-emerald-600 text-white' : 'bg-slate-900/85 text-white'
            } rounded-xl shadow-lg backdrop-blur-md border border-slate-700/60 flex items-center justify-center transition-all active:scale-95`}
            title="Mudar Imagem de Satélite"
          >
            <Layers className="w-5 h-5 text-amber-400" />
          </button>

          {showLayerMenu && (
            <div className="absolute bottom-0 left-14 mb-0 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl z-30">
              <div className="text-xs font-semibold text-slate-300 px-2 py-1 mb-1 border-b border-slate-800">
                Fundo de Satélite
              </div>
              <div className="flex flex-col gap-1">
                {SATELLITE_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setActiveProvider(p.id);
                      setShowLayerMenu(false);
                    }}
                    className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                      activeProvider === p.id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{p.name}</span>
                    {activeProvider === p.id && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Satellite Info Pill at bottom center */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-slate-300 border border-white/10">
          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>
            {currentCoords.lat.toFixed(4)}°, {currentCoords.lng.toFixed(4)}° • Zoom {currentCoords.zoom}x
          </span>
        </div>
      </div>
    </div>
  );
};
