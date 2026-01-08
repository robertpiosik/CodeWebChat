import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import type { IWorkspaceProvider } from '../workspace-provider'

type TokenCountsCache = {
  [workspace_root: string]: {
    modified_at: number
    files: {
      [file_path: string]: {
        modified_at: number
        token_count: number
      }
    }
  }
}

const SHOW_COUNTING_NOTIFICATION_DELAY_MS = 3000

const TOKEN_CACHE_FILE_NAME = 'token-count-cache.json'

export class TokenCalculator implements vscode.Disposable {
  private _file_token_counts: Map<string, number> = new Map()
  private _directory_token_counts: Map<string, number> = new Map()
  private _directory_selected_token_counts: Map<string, number> = new Map()
  private _token_cache: TokenCountsCache = {}
  private _token_cache_update_timeout: NodeJS.Timeout | null = null
  private _has_token_counts_cache_updated_once = false

  constructor(
    private _provider: IWorkspaceProvider,
    private _context: vscode.ExtensionContext
  ) {
    this._load_token_cache()
  }

  private async _load_token_cache(): Promise<void> {
    try {
      const storage_path = this._context.globalStorageUri.fsPath
      const cache_path = path.join(storage_path, TOKEN_CACHE_FILE_NAME)
      const content = await fs.promises.readFile(cache_path, 'utf8')
      this._token_cache = JSON.parse(content)
    } catch (error) {
      this._token_cache = {}
    }
  }

  private _update_token_counts_cache(): void {
    if (this._has_token_counts_cache_updated_once) return

    if (this._token_cache_update_timeout) {
      clearTimeout(this._token_cache_update_timeout)
    }

    this._token_cache_update_timeout = setTimeout(async () => {
      const storage_path = this._context.globalStorageUri.fsPath
      const cache_path = path.join(storage_path, TOKEN_CACHE_FILE_NAME)
      let current_global_cache: TokenCountsCache = {}

      try {
        if (!fs.existsSync(storage_path)) {
          await fs.promises.mkdir(storage_path, { recursive: true })
        }
        const content = await fs.promises.readFile(cache_path, 'utf8')
        current_global_cache = JSON.parse(content)
      } catch {
        // Cache file might not exist yet or be corrupt
      }

      for (const root of this._provider.get_workspace_roots()) {
        if (this._token_cache[root]) {
          current_global_cache[root] = this._token_cache[root]
        }
      }

      // Prune workspaces updated one week ago or later
      const one_week_ago = Date.now() - 7 * 24 * 60 * 60 * 1000
      for (const root in current_global_cache) {
        if (current_global_cache[root].modified_at < one_week_ago) {
          delete current_global_cache[root]
        }
      }

      try {
        await fs.promises.writeFile(
          cache_path,
          JSON.stringify(current_global_cache)
        )

        Logger.info({
          function_name: '_update_token_counts_cache',
          message: 'Token counts cache updated'
        })
        this._has_token_counts_cache_updated_once = true
      } catch (error) {
        Logger.error({
          function_name: '_update_token_counts_cache',
          message: 'Error writing token cache',
          data: error
        })
      }
    }, 10000)
  }

  public async with_token_counting_notification<T>(
    task: () => Promise<T>
  ): Promise<T> {
    let notification_stopper: any = null

    const timer = setTimeout(() => {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: dictionary.information_message.CRUNCHING_TOKEN_COUNTS,
          cancellable: false
        },
        async (_progress) => {
          return new Promise<void>((resolve) => {
            notification_stopper = resolve
          })
        }
      )
    }, SHOW_COUNTING_NOTIFICATION_DELAY_MS)

    try {
      const result = await task()

      return result
    } finally {
      clearTimeout(timer)
      notification_stopper?.()
    }
  }

  public invalidate_token_counts_for_file(changed_file_path: string): void {
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
      this._directory_selected_token_counts.delete(dir_path)
      dir_path = path.dirname(dir_path)
    }
  }

  public invalidate_directory_counts(dir_path: string): void {
    this._directory_token_counts.delete(dir_path)
    this._directory_selected_token_counts.delete(dir_path)
  }

  public invalidate_directory_selected_count(dir_path: string): void {
    this._directory_selected_token_counts.delete(dir_path)
  }

  public clear_caches(): void {
    this._file_token_counts.clear()
    this._directory_token_counts.clear()
    this._directory_selected_token_counts.clear()
  }

  public clear_selected_counts(): void {
    this._directory_selected_token_counts.clear()
  }

  public get_cached_token_count(file_path: string): number | undefined {
    return this._file_token_counts.get(file_path)
  }

  public async calculate_file_tokens(file_path: string): Promise<number> {
    if (this._file_token_counts.has(file_path)) {
      return this._file_token_counts.get(file_path)!
    }

    const workspace_root = this._provider.get_workspace_root_for_file(file_path)
    const range = this._provider.get_range(file_path)
    let mtime = 0

    if (workspace_root && !range) {
      try {
        const stats = await fs.promises.stat(file_path)
        mtime = stats.mtimeMs
        if (
          this._token_cache[workspace_root]?.files?.[file_path]?.modified_at ==
          mtime
        ) {
          const tokens =
            this._token_cache[workspace_root].files[file_path].token_count
          this._file_token_counts.set(file_path, tokens)
          return tokens
        }
      } catch {
        // Continue to calculate if stat fails
      }
    }

    try {
      let content = await fs.promises.readFile(file_path, 'utf8')

      if (range) {
        content = this._provider.apply_range_to_content(content, range)
      }

      let content_xml = ''

      if (!workspace_root) {
        content_xml = `<file path="${file_path.replace(
          /\\/g,
          '/'
        )}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
      } else {
        const relative_path = path
          .relative(workspace_root, file_path)
          .replace(/\\/g, '/')
        if (this._provider.get_workspace_roots().length > 1) {
          const workspace_name =
            this._provider.get_workspace_name(workspace_root)
          content_xml = `<file path="${workspace_name}/${relative_path}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
        } else {
          content_xml = `<file path="${relative_path}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
        }
      }

      const token_count = Math.floor(content_xml.length / 4)
      this._file_token_counts.set(file_path, token_count)

      if (workspace_root && !range && mtime > 0) {
        if (
          !this._token_cache[workspace_root] ||
          !this._token_cache[workspace_root].files
        ) {
          this._token_cache[workspace_root] = {
            modified_at: Date.now(),
            files: {}
          }
        }
        this._token_cache[workspace_root].files[file_path] = {
          modified_at: mtime,
          token_count: token_count
        }
        this._token_cache[workspace_root].modified_at = Date.now()
        this._update_token_counts_cache()
      }

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

  public async calculate_directory_tokens(dir_path: string): Promise<number> {
    if (this._directory_token_counts.has(dir_path)) {
      return this._directory_token_counts.get(dir_path)!
    }

    try {
      const workspace_root =
        this._provider.get_workspace_root_for_file(dir_path)
      if (!workspace_root) {
        return 0
      }

      const relative_dir_path = path.relative(workspace_root, dir_path)
      if (
        this._provider.is_excluded(
          relative_dir_path ? relative_dir_path + '/' : relative_dir_path
        )
      ) {
        this._directory_token_counts.set(dir_path, 0)
        return 0
      }

      const entries = await fs.promises.readdir(dir_path, {
        withFileTypes: true
      })
      let total_tokens = 0

      for (const entry of entries) {
        const full_path = path.join(dir_path, entry.name)
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

        let is_directory = entry.isDirectory()
        const is_symbolic_link = entry.isSymbolicLink()
        let is_broken_link = false

        // Resolve symbolic link to determine if it points to a directory
        if (is_symbolic_link) {
          try {
            const stats = await fs.promises.stat(full_path)
            is_directory = stats.isDirectory()
          } catch {
            // The symlink is broken
            is_broken_link = true
          }
        }

        if (is_directory && !is_broken_link) {
          // Recurse into subdirectory (including resolved symlinks that are directories)
          total_tokens += await this.calculate_directory_tokens(full_path)
        } else if (
          entry.isFile() ||
          (is_symbolic_link && !is_broken_link && !is_directory)
        ) {
          // Add file tokens (including resolved symlinks that are files)
          total_tokens += await this.calculate_file_tokens(full_path)
        }
      }

      this._directory_token_counts.set(dir_path, total_tokens)

      return total_tokens
    } catch (error) {
      Logger.error({
        function_name: 'calculate_directory_tokens',
        message: `Error calculating tokens for directory ${dir_path}`,
        data: error
      })
      return 0
    }
  }

  public async calculate_directory_selected_tokens(
    dir_path: string
  ): Promise<number> {
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
      if (!workspace_root || workspace_root === '') {
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
        const full_path = path.join(dir_path, entry.name)
        const relative_path = path.relative(workspace_root, full_path)

        if (
          this._provider.is_excluded(
            entry.isDirectory() ? relative_path + '/' : relative_path
          ) ||
          this._provider.is_ignored_by_patterns(full_path)
        ) {
          continue
        }

        const checkbox_state = this._provider.get_check_state(full_path)

        let entry_is_directory = entry.isDirectory()
        if (entry.isSymbolicLink()) {
          try {
            entry_is_directory = (
              await fs.promises.stat(full_path)
            ).isDirectory()
          } catch {
            continue /* broken symlink */
          }
        }

        if (entry_is_directory) {
          if (checkbox_state === vscode.TreeItemCheckboxState.Checked) {
            selected_tokens += await this.calculate_directory_tokens(full_path)
          } else if (this._provider.is_partially_checked(full_path)) {
            selected_tokens +=
              await this.calculate_directory_selected_tokens(full_path)
          }
        } else {
          if (checkbox_state === vscode.TreeItemCheckboxState.Checked) {
            selected_tokens += await this.calculate_file_tokens(full_path)
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

  public async get_checked_files_token_count(options?: {
    exclude_file_path?: string
  }): Promise<number> {
    const checked_files = this._provider.get_checked_files()
    let total = 0

    for (const file_path of checked_files) {
      try {
        if (
          options?.exclude_file_path &&
          file_path == options.exclude_file_path
        ) {
          continue
        }

        if (fs.statSync(file_path).isFile()) {
          if (this._file_token_counts.has(file_path)) {
            total += this._file_token_counts.get(file_path)!
          } else {
            const count = await this.calculate_file_tokens(file_path)
            total += count
          }
        }
      } catch (error) {
        Logger.error({
          function_name: 'get_checked_files_token_count',
          message: `Error accessing file ${file_path} for token count`,
          data: error
        })
      }
    }

    return total
  }

  public dispose(): void {
    if (this._token_cache_update_timeout) {
      clearTimeout(this._token_cache_update_timeout)
    }
  }
}
