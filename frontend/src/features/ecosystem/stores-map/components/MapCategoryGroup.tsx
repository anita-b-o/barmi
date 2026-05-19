import { memo } from 'react'
import type { MapExploreGroup, MapExploreItem } from '../mapExploreConfig'
import { MapIcon } from './MapIcons'

type MapCategoryGroupProps = {
  group: MapExploreGroup
  onSelectQuery: (query: string) => void
}

const MapCategoryItem = memo(function MapCategoryItem({ item, onSelectQuery }: { item: MapExploreItem; onSelectQuery: (query: string) => void }) {
  return (
    <button className="ecosystem-map-category__item" type="button" onClick={() => onSelectQuery(item.query)}>
      {item.label}
    </button>
  )
})

function MapCategoryGroupBase({ group, onSelectQuery }: MapCategoryGroupProps) {
  return (
    <section className="ecosystem-map-category" aria-label={group.title}>
      <button className="ecosystem-map-category__main" type="button" onClick={() => onSelectQuery(group.query)}>
        <span className="ecosystem-map-category__icon">
          <MapIcon name={group.icon} />
        </span>
        <span>{group.title}</span>
      </button>

      {group.items.length > 0 ? (
        <div className="ecosystem-map-category__items">
          {group.items.map((item) => (
            <MapCategoryItem key={item.id} item={item} onSelectQuery={onSelectQuery} />
          ))}
        </div>
      ) : null}

      {group.viewMoreHref ? (
        <button className="ecosystem-map-category__more" type="button" onClick={() => onSelectQuery(group.query)}>
          Ver más
        </button>
      ) : null}
    </section>
  )
}

export const MapCategoryGroup = memo(MapCategoryGroupBase)
