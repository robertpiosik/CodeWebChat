export const estimate_token_count = (
  instructions: string[],
  skill_definitions_length: number
): number => {
  const instructions_length = instructions.reduce(
    (acc, text) => acc + text.length,
    0
  )
  return Math.ceil((instructions_length + skill_definitions_length) / 4)
}
