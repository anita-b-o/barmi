type StoreSelectionCandidate = {
  id: string
}

type StoresMapSelectionInput = {
  stores: StoreSelectionCandidate[]
  selectedStoreId: string | null
  isFilteredMode: boolean
}

export function getValidStoresMapSelection({
  stores,
  selectedStoreId,
  isFilteredMode
}: StoresMapSelectionInput) {
  if (selectedStoreId && stores.some((store) => store.id === selectedStoreId)) {
    return selectedStoreId
  }

  if (isFilteredMode) {
    return stores[0]?.id ?? null
  }

  return null
}
