export type AuthLoginReq = {
  email: string
  password: string
}

export type AuthRefreshReq = {
  refreshToken: string
}

export type AuthTokenResponse = {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresAt: string
}

export type StoreMembership = {
  storeId: string
  storeSlug: string
  role: string
  status: string
}

export type EcosystemMembership = {
  ecosystemId: string
  ecosystemSlug: string
  role: string
  status: string
}

export type AuthMemberships = {
  stores: StoreMembership[]
  ecosystems: EcosystemMembership[]
}

export type AuthMe = {
  userId: string
  email: string
  memberships: AuthMemberships
}
