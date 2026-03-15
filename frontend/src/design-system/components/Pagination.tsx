import Button from './Button'

type PaginationProps = {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Button variant="secondary" onClick={() => onChange(page - 1)} disabled={page <= 0}>
        Anterior
      </Button>
      <span>
        Página {page + 1} de {Math.max(totalPages, 1)}
      </span>
      <Button variant="secondary" onClick={() => onChange(page + 1)} disabled={page >= totalPages - 1}>
        Siguiente
      </Button>
    </div>
  )
}
