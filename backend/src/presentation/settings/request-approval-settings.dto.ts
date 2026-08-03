import type { RequestApprovalSettings } from '#domain/requests/request-approval-settings.aggregate'

export interface RequestApprovalSettingsDto {
  moviePolicy: 'auto' | 'manual'
  seriesPolicy: 'auto' | 'manual'
  albumPolicy: 'auto' | 'manual'
}

export function toRequestApprovalSettingsDto(
  settings: RequestApprovalSettings,
): RequestApprovalSettingsDto {
  return {
    moviePolicy: settings.moviePolicy,
    seriesPolicy: settings.seriesPolicy,
    albumPolicy: settings.albumPolicy,
  }
}
