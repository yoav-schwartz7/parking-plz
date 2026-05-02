import { useState } from 'react'

interface SearchBarProps {
  onSearch: (params: { address: string } | { lat: number; lng: number }) => void
  loading: boolean
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [address, setAddress] = useState('')
  const [geoError, setGeoError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (address.trim()) onSearch({ address: address.trim() })
  }

  const handleGeolocate = () => {
    setGeoError(null)
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => onSearch({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError('Could not get your location. Please allow location access and try again.'),
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter an address in Tel Aviv..."
          disabled={loading}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95 disabled:opacity-40"
        >
          Search
        </button>
      </form>

      <button
        type="button"
        onClick={handleGeolocate}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 active:scale-95 disabled:opacity-50"
      >
        <span>📍</span> Use my location
      </button>

      {geoError && <p className="text-xs text-red-500">{geoError}</p>}
    </div>
  )
}
