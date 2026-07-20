export const extract_file_path_from_xml = (
  line: string
): { tagName: string; path: string } | null => {
  const match = line.match(/<([\w-]+)\s+path=["']([^"']+)["']/)
  if (match && match[1] && match[2]) {
    return { tagName: match[1], path: match[2] }
  }
  return null
}
