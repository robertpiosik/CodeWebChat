export interface Checkpoint {
  timestamp: number
  title: string
  description?: string
  is_temporary?: boolean
  starred?: boolean
}
