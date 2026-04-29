import type { FormEvent } from 'react'
import { SearchIcon } from './icons'

type SearchBarProps = {
  query: string
  onQueryChange: (query: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function SearchBar({ query, onQueryChange, onSubmit }: SearchBarProps) {
  return (
    <form className="ecosystem-topbar__search" role="search" onSubmit={onSubmit}>
      <label className="ecosystem-topbar__sr-only" htmlFor="ecosystem-topbar-search">
        Buscar en Barmi
      </label>
      <input
        id="ecosystem-topbar-search"
        className="ecosystem-topbar__search-input"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscá tiendas, productos y demás"
        aria-label="Buscar tiendas, productos y demás"
      />
      <button className="ecosystem-topbar__search-button" type="submit" aria-label="Buscar">
        <SearchIcon size={20} />
      </button>
    </form>
  )
}
