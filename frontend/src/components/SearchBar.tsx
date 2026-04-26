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
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !address.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Search
        </button>
      </form>

      <button
        type="button"
        onClick={handleGeolocate}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        <span>📍</span> Use my location
      </button>

      {geoError && <p className="text-sm text-red-600">{geoError}</p>}
    </div>
  )
}
