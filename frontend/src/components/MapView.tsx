import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import type { LatLng, ParkingLot } from '../api'

const AVAILABILITY_COLORS: Record<string, string> = {
  פעיל: '#16a34a',
  פנוי: '#16a34a',
  מעט: '#ca8a04',
  מלא: '#dc2626',
}

function getAvailabilityColor(availability: string | null): string {
  return (availability && AVAILABILITY_COLORS[availability.trim()]) ?? '#9ca3af'
}

function formatDistance(meters: number | null): string {
  if (meters === null) return ''
  if (meters < 1000) return `${meters} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function lotIcon(availability: string | null) {
  const color = getAvailabilityColor(availability)
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.5)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  })
}

const userIcon = L.divIcon({
  className: '',
  html: `
    <div style="
      width:26px;height:26px;border-radius:50%;
      background:#2563eb;border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
    ">
      <div style="width:8px;height:8px;border-radius:50%;background:white"></div>
    </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -14],
})

interface MapViewProps {
  lots: ParkingLot[]
  userLocation: LatLng
}

export function MapView({ lots, userLocation }: MapViewProps) {
  return (
    <MapContainer
      center={[userLocation.lat, userLocation.lng]}
      zoom={14}
      className="h-[60vh] w-full rounded-xl border border-gray-200"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
        <Popup>Your location</Popup>
      </Marker>

      {lots.map((lot) =>
        lot.coordinates ? (
          <Marker
            key={lot.name}
            position={[lot.coordinates.lat, lot.coordinates.lng]}
            icon={lotIcon(lot.availability)}
          >
            <Popup>
              <div dir="rtl" style={{ textAlign: 'right', minWidth: '140px' }}>
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>{lot.name}</p>
                <p style={{ color: getAvailabilityColor(lot.availability), marginBottom: '2px', fontSize: '13px' }}>
                  {lot.availability ?? 'Unknown'}
                </p>
                {lot.distance_meters !== null && (
                  <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '6px' }}>
                    {formatDistance(lot.distance_meters)}
                  </p>
                )}
                {lot.address && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <a
                      href={`https://waze.com/ul?q=${encodeURIComponent(lot.address)}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src="https://www.waze.com/favicon.ico" alt="Waze" style={{ width: '18px', height: '18px' }} />
                    </a>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lot.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img src="https://maps.google.com/favicon.ico" alt="Google Maps" style={{ width: '18px', height: '18px' }} />
                    </a>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ) : null,
      )}
    </MapContainer>
  )
}
