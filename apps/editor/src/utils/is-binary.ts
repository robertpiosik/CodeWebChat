import * as path from 'path'

const BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.tiff', '.svgz',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pages', '.numbers', '.key',
  // Archives
  '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2', '.xz', '.iso',
  // Audio/Video
  '.mp3', '.mp4', '.wav', '.avi', '.mkv', '.mov', '.webm', '.ogg', '.flac',
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  // Executables/Compiled
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.class', '.pyc', '.o', '.a', '.lib',
  // Databases and others
  '.sqlite', '.sqlite3', '.db'
])

export const is_binary_file = (file_path: string, buffer?: Uint8Array): boolean => {
  const base = path.basename(file_path).toLowerCase()
  if (base == '.ds_store') return true

  const ext = path.extname(file_path).toLowerCase()
  if (BINARY_EXTENSIONS.has(ext)) {
    return true
  }

  if (!buffer) return false

  const len = Math.min(buffer.length, 8000)
  let non_printable = 0

  for (let i = 0; i < len; i++) {
    const byte = buffer[i]
    if (byte == 0) {
      return true
    }

    if ((byte < 32 && byte != 9 && byte != 10 && byte != 13) || byte == 127) {
      non_printable++
    }
  }

  if (len > 0 && non_printable / len > 0.1) {
    return true
  }

  return false
}