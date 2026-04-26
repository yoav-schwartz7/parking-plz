export interface ParkingLot {
  name: string
  address: string | null
  distance_meters: number | null
  availability: string | null
  availability_updated_at: string | null
  tariff_image_url: string | null
  coordinates: { lat: number; lng: number } | null
}

export interface LatLng {
  lat: number
  lng: number
}

export interface ParkingResponse {
  user_location: LatLng
  lots: ParkingLot[]
}

type SearchParams =
  | { address: string }
  | { lat: number; lng: number }

export async function fetchParkingLots(params: SearchParams): Promise<ParkingResponse> {
  const qs = new URLSearchParams()

  if ('address' in params) {
    qs.set('address', params.address)
  } else {
    qs.set('lat', String(params.lat))
    qs.set('lng', String(params.lng))
  }
  qs.set('top_n', '87')

  const resp = await fetch(`/api/parking?${qs}`)
  if (!resp.ok) {
    const body = await resp.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed (${resp.status})`)
  }
  return resp.json()
}
