import { useState } from 'react'
import type { ParkingLot } from '../api'

const AVAILABILITY_BADGE: Record<string, { label: string; badgeClasses: string; borderClass: string }> = {
  פעיל: { label: 'פעיל', badgeClasses: 'bg-green-100 text-green-700 ring-1 ring-green-200', borderClass: 'border-l-green-400' },
  פנוי: { label: 'פנוי', badgeClasses: 'bg-green-100 text-green-700 ring-1 ring-green-200', borderClass: 'border-l-green-400' },
  מעט: { label: 'מעט', badgeClasses: 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200', borderClass: 'border-l-yellow-400' },
  מלא: { label: 'מלא', badgeClasses: 'bg-red-100 text-red-700 ring-1 ring-red-200', borderClass: 'border-l-red-400' },
}

const DEFAULT_BADGE = { label: null, badgeClasses: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200', borderClass: 'border-l-gray-300' }

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
      <a href={wazeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 transition hover:text-blue-700">
        <img src="https://www.waze.com/favicon.ico" alt="Waze" className="h-4 w-4" />
        Waze
      </a>
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 transition hover:text-blue-700">
        <img src="https://maps.google.com/favicon.ico" alt="Google Maps" className="h-4 w-4" />
        Google Maps
      </a>
    </div>
  )
}

function AvailabilityBadge({ status }: { status: string | null }) {
  const badge = status ? (AVAILABILITY_BADGE[status.trim()] ?? DEFAULT_BADGE) : DEFAULT_BADGE
  const label = badge.label ?? status ?? 'Unknown'

  return (
    <span dir="rtl" className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge.badgeClasses}`}>
      {label}
    </span>
  )
}

interface LotCardProps {
  lot: ParkingLot
}

export function LotCard({ lot }: LotCardProps) {
  const [tariffExpanded, setTariffExpanded] = useState(false)
  const badge = lot.availability ? (AVAILABILITY_BADGE[lot.availability.trim()] ?? DEFAULT_BADGE) : DEFAULT_BADGE

  return (
    <div className={`overflow-hidden rounded-2xl border-l-4 bg-white shadow-sm transition-shadow hover:shadow-md ${badge.borderClass}`}>
      <div className="flex flex-row-reverse items-start justify-between gap-4 p-4">
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-end gap-2">
            <span className="shrink-0 text-xs font-medium text-gray-400">{formatDistance(lot.distance_meters)}</span>
            <h2 dir="rtl" className="text-base font-bold text-gray-900">
              {lot.name}
            </h2>
          </div>
          {lot.address && (
            <>
              <p dir="rtl" className="text-sm text-gray-400">
                {lot.address}
              </p>
              <NavigationLinks address={lot.address} />
            </>
          )}
        </div>
        <AvailabilityBadge status={lot.availability} />
      </div>

      {lot.tariff_image_url && (
        <div className="border-t border-gray-50 bg-gray-50/50 p-3">
          <img
            src={lot.tariff_image_url}
            alt={`Tariff for ${lot.name}`}
            onClick={() => setTariffExpanded((v) => !v)}
            className={`cursor-pointer rounded-lg object-contain transition-all duration-200 ${
              tariffExpanded ? 'w-full' : 'h-16'
            }`}
          />
        </div>
      )}
    </div>
  )
}
