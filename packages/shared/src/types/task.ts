export type Task = {
  text: string
  is_checked: boolean
  created_at: number
  is_collapsed?: boolean
  children?: Task[]
}