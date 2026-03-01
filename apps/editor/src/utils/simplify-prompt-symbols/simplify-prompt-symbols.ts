export const simplify_prompt_symbols = (params: { prompt: string }): string => {
  if (!params.prompt) return params.prompt

  let simplified = params.prompt

  simplified = simplified.replace(
    /<fragment path="[^"]+"(?: [^>]+)?>[\s\S]*?<\/fragment>/g,
    '[Fragment]'
  )
  simplified = simplified.replace(/#Selection/g, '[Selection]')
  simplified = simplified.replace(/#Changes\([^)]+\)/g, '[Changes]')
  simplified = simplified.replace(
    /#SavedContext\((?:WorkspaceState|JSON) "(?:\\.|[^"\\])*"\)/g,
    '[Saved context]'
  )
  simplified = simplified.replace(
    /#Commit\([^:]+:[^\s"]+ "(?:\\.|[^"\\])*"\)/g,
    '[Commit]'
  )
  simplified = simplified.replace(
    /#ContextAtCommit\([^:]+:[^\s"]+ "(?:\\.|[^"\\])*"\)/g,
    '[Context at commit]'
  )
  simplified = simplified.replace(/#Skill\([^)]+\)/g, '[Skill]')
  simplified = simplified.replace(/#Image\([a-fA-F0-9]+\)/g, '[Image]')
  simplified = simplified.replace(
    /#PastedText\([a-fA-F0-9]+:\d+\)/g,
    '[Pasted text]'
  )
  simplified = simplified.replace(/#Website\([^)]+\)/g, '[Website]')

  return simplified
}
