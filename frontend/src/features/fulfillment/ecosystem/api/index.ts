import { ecosystemAdminAdapter } from '../../../../api/adapters/ecosystemAdminAdapter'

export const ecosystemFulfillmentApi = {
  list: ecosystemAdminAdapter.listFulfillments,
  getById: ecosystemAdminAdapter.getFulfillment,
  create: ecosystemAdminAdapter.createFulfillment,
  updateStatus: ecosystemAdminAdapter.updateFulfillmentStatus
}
