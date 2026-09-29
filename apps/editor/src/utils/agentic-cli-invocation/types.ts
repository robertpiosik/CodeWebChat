export type CodingAgent = {
  id: string
  label: string
  cmd: string
  is_installed: () => boolean
  get_documentation_url: () => string
  get_isolated_dir_args: (params: { cwd: string }) => string[]
  get_integrated_terminal_args?: (params: { cwd: string }) => string[]
  get_post_integrated_terminal_args?: () => string[]
  get_prompt_file_args?: (temp_prompt_path: string) => string[]
  parse_stream_line?: (
    parsed: any,
    report_progress: (msg: string) => void
  ) => { output?: string } | undefined
  parse_final_output?: (
    parsed: any,
    current_output: string
  ) => string | undefined
}
