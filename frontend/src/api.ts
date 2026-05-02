import { clearToken, getToken } from './auth'

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

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

export async function login(password: string): Promise<string> {
  const resp = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!resp.ok) throw new Error('Incorrect password')
  const data = await resp.json()
  return data.token
}

export async function fetchParkingLots(params: SearchParams): Promise<ParkingResponse> {
  const qs = new URLSearchParams()

  if ('address' in params) {
    qs.set('address', params.address)
  } else {
    qs.set('lat', String(params.lat))
    qs.set('lng', String(params.lng))
  }
  qs.set('top_n', '87')

  const resp = await fetch(`${API_BASE}/api/parking?${qs}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })

  if (resp.status === 401) {
    clearToken()
    window.location.reload()
    throw new Error('Session expired')
  }
  if (!resp.ok) {
    const body = await resp.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed (${resp.status})`)
  }
  return resp.json()
}
