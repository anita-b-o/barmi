export type StoreMemberRole = 'OWNER' | 'ADMIN' | 'STAFF'
export type StoreMemberStatus = 'ACTIVE' | 'INACTIVE'

export type StoreMemberRow = {
  memberId: string
  storeId: string
  storeSlug: string
  memberEmail: string
  role: StoreMemberRole
  status: StoreMemberStatus
  createdAt: string
}

export type CreateStoreMemberPayload = {
  memberEmail: string
  role: StoreMemberRole
}

export type UpdateStoreMemberRolePayload = {
  memberId: string
  role: StoreMemberRole
}

export type UpdateStoreMemberStatusPayload = {
  memberId: string
  status: StoreMemberStatus
}

export type StoreMembersActor = {
  email: string | null
  role: StoreMemberRole | null
}
