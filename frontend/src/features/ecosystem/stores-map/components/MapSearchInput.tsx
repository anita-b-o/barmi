import { FormEvent, memo, useEffect, useRef, useState } from 'react'
import { MapIcon } from './MapIcons'

type MapSearchInputProps = {
  value: string
  placeholder?: string
  onSearch: (value: string) => void
}

const SEARCH_DEBOUNCE_MS = 250

function MapSearchInputBase({ value, placeholder = 'buscá en el mapa', onSearch }: MapSearchInputProps) {
  const [draft, setDraft] = useState(value)
  const debounceRef = useRef<number | null>(null)

  const clearPendingSearch = () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }

  useEffect(() => {
    clearPendingSearch()
    setDraft(value)

    return clearPendingSearch
  }, [value])

  useEffect(() => clearPendingSearch, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearPendingSearch()
    onSearch(draft.trim())
  }

  return (
    <form className="ecosystem-map-search" onSubmit={handleSubmit}>
      <input
        value={draft}
        onChange={(event) => {
          const nextValue = event.target.value
          setDraft(nextValue)
          clearPendingSearch()
          debounceRef.current = window.setTimeout(() => {
            debounceRef.current = null
            onSearch(nextValue)
          }, SEARCH_DEBOUNCE_MS)
        }}
        placeholder={placeholder}
        aria-label="Buscar tiendas en mapa"
      />
      <button type="submit" aria-label="Buscar en el mapa">
        <MapIcon name="search" />
      </button>
    </form>
  )
}

export const MapSearchInput = memo(MapSearchInputBase)
