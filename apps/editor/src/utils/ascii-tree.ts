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

export const extract_paths_from_ascii_tree = (text: string): string[] => {
  const found_paths = new Set<string>()
  let tree_stack: { level: number; name: string }[] = []

  const lines = text.split('\n')
  for (const line of lines) {
    const idx1 = line.indexOf('├── ')
    const idx2 = line.indexOf('└── ')
    const idx =
      idx1 != -1 && idx2 != -1 ? Math.min(idx1, idx2) : Math.max(idx1, idx2)

    if (idx != -1) {
      const prefix = line.substring(0, idx)
      if (/^[│\s]*$/.test(prefix)) {
        let name = line.substring(idx + 4).trim()
        if (name.startsWith('`') && name.endsWith('`')) {
          name = name.substring(1, name.length - 1).trim()
        }
        const level = prefix.length

        while (
          tree_stack.length > 0 &&
          tree_stack[tree_stack.length - 1].level >= level
        ) {
          tree_stack.pop()
        }

        tree_stack.push({ level, name })

        const full_path = tree_stack.map((n) => n.name).join('/')
        found_paths.add(full_path.replace(/[.?!]+$/, ''))
      } else {
        tree_stack = []
      }
    } else {
      tree_stack = []
    }
  }

  return Array.from(found_paths)
}
