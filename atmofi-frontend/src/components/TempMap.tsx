// TempMap.tsx
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

const markerIcon = new L.Icon({
  iconUrl: 'https://chart.googleapis.com/chart?chst=d_map_pin_icon&chld=location|ff0000',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});

interface TempMapProps {
  data: any;
  onLocationChange: (lat: number, lon: number) => void;
  lat: number;
  lon: number;
}

// This hook updates the map center when lat/lon props change
function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lon],16 );
  }, [lat, lon, map]);

  return null;
}

// This allows clicking on the map to update the lat/lon
function LocationFinder({ onLocationChange }: { onLocationChange: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function TempMap({ data, onLocationChange, lat, lon }: TempMapProps) {
  const validLat = typeof lat === 'number' ? lat : 1.35;
  const validLon = typeof lon === 'number' ? lon : 103.82;

  // Don’t render map if invalid coordinates
  if (!isFinite(validLat) || !isFinite(validLon)) {
    return <p>Loading map…</p>;
  }

  return (
    <MapContainer
      center={[validLat, validLon]}
      zoom={11}
      scrollWheelZoom={true}
      style={{ height: '400px', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <RecenterMap lat={validLat} lon={validLon} />
      <LocationFinder onLocationChange={onLocationChange} />

      <Marker position={[validLat, validLon]} icon={markerIcon}>
        <Popup>
          <div>
            <h4>Weather Summary</h4>
            {data?.temperature_2m_max?.length ? (
              <ul>
                {data.temperature_2m_max.map((temp: number, idx: number) => (
                  <li key={idx}>Day {idx + 1}: {temp} °C</li>
                ))}
              </ul>
            ) : (
              <p>No data available.</p>
            )}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
