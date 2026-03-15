import React, { useState } from 'react'
import { Button, Input, Modal, Select } from '../../../../design-system/components'
import type { CreateZonePayload } from '../types'

interface CreateZoneModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (zone: CreateZonePayload) => void
}

const CreateZoneModal: React.FC<CreateZoneModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [type, setType] = useState<'EXACT' | 'RANGE'>('EXACT')
  const [postalCode, setPostalCode] = useState('')
  const [rangeStart, setRangeStart] = useState('0')
  const [rangeEnd, setRangeEnd] = useState('0')
  const [costAmount, setCostAmount] = useState('0')
  const [currency, setCurrency] = useState('ARS')

  const handleSubmit = () => {
    const zone: CreateZonePayload = type === 'EXACT' ? {
      type,
      postalCode,
      costAmount: Number(costAmount),
      currency,
    } : {
      type,
      rangeStart: Number(rangeStart),
      rangeEnd: Number(rangeEnd),
      costAmount: Number(costAmount),
      currency,
    }
    onCreate(zone)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Shipping Zone">
      <Select
        value={type}
        onChange={(event) => setType(event.target.value as 'EXACT' | 'RANGE')}
        options={[{ value: 'EXACT', label: 'Exact' }, { value: 'RANGE', label: 'Range' }]}
      />
      {type === 'EXACT' ? (
        <Input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder="Postal Code" />
      ) : (
        <>
          <Input value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} placeholder="Range Start" type="number" />
          <Input value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} placeholder="Range End" type="number" />
        </>
      )}
      <Input value={costAmount} onChange={(event) => setCostAmount(event.target.value)} placeholder="Cost Amount" type="number" />
      <Input value={currency} onChange={(event) => setCurrency(event.target.value)} placeholder="Currency" />
      <Button onClick={handleSubmit}>Create Zone</Button>
    </Modal>
  )
}

export default CreateZoneModal
