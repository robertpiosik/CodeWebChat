import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export namespace PromptsForCommitMessagesUtils {
  const GLOBAL_PROMPTS_FOR_COMMIT_FILENAME = 'prompts-for-commit.json'

  export type Prompt = {
    prompt: string
    files: string[]
  }

  export const get_file_path = (context: vscode.ExtensionContext) => {
    return path.join(
      context.globalStorageUri.fsPath,
      GLOBAL_PROMPTS_FOR_COMMIT_FILENAME
    )
  }

  export const load_all = (
    context: vscode.ExtensionContext
  ): Record<string, Prompt[]> => {
    const file_path = get_file_path(context)
    try {
      if (fs.existsSync(file_path)) {
        const content = fs.readFileSync(file_path, 'utf8')
        return JSON.parse(content)
      }
    } catch (error) {
      console.error('Error loading global commit prompts:', error)
    }
    return {}
  }

  const save_all = (params: {
    context: vscode.ExtensionContext
    prompts: Record<string, Prompt[]>
  }) => {
    const filtered_prompts: Record<string, Prompt[]> = {}

    for (const root in params.prompts) {
      if (fs.existsSync(root)) {
        filtered_prompts[root] = params.prompts[root]
      }
    }

    const file_path = get_file_path(params.context)
    const dir_path = path.dirname(file_path)

    if (!fs.existsSync(dir_path)) {
      fs.mkdirSync(dir_path, { recursive: true })
    }

    try {
      fs.writeFileSync(
        file_path,
        JSON.stringify(filtered_prompts, null, 2),
        'utf8'
      )
    } catch (error) {
      console.error('Failed to save commit prompts', error)
    }
  }

  export const add = (params: {
    context: vscode.ExtensionContext
    workspace_root: string
    prompt: string
    files: string[]
  }) => {
    const all_prompts = load_all(params.context)

    if (!all_prompts[params.workspace_root]) {
      all_prompts[params.workspace_root] = []
    }

    const new_prompt: Prompt = {
      files: params.files,
      prompt: params.prompt
    }

    all_prompts[params.workspace_root].push(new_prompt)
    save_all({
      context: params.context,
      prompts: all_prompts
    })
  }

  export const remove = (params: {
    context: vscode.ExtensionContext
    prompt: string
  }) => {
    const all_prompts = load_all(params.context)
    let changed = false

    for (const root in all_prompts) {
      const initial_count = all_prompts[root].length
      all_prompts[root] = all_prompts[root].filter(
        (p) => p.prompt != params.prompt
      )

      if (all_prompts[root].length != initial_count) {
        changed = true
      }

      if (all_prompts[root].length == 0) {
        delete all_prompts[root]
      }
    }

    if (changed) {
      save_all({
        context: params.context,
        prompts: all_prompts
      })
    }
  }

  export const remove_file_path = (params: {
    context: vscode.ExtensionContext
    file_path: string
    workspace_root?: string
  }) => {
    const all_prompts = load_all(params.context)
    let changed = false
    const normalized_path = params.file_path.replace(/\\/g, '/')

    const roots = params.workspace_root
      ? [params.workspace_root]
      : Object.keys(all_prompts)

    for (const root of roots) {
      if (!all_prompts[root]) continue

      const initial_count = all_prompts[root].length
      all_prompts[root] = all_prompts[root]
        .map((p) => {
          const filtered_files = p.files.filter((f) => f != normalized_path)
          if (filtered_files.length != p.files.length) {
            changed = true
            return { ...p, files: filtered_files }
          }
          return p
        })
        .filter((p) => p.files.length > 0)

      if (all_prompts[root].length !== initial_count) {
        changed = true
      }

      if (all_prompts[root].length == 0) {
        delete all_prompts[root]
      }
    }

    if (changed) {
      save_all({
        context: params.context,
        prompts: all_prompts
      })
    }
  }
}
