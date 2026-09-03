export interface CodingAgent {
  id: string
  label: string
  cmd: string
  executable: string
  is_installed: () => boolean
  get_documentation_url: () => string
  get_args: (query: string) => string[]
  parse_stream_line?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsed: any,
    report_progress: (msg: string) => void
  ) => { output?: string } | undefined
  parse_final_output?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsed: any,
    current_output: string
  ) => string | undefined
}
