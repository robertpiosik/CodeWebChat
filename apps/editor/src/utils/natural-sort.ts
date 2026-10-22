export const natural_sort = (a: string, b: string): number => {
  const chunk_regex = /(\d+|\D+)/g
  const a_x: string[] = []
  const b_x: string[] = []

  a.replace(chunk_regex, (_, $1) => {
    a_x.push($1)
    return ''
  })
  b.replace(chunk_regex, (_, $1) => {
    b_x.push($1)
    return ''
  })

  for (let i = 0; i < Math.max(a_x.length, b_x.length); i++) {
    const a_chunk = a_x[i] || ''
    const b_chunk = b_x[i] || ''

    if (a_chunk !== b_chunk) {
      const a_num = parseInt(a_chunk, 10)
      const b_num = parseInt(b_chunk, 10)

      if (!isNaN(a_num) && !isNaN(b_num)) {
        return a_num - b_num
      }
      return a_chunk.localeCompare(b_chunk)
    }
  }

  return 0
}
