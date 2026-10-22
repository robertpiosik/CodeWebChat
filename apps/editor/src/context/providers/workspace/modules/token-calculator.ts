import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import type { IWorkspaceProvider } from '../workspace-provider'
import { is_binary_file } from '@/utils/is-binary'
import { normalize_path } from '@/utils/normalize-path'

export class TokenCalculator implements vscode.Disposable {
  private _file_token_counts: Map<string, number> = new Map()
  private _directory_token_counts: Map<string, number> = new Map()
  private _directory_file_counts: Map<string, number> = new Map()
  private _directory_selected_token_counts: Map<string, number> = new Map()

  constructor(private _provider: IWorkspaceProvider) {}

  invalidate_token_counts_for_file(changed_file_path: string) {
    const workspace_root =
      this._provider.get_workspace_root_for_file(changed_file_path)
    if (!workspace_root) {
      this._file_token_counts.delete(changed_file_path)
      return
    }

    this._file_token_counts.delete(changed_file_path)

    let dir_path = path.dirname(changed_file_path)
    while (dir_path.startsWith(workspace_root)) {
      this._directory_token_counts.delete(dir_path)
      this._directory_file_counts.delete(dir_path)
      this._directory_selected_token_counts.delete(dir_path)
      const next_dir_path = path.dirname(dir_path)
      if (next_dir_path == dir_path) break
      dir_path = next_dir_path
    }
  }

  invalidate_directory_counts(dir_path: string) {
    this._directory_token_counts.delete(dir_path)
    this._directory_file_counts.delete(dir_path)
    this._directory_selected_token_counts.delete(dir_path)
  }

  invalidate_directory_selected_count(dir_path: string) {
    this._directory_selected_token_counts.delete(dir_path)
  }

  clear_caches() {
    this._file_token_counts.clear()
    this._directory_token_counts.clear()
    this._directory_file_counts.clear()
    this._directory_selected_token_counts.clear()
  }

  clear_selected_counts() {
    this._directory_selected_token_counts.clear()
  }

  get_cached_token_count(file_path: string): number | undefined {
    if (this._file_token_counts.has(file_path)) {
      return this._file_token_counts.get(file_path)
    }
    return undefined
  }

  async calculate_file_tokens(file_path: string): Promise<number> {
    const workspace_root = this._provider.get_workspace_root_for_file(file_path)
    const range = this._provider.get_range(file_path)

    if (this._file_token_counts.has(file_path)) {
      return this._file_token_counts.get(file_path)!
    }

    let file_size = 0
    try {
      const stats = await fs.promises.stat(file_path)
      file_size = stats.size
    } catch {}

    if (!range) {
      let display_path = normalize_path(file_path)
      if (workspace_root) {
        const relative_path = normalize_path(
          path.relative(workspace_root, file_path)
        )
        if (this._provider.get_workspace_roots().length > 1) {
          const workspace_name =
            this._provider.get_workspace_name(workspace_root)
          display_path = `${workspace_name}/${relative_path}`
        } else {
          display_path = relative_path
        }
      }

      const wrapper_len =
        `### File: \`${display_path}\`\n\n\`\`\`\n\n\`\`\`\n\n`.length
      const estimated_tokens = Math.floor((file_size + wrapper_len) / 4)

      this._file_token_counts.set(file_path, estimated_tokens)

      return estimated_tokens
    }

    try {
      const buffer = await fs.promises.readFile(file_path)
      const is_binary = is_binary_file(file_path, buffer)

      let content = is_binary ? 'Binary file' : buffer.toString('utf8')

      if (range && !is_binary) {
        content = this._provider.apply_range_to_content(content, range)
      }

      const wrap_content = (text: string) => {
        let display_path = normalize_path(file_path)
        if (workspace_root) {
          const relative_path = normalize_path(
            path.relative(workspace_root, file_path)
          )
          if (this._provider.get_workspace_roots().length > 1) {
            const workspace_name =
              this._provider.get_workspace_name(workspace_root)
            display_path = `${workspace_name}/${relative_path}`
          } else {
            display_path = relative_path
          }
        }

        if (is_binary) {
          return `### File: \`${display_path}\`\n\nBinary file\n\n`
        } else {
          return `### File: \`${display_path}\`\n\n\`\`\`\n${text}\n\`\`\`\n\n`
        }
      }

      const token_count = Math.floor(wrap_content(content).length / 4)

      this._file_token_counts.set(file_path, token_count)

      return token_count
    } catch (error) {
      Logger.error({
        function_name: 'calculate_file_tokens',
        message: `Error calculating tokens for ${file_path}`,
        data: error
      })
      return 0
    }
  }

  async calculate_directory_tokens(
    dir_path: string
  ): Promise<{ total: number; file_count: number }> {
    if (
      this._directory_token_counts.has(dir_path) &&
      this._directory_file_counts.has(dir_path)
    ) {
      return {
        total: this._directory_token_counts.get(dir_path)!,
        file_count: this._directory_file_counts.get(dir_path)!
      }
    }

    try {
      const workspace_root =
        this._provider.get_workspace_root_for_file(dir_path)
      if (!workspace_root) {
        return { total: 0, file_count: 0 }
      }

      const relative_dir_path = path.relative(workspace_root, dir_path)
      if (
        this._provider.is_excluded(
          relative_dir_path ? relative_dir_path + '/' : relative_dir_path
        )
      ) {
        this._directory_token_counts.set(dir_path, 0)
        this._directory_file_counts.set(dir_path, 0)
        return { total: 0, file_count: 0 }
      }

      const entries = await fs.promises.readdir(dir_path, {
        withFileTypes: true
      })
      let total_tokens = 0
      let file_count = 0

      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue

        const full_path = path.join(dir_path, entry.name)

        const file_workspace_root =
          this._provider.get_workspace_root_for_file(full_path)
        if (file_workspace_root && file_workspace_root !== workspace_root) {
          continue
        }

        const relative_path = path.relative(workspace_root, full_path)

        if (
          this._provider.is_excluded(
            entry.isDirectory() ? relative_path + '/' : relative_path
          )
        ) {
          continue
        }

        if (this._provider.is_ignored_by_patterns(full_path)) {
          continue
        }

        if (entry.isDirectory()) {
          const counts = await this.calculate_directory_tokens(full_path)
          total_tokens += counts.total
          file_count += counts.file_count
        } else if (entry.isFile()) {
          const count = await this.calculate_file_tokens(full_path)
          total_tokens += count
          file_count += 1
        }
      }

      this._directory_token_counts.set(dir_path, total_tokens)
      this._directory_file_counts.set(dir_path, file_count)

      return { total: total_tokens, file_count }
    } catch (error) {
      Logger.error({
        function_name: 'calculate_directory_tokens',
        message: `Error calculating tokens for directory ${dir_path}`,
        data: error
      })
      return { total: 0, file_count: 0 }
    }
  }

  async calculate_directory_selected_tokens(dir_path: string): Promise<number> {
    if (!dir_path) {
      return 0
    }
    if (this._directory_selected_token_counts.has(dir_path)) {
      return this._directory_selected_token_counts.get(dir_path)!
    }

    let selected_tokens = 0

    try {
      const workspace_root =
        this._provider.get_workspace_root_for_file(dir_path)
      if (!workspace_root || workspace_root == '') {
        Logger.warn({
          function_name: 'calculate_directory_selected_tokens',
          message: `No workspace root found for directory ${dir_path}`
        })
        return 0
      }

      const relative_dir_path = path.relative(workspace_root, dir_path)
      if (
        this._provider.is_excluded(
          relative_dir_path ? relative_dir_path + '/' : relative_dir_path
        )
      ) {
        this._directory_selected_token_counts.set(dir_path, 0)
        return 0
      }

      const entries = await fs.promises.readdir(dir_path, {
        withFileTypes: true
      })
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue

        const full_path = path.join(dir_path, entry.name)

        const file_workspace_root =
          this._provider.get_workspace_root_for_file(full_path)
        if (file_workspace_root && file_workspace_root !== workspace_root) {
          continue
        }

        const relative_path = path.relative(workspace_root, full_path)

        if (
          this._provider.is_excluded(
            entry.isDirectory() ? relative_path + '/' : relative_path
          ) ||
          this._provider.is_ignored_by_patterns(full_path)
        ) {
          continue
        }

        const checkbox_state = this._provider.get_checkbox_state(full_path)

        if (entry.isDirectory()) {
          if (checkbox_state === vscode.TreeItemCheckboxState.Checked) {
            const counts = await this.calculate_directory_tokens(full_path)
            selected_tokens += counts.total
          } else if (this._provider.is_partially_selected(full_path)) {
            const count =
              await this.calculate_directory_selected_tokens(full_path)
            selected_tokens += count
          }
        } else if (entry.isFile()) {
          if (checkbox_state === vscode.TreeItemCheckboxState.Checked) {
            const count = await this.calculate_file_tokens(full_path)
            selected_tokens += count
          }
        }
      }
    } catch (error) {
      Logger.error({
        function_name: 'calculate_directory_selected_tokens',
        message: `Error calculating selected tokens for dir ${dir_path}`,
        data: error
      })
      return 0
    }
    this._directory_selected_token_counts.set(dir_path, selected_tokens)
    return selected_tokens
  }

  async get_selected_files_token_count(options?: {
    exclude_file_path?: string
  }): Promise<number> {
    const selected_files = this._provider.get_selected_files()

    let total = 0
    for (const file_path of selected_files) {
      try {
        if (
          options?.exclude_file_path &&
          file_path == options.exclude_file_path
        ) {
          continue
        }

        const stat = fs.lstatSync(file_path)
        if (stat.isSymbolicLink()) continue

        if (stat.isFile()) {
          const count = await this.calculate_file_tokens(file_path)
          total += count
        }
      } catch (error) {
        Logger.error({
          function_name: 'get_selected_files_token_count',
          message: `Error accessing file ${file_path} for token count`,
          data: error
        })
      }
    }
    return total
  }

  dispose() {}
}
