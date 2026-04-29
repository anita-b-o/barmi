import { SearchIcon, MenuIcon } from './icons'

type MobileTopbarActionsProps = {
  menuOpen: boolean
  onSearch: () => void
  onToggleMenu: () => void
}

export function MobileTopbarActions({ menuOpen, onSearch, onToggleMenu }: MobileTopbarActionsProps) {
  return (
    <div className="ecosystem-topbar__mobile-actions">
      <button className="ecosystem-topbar__icon-button" type="button" aria-label="Buscar" onClick={onSearch}>
        <SearchIcon size={48} />
      </button>
      <button
        className="ecosystem-topbar__icon-button"
        type="button"
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuOpen}
        aria-controls="ecosystem-topbar-mobile-menu"
        onClick={onToggleMenu}
      >
        <MenuIcon />
      </button>
    </div>
  )
}
