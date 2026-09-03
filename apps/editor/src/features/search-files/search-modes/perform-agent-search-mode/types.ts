export type CodingAgent = {
  id: string
  label: string
  cmd: string
  is_installed: () => boolean
  get_documentation_url: () => string
  get_args: (query: string) => string[]
  parse_stream_line?: (
    parsed: any,
    report_progress: (msg: string) => void
  ) => { output?: string } | undefined
  parse_final_output?: (
    parsed: any,
    current_output: string
  ) => string | undefined
}
