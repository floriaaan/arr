export type ApprovalPolicy = 'auto' | 'manual'

export interface RequestApprovalSettingsDto {
  moviePolicy: ApprovalPolicy
  seriesPolicy: ApprovalPolicy
  albumPolicy: ApprovalPolicy
}
