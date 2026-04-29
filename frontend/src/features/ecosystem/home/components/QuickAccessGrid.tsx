import type { QuickAccessItem } from '../config'
import { QuickAccessCard } from './QuickAccessCard'

type QuickAccessGridProps = {
  items: QuickAccessItem[]
}

export function QuickAccessGrid({ items }: QuickAccessGridProps) {
  return (
    <div className="ecosystem-home-hero__quick-grid" aria-label="Accesos rápidos del ecosystem">
      {items.map((item) => (
        <QuickAccessCard key={item.id} item={item} />
      ))}
    </div>
  )
}
