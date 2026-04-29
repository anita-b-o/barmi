import { FormEvent, useEffect, useState } from 'react'
import { MapIcon } from './MapIcons'

type MapSearchInputProps = {
  value: string
  placeholder?: string
  onSearch: (value: string) => void
}

export function MapSearchInput({ value, placeholder = 'buscá en el mapa', onSearch }: MapSearchInputProps) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearch(draft.trim())
  }

  return (
    <form className="ecosystem-map-search" onSubmit={handleSubmit}>
      <input
        value={draft}
        onChange={(event) => {
          const nextValue = event.target.value
          setDraft(nextValue)
          onSearch(nextValue)
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
