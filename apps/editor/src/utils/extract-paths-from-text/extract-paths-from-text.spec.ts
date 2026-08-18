import { extract_paths_from_text } from './extract-paths-from-text'

describe('extract_paths_from_text', () => {
  it('extracts paths from a bullet list', () => {
    const text = `**Intelligent file search results:**

* \`src/hello.ts\`
- src/welcome.ts

Lorem ipsum.`

    const workspace_files = ['src/hello.ts', 'src/welcome.ts']
    const result = extract_paths_from_text({ text, workspace_files })

    expect(result).toContain('src/hello.ts')
    expect(result).toContain('src/welcome.ts')
  })

  it('extracts paths from inline text', () => {
    const text = `\`src/hello.ts\`, src/welcome.ts \`src/main.ts\`

Lorem ipsum.`

    const workspace_files = ['src/hello.ts', 'src/welcome.ts', 'src/main.ts']
    const result = extract_paths_from_text({ text, workspace_files })

    expect(result).toContain('src/hello.ts')
    expect(result).toContain('src/welcome.ts')
    expect(result).toContain('src/main.ts')
  })

  it('strips trailing punctuation', () => {
    const text = 'Look at src/utils.ts, src/types.ts! Also see src/index.ts.'
    const workspace_files = ['src/utils.ts', 'src/types.ts', 'src/index.ts']
    const result = extract_paths_from_text({ text, workspace_files })

    expect(result).toContain('src/utils.ts')
    expect(result).toContain('src/types.ts')
    expect(result).toContain('src/index.ts')
  })

  it('extracts files in the root directory', () => {
    const text =
      'Check out package.json, README.md, and .gitignore for project configurations.'
    const workspace_files = [
      'package.json',
      'README.md',
      '.gitignore',
      'src/main.ts'
    ]
    const result = extract_paths_from_text({ text, workspace_files })

    expect(result).toContain('package.json')
    expect(result).toContain('README.md')
    expect(result).toContain('.gitignore')
    expect(result).not.toContain('src/main.ts')
  })

  it('extracts paths starting with a slash', () => {
    const text = 'Look at /src/hello.ts'
    const workspace_files = ['src/hello.ts']
    const result = extract_paths_from_text({ text, workspace_files })

    expect(result).toContain('src/hello.ts')
  })

  it('extracts paths from an ASCII tree', () => {
    const text = `Here is the project structure:
└── apps
    ├── editor
    │   └── src
    │       ├── features
    │       │   └── checkpoints
    │       │       └── actions
    │       │           └── restore-checkpoint.ts
    │       └── utils
    │           ├── ascii-tree.ts
    │           └── extract-paths-from-text
    │               ├── extract-paths-from-text.spec.ts
    │               └── extract-paths-from-text.ts
    └── server
        └── src
            └── features
                └── checkpoints
                    └── actions
                        └── restore-checkpoint.ts`

    const workspace_files = [
      'apps/editor/src/features/checkpoints/actions/restore-checkpoint.ts',
      'apps/editor/src/utils/ascii-tree.ts',
      'apps/editor/src/utils/extract-paths-from-text/extract-paths-from-text.spec.ts',
      'apps/editor/src/utils/extract-paths-from-text/extract-paths-from-text.ts',
      'apps/server/src/features/checkpoints/actions/restore-checkpoint.ts',
      'other-file.ts'
    ]

    const result = extract_paths_from_text({ text, workspace_files })

    expect(result).toContain(
      'apps/editor/src/features/checkpoints/actions/restore-checkpoint.ts'
    )
    expect(result).toContain('apps/editor/src/utils/ascii-tree.ts')
    expect(result).toContain(
      'apps/editor/src/utils/extract-paths-from-text/extract-paths-from-text.spec.ts'
    )
    expect(result).toContain(
      'apps/editor/src/utils/extract-paths-from-text/extract-paths-from-text.ts'
    )
    expect(result).toContain(
      'apps/server/src/features/checkpoints/actions/restore-checkpoint.ts'
    )
    expect(result).not.toContain('other-file.ts')
  })
})
