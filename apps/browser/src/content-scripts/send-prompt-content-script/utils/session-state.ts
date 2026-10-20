export let session_state: {
  client_id: string
  raw_instructions?: string
  inject_button?: boolean
} | null = null

export const set_session_state = (state: typeof session_state) => {
  session_state = state
}
