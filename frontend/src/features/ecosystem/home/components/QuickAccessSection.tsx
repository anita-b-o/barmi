import type { QuickAccessItem } from '../config'
import { QuickAccessGrid } from './QuickAccessGrid'

type QuickAccessSectionProps = {
  items: QuickAccessItem[]
}

export function QuickAccessSection({ items }: QuickAccessSectionProps) {
  return (
    <section className="ecosystem-home-hero__quick-section">
      <div className="ecosystem-home-hero__quick-container">
        <QuickAccessGrid items={items} />
      </div>
    </section>
  )
}
