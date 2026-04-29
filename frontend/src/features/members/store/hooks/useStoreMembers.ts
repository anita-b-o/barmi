import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { extractBackendErrorMessage } from '@/core/errors'
import { useAuth } from '@/core/auth'
import { getBrowserTenantContext } from '@/core/tenant'
import { storeMembersApi } from '../api'
import type {
  CreateStoreMemberPayload,
  StoreMemberRole,
  StoreMemberStatus,
  UpdateStoreMemberRolePayload,
  UpdateStoreMemberStatusPayload
} from '../types'

const STORE_MEMBERS_QUERY_KEY = ['store-members']

function mapStoreMembersError(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: unknown }).code)
    const tenant = getBrowserTenantContext()

    if (code === 'store_context_required') {
      return tenant.slug
        ? `No se pudo resolver el contexto STORE para ${tenant.host}.`
        : 'Store context required. Abrí el frontend con un host de tienda.'
    }
    if (code === 'store_not_found') return 'La store actual no existe.'
    if (code === 'member_email_required') return 'El email del miembro es obligatorio.'
    if (code === 'invalid_role') return 'El rol indicado no es válido.'
    if (code === 'invalid_status') return 'El estado indicado no es válido.'
    if (code === 'membership_not_found') return 'La membership no existe para la store actual.'
    if (code === 'member_already_exists') return 'Ya existe una membership activa para ese email.'
    if (code === 'cannot_assign_owner') return 'No tenés permiso para asignar el rol OWNER.'
    if (code === 'cannot_manage_owner') return 'No tenés permiso para administrar memberships OWNER.'
    if (code === 'cannot_remove_last_owner') return 'No se puede dejar la store sin un OWNER activo.'
    if (code === 'membership_already_in_status') return 'La membership ya tiene ese estado.'
    if (code === 'forbidden') return 'No tenés permisos para administrar miembros de esta store.'
  }

  return extractBackendErrorMessage(error, 'No se pudieron cargar los miembros.')
}

function isStoreRole(value: string | null | undefined): value is StoreMemberRole {
  return value === 'OWNER' || value === 'ADMIN' || value === 'STAFF'
}

export function useStoreMembers() {
  const { authRequest, me } = useAuth()
  const tenant = getBrowserTenantContext()
  const queryClient = useQueryClient()

  const membership = tenant.slug
    ? me?.memberships.stores.find((item) => item.storeSlug === tenant.slug)
    : me?.memberships.stores.find((item) => item.status === 'ACTIVE') ?? me?.memberships.stores[0] ?? null
  const actorRole = isStoreRole(membership?.role) ? membership.role : null
  const actorEmail = me?.email ?? null

  const membersQuery = useQuery({
    queryKey: STORE_MEMBERS_QUERY_KEY,
    queryFn: () => storeMembersApi.list(authRequest)
  })

  const createMember = useMutation({
    mutationFn: (payload: CreateStoreMemberPayload) => storeMembersApi.create(payload, authRequest),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STORE_MEMBERS_QUERY_KEY })
    }
  })

  const updateRole = useMutation({
    mutationFn: (payload: UpdateStoreMemberRolePayload) => storeMembersApi.updateRole(payload, authRequest),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STORE_MEMBERS_QUERY_KEY })
    }
  })

  const updateStatus = useMutation({
    mutationFn: (payload: UpdateStoreMemberStatusPayload) => storeMembersApi.updateStatus(payload, authRequest),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: STORE_MEMBERS_QUERY_KEY })
    }
  })

  const rows = membersQuery.data ?? []
  const activeOwners = rows.filter((row) => row.role === 'OWNER' && row.status === 'ACTIVE').length

  const canAssignRole = (currentRole: StoreMemberRole, currentStatus: StoreMemberStatus, nextRole: StoreMemberRole) => {
    if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') return false
    if (actorRole === 'ADMIN' && currentRole === 'OWNER') return false
    if (actorRole === 'ADMIN' && nextRole === 'OWNER') return false
    if (currentRole === nextRole) return false
    if (currentRole === 'OWNER' && currentStatus === 'ACTIVE' && nextRole !== 'OWNER' && activeOwners <= 1) return false
    return true
  }

  const canToggleStatus = (currentRole: StoreMemberRole, currentStatus: StoreMemberStatus, nextStatus: StoreMemberStatus) => {
    if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') return false
    if (currentStatus === nextStatus) return false
    if (actorRole === 'ADMIN' && currentRole === 'OWNER') return false
    if (currentRole === 'OWNER' && currentStatus === 'ACTIVE' && nextStatus !== 'ACTIVE' && activeOwners <= 1) return false
    return true
  }

  return {
    rows,
    actor: {
      email: actorEmail,
      role: actorRole
    },
    tenant,
    activeOwners,
    loading: membersQuery.isLoading,
    fetching: membersQuery.isFetching,
    error: membersQuery.error ? mapStoreMembersError(membersQuery.error) : null,
    createError: createMember.error ? mapStoreMembersError(createMember.error) : null,
    updateRoleError: updateRole.error ? mapStoreMembersError(updateRole.error) : null,
    updateStatusError: updateStatus.error ? mapStoreMembersError(updateStatus.error) : null,
    isCreating: createMember.isPending,
    isUpdatingRole: updateRole.isPending,
    isUpdatingStatus: updateStatus.isPending,
    createMember: (payload: CreateStoreMemberPayload) => createMember.mutateAsync(payload),
    updateRole: (payload: UpdateStoreMemberRolePayload) => updateRole.mutateAsync(payload),
    updateStatus: (payload: UpdateStoreMemberStatusPayload) => updateStatus.mutateAsync(payload),
    refetch: membersQuery.refetch,
    supportsRoleOption: (role: StoreMemberRole) => actorRole === 'OWNER' || role !== 'OWNER',
    canAssignRole,
    canToggleStatus
  }
}
