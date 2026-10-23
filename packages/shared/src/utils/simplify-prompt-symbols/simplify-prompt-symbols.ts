export const simplify_prompt_symbols = (params: { prompt: string }): string => {
  if (!params.prompt) return params.prompt

  let simplified = params.prompt

  simplified = simplified.replace(
    /#Fragment\(.+?:\d+:\d+-\d+:\d+\)/g,
    '[Fragment]'
  )
  simplified = simplified.replace(/#Changes\([^)]+\)/g, '[Changes]')
  simplified = simplified.replace(
    /#SavedContext\((?:WorkspaceState|JSON) "(?:\\.|[^"\\])*"\)/g,
    '[Saved context]'
  )
  simplified = simplified.replace(
    /#Commit\([^:]+:[^\s"]+ "(?:\\.|[^"\\])*"\)/g,
    '[Commit]'
  )
  simplified = simplified.replace(/#Skill\([^)]+\)/g, '[Skill]')
  simplified = simplified.replace(/#Image\([a-fA-F0-9]+\)/g, '[Image]')
  simplified = simplified.replace(
    /#PastedText\([a-fA-F0-9]+(?::\d+)?\)/g,
    '[Pasted text]'
  )
  simplified = simplified.replace(
    /#Website\([^ ]+ [a-fA-F0-9]+:\d+(?: "(?:\\.|[^"\\])*")?\)/g,
    '[Website]'
  )
  simplified = simplified.replace(/#AccuracyBoost/g, '[Accuracy boost]')

  return simplified
}

export const is_prompt_empty_or_only_symbols = (params: {
  prompt: string
}): boolean => {
  if (!params.prompt) return true

  const stripped = params.prompt
    .replace(/\[Fragment\]/g, '')
    .replace(/\[Changes\]/g, '')
    .replace(/\[Saved context\]/g, '')
    .replace(/\[Commit\]/g, '')
    .replace(/\[Skill\]/g, '')
    .replace(/\[Image\]/g, '')
    .replace(/\[Pasted text\]/g, '')
    .replace(/\[Website\]/g, '')
    .replace(/\[Accuracy boost\]/g, '')
    .trim()

  return stripped === ''
}
