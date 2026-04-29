export function SearchIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M15.7 15.7L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function CartIcon({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.2 4.5H5.4L7.6 15.1C7.7 15.6 8.2 16 8.7 16H17.6C18.1 16 18.6 15.6 18.7 15.1L20.5 7.8H6.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="19.2" r="1.35" fill="currentColor" />
      <circle cx="17" cy="19.2" r="1.35" fill="currentColor" />
    </svg>
  )
}

export function MenuIcon({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 38 38" fill="none" aria-hidden="true">
      <path d="M7 10H31" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M7 19H31" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M7 28H31" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  )
}
