interface TreeNode {
  [key: string]: TreeNode
}

const build_tree = (paths: string[]): TreeNode => {
  const root: TreeNode = {}
  for (const path of paths) {
    const parts = path.split('/')
    let current = root
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {}
      }
      current = current[part]
    }
  }
  return root
}

const print_tree = (node: TreeNode, prefix = ''): string[] => {
  const keys = Object.keys(node).sort()
  const lines: string[] = []
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const is_last = i == keys.length - 1
    lines.push(`${prefix}${is_last ? '└── ' : '├── '}${key}`)
    const child_prefix = prefix + (is_last ? '    ' : '│   ')
    lines.push(...print_tree(node[key], child_prefix))
  }
  return lines
}

export const generate_ascii_tree = (paths: string[]): string => {
  const root = build_tree(paths)
  return print_tree(root).join('\n')
}
