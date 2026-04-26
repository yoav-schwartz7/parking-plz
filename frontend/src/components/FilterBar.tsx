const COUNT_OPTIONS = [5, 10, 15, 20, 'all'] as const
export type DisplayCount = (typeof COUNT_OPTIONS)[number]

interface FilterBarProps {
  displayCount: DisplayCount
  onDisplayCountChange: (count: DisplayCount) => void
  showAvailableOnly: boolean
  onShowAvailableOnlyChange: (value: boolean) => void
  totalCount: number
  filteredCount: number
}

export function FilterBar({
  displayCount,
  onDisplayCountChange,
  showAvailableOnly,
  onShowAvailableOnlyChange,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
        {COUNT_OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => onDisplayCountChange(option)}
            className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              displayCount === option
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {option === 'all' ? 'All' : option}
          </button>
        ))}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={showAvailableOnly}
          onChange={(e) => onShowAvailableOnlyChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 accent-blue-600"
        />
        Available only
        <span className="text-gray-400">({filteredCount}/{totalCount})</span>
      </label>
    </div>
  )
}
