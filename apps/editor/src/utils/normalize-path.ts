export const normalize_path = (file_path: string): string => {
  return file_path.replace(/\\/g, '/')
}
