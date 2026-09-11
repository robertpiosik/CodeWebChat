export const format_duration = (ms: number): string => {
  const total_seconds = Math.round(ms / 1000)
  const hours = Math.floor(total_seconds / 3600)
  const minutes = Math.floor((total_seconds % 3600) / 60)
  const seconds = total_seconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0 || (hours > 0 && seconds > 0)) parts.push(`${minutes}m`)
  if (seconds > 0 || (hours === 0 && minutes === 0)) parts.push(`${seconds}s`)

  return parts.join(' ')
}