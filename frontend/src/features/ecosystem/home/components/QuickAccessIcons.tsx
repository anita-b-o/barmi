import type { QuickAccessIcon } from '../config'

type QuickAccessIconProps = {
  icon: QuickAccessIcon
}

function MapQuickAccessIcon() {
  return (
    <svg viewBox="0 0 92 92" fill="none" aria-hidden="true">
      <path d="M22 12V78" stroke="currentColor" strokeWidth="2" />
      <path d="M45 12V78" stroke="currentColor" strokeWidth="2" />
      <path d="M68 12V78" stroke="currentColor" strokeWidth="2" />
      <path d="M12 24H80" stroke="currentColor" strokeWidth="2" />
      <path d="M12 46H80" stroke="currentColor" strokeWidth="2" />
      <path d="M12 68H80" stroke="currentColor" strokeWidth="2" />
      <path d="M22 72L68 26" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <circle cx="70" cy="24" r="14" fill="#e9edf4" stroke="currentColor" strokeWidth="3" />
      <rect x="12" y="62" width="18" height="12" rx="2" fill="#e9edf4" stroke="currentColor" strokeWidth="2" />
      <circle cx="35" cy="18" r="3" fill="currentColor" />
      <circle cx="63" cy="49" r="3" fill="currentColor" />
    </svg>
  )
}

function StoresQuickAccessIcon() {
  return (
    <svg viewBox="0 0 92 92" fill="none" aria-hidden="true">
      <path d="M18 38H74V76H18V38Z" fill="currentColor" />
      <path d="M16 30H76L70 42H22L16 30Z" fill="#e9edf4" stroke="currentColor" strokeWidth="2" />
      <path d="M22 42C22 48 31 48 31 42" stroke="#e9edf4" strokeWidth="2" />
      <path d="M31 42C31 48 40 48 40 42" stroke="#e9edf4" strokeWidth="2" />
      <path d="M40 42C40 48 49 48 49 42" stroke="#e9edf4" strokeWidth="2" />
      <path d="M49 42C49 48 58 48 58 42" stroke="#e9edf4" strokeWidth="2" />
      <path d="M58 42C58 48 67 48 67 42" stroke="#e9edf4" strokeWidth="2" />
      <path d="M50 50H66V76H50V50Z" fill="#e9edf4" stroke="#e9edf4" strokeWidth="2" />
      <path d="M28 58L31 62L36 54" stroke="#e9edf4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ProductsQuickAccessIcon() {
  return (
    <svg viewBox="0 0 92 92" fill="none" aria-hidden="true">
      <path d="M16 72L24 26H68L76 72H16Z" fill="#e9edf4" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M26 72L32 26" stroke="currentColor" strokeWidth="3" />
      <path d="M40 26C40 15 52 15 52 26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M30 26C30 11 62 11 62 26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 42L53 53L65 54L56 62L59 74L48 68L37 74L40 62L31 54L43 53L48 42Z" fill="#e9edf4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

function CategoriesQuickAccessIcon() {
  return (
    <svg viewBox="0 0 92 92" fill="none" aria-hidden="true">
      <rect x="18" y="16" width="24" height="24" rx="5" fill="#e9edf4" stroke="currentColor" strokeWidth="3" />
      <rect x="52" y="16" width="24" height="24" rx="5" fill="#e9edf4" stroke="currentColor" strokeWidth="3" />
      <rect x="18" y="52" width="24" height="24" rx="5" fill="#e9edf4" stroke="currentColor" strokeWidth="3" />
      <rect x="52" y="52" width="24" height="24" rx="5" fill="currentColor" />
      <path d="M64 57L67 64L75 65L69 70L71 78L64 74L57 78L59 70L53 65L61 64L64 57Z" fill="#e9edf4" />
    </svg>
  )
}

export function QuickAccessIconGraphic({ icon }: QuickAccessIconProps) {
  switch (icon) {
    case 'map':
      return <MapQuickAccessIcon />
    case 'stores':
      return <StoresQuickAccessIcon />
    case 'products':
      return <ProductsQuickAccessIcon />
    case 'categories':
      return <CategoriesQuickAccessIcon />
    default:
      return null
  }
}
