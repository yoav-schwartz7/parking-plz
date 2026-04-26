import type { ParkingLot } from '../api'
import { LotCard } from './LotCard'

interface LotListProps {
  lots: ParkingLot[]
}

export function LotList({ lots }: LotListProps) {
  return (
    <div className="flex flex-col gap-4">
      {lots.map((lot) => (
        <LotCard key={lot.name} lot={lot} />
      ))}
    </div>
  )
}
