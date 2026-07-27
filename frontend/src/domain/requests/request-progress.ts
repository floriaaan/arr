export interface RequestProgress {
  percentage: number
  sizeLeftBytes: number
  eta: string | null
  stepLabel: string
}
