import {
  ecosystemHomeBannerItems,
  ecosystemHomeQuickAccessItems
} from '../config'
import { HeroBanner } from './HeroBanner'
import { QuickAccessSection } from './QuickAccessSection'
import './EcosystemHomeHeroSection.css'

export function EcosystemHomeHeroSection() {
  return (
    <section className="ecosystem-home-hero" aria-label="Inicio del ecosystem">
      <HeroBanner items={ecosystemHomeBannerItems} />
      <QuickAccessSection items={ecosystemHomeQuickAccessItems} />
    </section>
  )
}
