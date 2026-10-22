export const is_valid_git_branch_name = (name: string): boolean => {
  if (!name || name === '@' || name.startsWith('-')) {
    return false
  }

  const has_control_char = [...name].some((char) => {
    const code = char.charCodeAt(0)
    return code <= 0x20 || code === 0x7f
  })
  if (has_control_char || /[~^:?*[\\]/.test(name)) {
    return false
  }

  if (name.includes('..') || name.includes('@{') || name.includes('//')) {
    return false
  }

  if (name.startsWith('/') || name.endsWith('/') || name.endsWith('.')) {
    return false
  }

  return name
    .split('/')
    .every(
      (component) => !component.startsWith('.') && !component.endsWith('.lock')
    )
}
