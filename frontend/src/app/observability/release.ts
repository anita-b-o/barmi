import { appConfig } from '@/app/config/env'

export const releaseMetadata = {
  app: appConfig.appName,
  env: appConfig.appEnv,
  version: appConfig.appVersion,
  commitSha: appConfig.appCommitSha,
  buildTimestamp: appConfig.appBuildTimestamp,
  releaseId: appConfig.appReleaseId
} as const

export type ReleaseMetadata = typeof releaseMetadata
