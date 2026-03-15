import Button from './Button'

type TabItem = {
  key: string
  label: string
}

type TabsProps = {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
}

export default function Tabs({ items, value, onChange }: TabsProps) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {items.map((item) => (
        <Button
          key={item.key}
          variant={item.key === value ? 'primary' : 'secondary'}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
