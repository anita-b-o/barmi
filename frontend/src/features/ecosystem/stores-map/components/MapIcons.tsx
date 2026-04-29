type MapIconProps = {
  name: 'near' | 'fashion' | 'food' | 'bazaar' | 'hotel' | 'search'
}

export function MapIcon({ name }: MapIconProps) {
  if (name === 'near') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M18.5 18.5 28 28" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    )
  }

  if (name === 'fashion') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M10 10 16 5l6 5v13H10z" />
        <path d="M10 23H5l5-13M22 23h5l-5-13" />
      </svg>
    )
  }

  if (name === 'food') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M7 4v24M4 4v7c0 3 6 3 6 0V4M20 5c4 0 7 3 7 7s-3 7-7 7-7-3-7-7 3-7 7-7Z" />
        <path d="M20 19v9" />
      </svg>
    )
  }

  if (name === 'bazaar') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8 11h16l-2 16H10z" />
        <path d="M12 11c0-4 8-4 8 0M5 11h22" />
      </svg>
    )
  }

  if (name === 'hotel') {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6 28V6h13v22M19 14h7v14M10 10h3M10 15h3M10 20h3M4 28h24" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </svg>
  )
}
