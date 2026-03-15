import type { EcosystemOrderDetail, EcosystemOrderStatus, EcosystemOrdersPage } from '../../../../api/contracts/v1/ecosystem'

export type EcosystemOrdersFilterStatus = '' | EcosystemOrderStatus

export type EcosystemOrdersListState = {
  page: number
  status: EcosystemOrdersFilterStatus
}

export type EcosystemOrdersListResult = EcosystemOrdersPage
export type EcosystemOrderDetailResult = EcosystemOrderDetail
