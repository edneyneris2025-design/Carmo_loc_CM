export interface GeocodingResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
}

/**
 * Checks if a search query is a direct coordinate string (Lat, Lng)
 * Supports:
 * - "-15.7942, -47.8822"
 * - "-15.7942 -47.8822"
 * - "-15,7942, -47,8822" (Brazilian comma decimal)
 * - "15.7942 S, 47.8822 W"
 */
export function parseCoordinates(query: string): { lat: number; lng: number } | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Handle Brazilian comma decimal notation if two coordinates are comma-separated or space-separated
  // Example: -15,7942, -47,8822 or -15.7942, -47.8822
  const cleaned = trimmed
    .replace(/[°º\'\"]/g, '')
    .trim();

  // Pattern with directional letters (N/S/E/W)
  const dirMatch = cleaned.match(/([\d.,]+)\s*([NSns])\s*[,;\s]\s*([\d.,]+)\s*([EWewOo])/);
  if (dirMatch) {
    let lat = parseFloat(dirMatch[1].replace(',', '.'));
    const latDir = dirMatch[2].toUpperCase();
    let lng = parseFloat(dirMatch[3].replace(',', '.'));
    const lngDir = dirMatch[4].toUpperCase();

    if (latDir === 'S') lat = -lat;
    if (lngDir === 'W' || lngDir === 'O') lng = -lng;

    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  // Standard numeric pattern: e.g. -15.7942, -47.8822 or -15.7942 -47.8822
  // If comma separated:
  const parts = cleaned.split(/[,;\s]+/).filter(Boolean);
  if (parts.length === 2) {
    const lat = parseFloat(parts[0].replace(',', '.'));
    const lng = parseFloat(parts[1].replace(',', '.'));
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  } else if (parts.length === 4 && cleaned.includes(',')) {
    // Possibly "-15, 7942, -47, 8822"? No, if comma was used as decimal:
    // e.g. "-15,7942" and "-47,8822"
    // The previous split(/[,;\s]+/) would break on comma. Let's do a more robust regex:
  }

  const standardMatch = cleaned.match(/^([+-]?\d+(?:[.,]\d+)?)\s*[,;\s]\s*([+-]?\d+(?:[.,]\d+)?)$/);
  if (standardMatch) {
    const lat = parseFloat(standardMatch[1].replace(',', '.'));
    const lng = parseFloat(standardMatch[2].replace(',', '.'));
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Searches for a location by text query using Nominatim OpenStreetMap
 * with fallback to Photon.
 */
export async function searchLocation(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  // Check if query is direct coordinates
  const coords = parseCoordinates(trimmed);
  if (coords) {
    return [
      {
        id: `coord-${coords.lat}-${coords.lng}`,
        name: `Coordenadas: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
        displayName: `Latitude: ${coords.lat.toFixed(6)}, Longitude: ${coords.lng.toFixed(6)} (Ponto GPS Direto)`,
        lat: coords.lat,
        lng: coords.lng,
        type: 'coordinate',
      },
    ];
  }

  // 1. Try Nominatim (OSM)
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&limit=5&addressdetails=1`;

    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
      signal,
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any, idx: number) => {
          const name = item.name || item.display_name.split(',')[0];
          return {
            id: `osm-${item.place_id || idx}`,
            name: name,
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            type: item.type || item.class || 'place',
          };
        });
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.warn('Nominatim geocoding failed, trying fallback:', err);
  }

  // 2. Fallback to Photon (Komoot)
  try {
    const fallbackUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=5&lang=default`;
    const res = await fetch(fallbackUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        return data.features.map((feat: any, idx: number) => {
          const props = feat.properties || {};
          const name = props.name || props.street || props.city || trimmed;
          const details = [
            props.name,
            props.street,
            props.city,
            props.state,
            props.country,
          ]
            .filter(Boolean)
            .join(', ');

          return {
            id: `photon-${props.osm_id || idx}`,
            name: name,
            displayName: details || name,
            lat: feat.geometry.coordinates[1],
            lng: feat.geometry.coordinates[0],
            type: props.type || 'place',
          };
        });
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.warn('Photon geocoding failed:', err);
  }

  return [];
}
