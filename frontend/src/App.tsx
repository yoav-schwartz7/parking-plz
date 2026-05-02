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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-2 flex items-center gap-3">
          <img src="/parking-plz-animated.gif" alt="Parking PLZ" className="h-11 w-11 object-contain" />
          <h1 className="text-3xl font-bold text-gray-900">Parking PLZ</h1>
        </div>
        <p className="mb-6 text-sm text-gray-500">Find the nearest Ahuzat HaHof parking lots in Tel Aviv</p>

        <SearchBar onSearch={handleSearch} loading={loading} />

        <div className="mt-6">
          {loading && (
            <p className="text-center text-sm text-gray-500">Searching for nearby lots...</p>
          )}
          {!loading && error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}
          {!loading && !error && searched && allResults.length === 0 && (
            <p className="text-center text-sm text-gray-500">No lots found.</p>
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
