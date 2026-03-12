export type TaskFile = {
  path: string
  tokens?: number
}

export type Task = {
  text: string
  is_checked: boolean
  created_at: number
  is_collapsed?: boolean
  children?: Task[]
  files?: TaskFile[]
  commit_message?: string
}
