import { useState } from 'react'
import type { ParkingLot } from '../api'

const AVAILABILITY_BADGE: Record<string, { label: string; classes: string }> = {
  פעיל: { label: 'פעיל', classes: 'bg-green-100 text-green-800' },
  פנוי: { label: 'פנוי', classes: 'bg-green-100 text-green-800' },
  מעט: { label: 'מעט', classes: 'bg-yellow-100 text-yellow-800' },
  מלא: { label: 'מלא', classes: 'bg-red-100 text-red-800' },
}

function formatDistance(meters: number | null): string {
  if (meters === null) return 'Distance unknown'
  if (meters < 1000) return `${meters} m`
  return `${(meters / 1000).toFixed(1)} km`
}

function NavigationLinks({ address }: { address: string }) {
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  return (
    <div className="flex justify-end gap-3">
      <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
        <img src="https://www.waze.com/favicon.ico" alt="Waze" className="h-4 w-4" />
        Waze
      </a>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
        <img src="https://maps.google.com/favicon.ico" alt="Google Maps" className="h-4 w-4" />
        Google Maps
      </a>
    </div>
  )
}

function AvailabilityBadge({ status }: { status: string | null }) {
  const badge = status ? AVAILABILITY_BADGE[status.trim()] : null
  const classes = badge?.classes ?? 'bg-gray-100 text-gray-600'
  const label = badge?.label ?? status ?? 'Unknown'

  return (
    <span dir="rtl" className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}

interface LotCardProps {
  lot: ParkingLot
}

export function LotCard({ lot }: LotCardProps) {
  const [tariffExpanded, setTariffExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-row-reverse items-start justify-between gap-4 p-4">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-end gap-2">
            <span className="shrink-0 text-sm text-gray-500">{formatDistance(lot.distance_meters)}</span>
            <h2 dir="rtl" className="text-lg font-semibold text-gray-900">
              {lot.name}
            </h2>
          </div>
          {lot.address && (
            <>
              <p dir="rtl" className="text-sm text-gray-500">
                {lot.address}
              </p>
              <NavigationLinks address={lot.address} />
            </>
          )}
        </div>
        <AvailabilityBadge status={lot.availability} />
      </div>

      {lot.tariff_image_url && (
        <div className="border-t border-gray-100 p-3">
          <img
            src={lot.tariff_image_url}
            alt={`Tariff for ${lot.name}`}
            onClick={() => setTariffExpanded((v) => !v)}
            className={`cursor-pointer rounded object-contain transition-all duration-200 ${
              tariffExpanded ? 'w-full' : 'h-16'
            }`}
          />
        </div>
      )}
    </div>
  )
}
