export const get_progress_dots = (action_count: number): string => {
  const cycle = (action_count - 1) % 3
  if (cycle === 0) return '...'
  if (cycle === 1) return '....'
  return '..'
}