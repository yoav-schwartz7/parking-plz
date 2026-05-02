import { useState } from 'react'
import { fetchParkingLots } from './api'
import type { LatLng, ParkingLot } from './api'
import { AuthGate } from './components/AuthGate'
import { SearchBar } from './components/SearchBar'
import { LotList } from './components/LotList'
import { FilterBar } from './components/FilterBar'
import { MapView } from './components/MapView'
import type { DisplayCount, ViewMode } from './components/FilterBar'

export default function App() {
  const [allResults, setAllResults] = useState<ParkingLot[]>([])
  const [userLocation, setUserLocation] = useState<LatLng | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)
  const [liveApiAvailable, setLiveApiAvailable] = useState(true)
  const [displayCount, setDisplayCount] = useState<DisplayCount>(5)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const handleSearch = async (params: { address: string } | { lat: number; lng: number }) => {
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const data = await fetchParkingLots(params)
      setAllResults(data.lots)
      setUserLocation(data.user_location)
      setLiveApiAvailable(data.live_api_available)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setAllResults([])
      setUserLocation(null)
    } finally {
      setLoading(false)
    }
  }

  const filtered = showAvailableOnly
    ? allResults.filter((lot) => lot.availability?.trim() !== 'מלא')
    : allResults

  const displayed = displayCount === 'all' ? filtered : filtered.slice(0, displayCount)

  return (
    <AuthGate>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="mx-auto max-w-2xl px-4 py-10">

          {/* Header */}
          <div className="mb-8">
            <div className="mb-1 flex items-center gap-3">
              <img src="/parking-plz-animated.gif" alt="Parking PLZ" className="h-12 w-12 object-contain drop-shadow-sm" />
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">Parking PLZ</h1>
            </div>
            <p className="ml-1 text-sm text-gray-500">Find the nearest Ahuzat HaHof parking lots in Tel Aviv</p>
          </div>

          {/* Search card */}
          <div className="mb-6 rounded-2xl border border-white/80 bg-white/90 p-5 shadow-md backdrop-blur-sm">
            <SearchBar onSearch={handleSearch} loading={loading} />
          </div>

          {/* Results */}
          <div>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500" />
                Searching for nearby lots...
              </div>
            )}
            {!loading && error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
                {error}
              </div>
            )}
            {!loading && !error && searched && allResults.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-400">No lots found.</p>
            )}
            {!loading && !liveApiAvailable && (
              <p className="mb-3 text-center text-xs text-red-500">
                Live availability data is temporarily unavailable. Try again in a few seconds.
              </p>
            )}
            {!loading && allResults.length > 0 && (
              <>
                <FilterBar
                  displayCount={displayCount}
                  onDisplayCountChange={setDisplayCount}
                  showAvailableOnly={showAvailableOnly}
                  onShowAvailableOnlyChange={setShowAvailableOnly}
                  totalCount={allResults.length}
                  filteredCount={filtered.length}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />
                {viewMode === 'list' ? (
                  <LotList lots={displayed} />
                ) : (
                  userLocation && <MapView lots={displayed} userLocation={userLocation} />
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </AuthGate>
  )
}
