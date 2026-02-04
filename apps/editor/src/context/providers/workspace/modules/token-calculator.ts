import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { dictionary } from '@shared/constants/dictionary'
import { Logger } from '@shared/utils/logger'
import type { IWorkspaceProvider } from '../workspace-provider'
import { compact_file } from '../../../utils/compact-file/compact-file'

type TokenData = [number, number, number]

type TokenCacheNode = {
  [key: string]: TokenCacheNode | TokenData
}

type TokenCountsCache = {
  [workspace_root: string]: {
    modified_at: number
    files: {
      [file_path: string]: TokenData
    }
  }
}

const SHOW_COUNTING_NOTIFICATION_DELAY_MS = 3000

const TOKEN_CACHE_FILE_NAME = 'token-counts-cache.json'

export class TokenCalculator implements vscode.Disposable {
  private _file_token_counts: Map<string, number> = new Map()
  private _file_compact_token_counts: Map<string, number> = new Map()
  private _directory_token_counts: Map<string, number> = new Map()
  private _directory_compact_token_counts: Map<string, number> = new Map()
  private _directory_selected_token_counts: Map<string, number> = new Map()
  private _directory_selected_compact_token_counts: Map<string, number> =
    new Map()
  private _token_cache: TokenCountsCache = {}
  private _session_cache: TokenCountsCache = {}
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
      const raw_cache = JSON.parse(content)
      this._token_cache = {}
      for (const root in raw_cache) {
        this._token_cache[root] = {
          modified_at: raw_cache[root].modified_at,
          files: this._flatten_tree(raw_cache[root].files || {})
        }
      }
    } catch (error) {
      this._token_cache = {}
    }
  }

  private _update_token_counts_cache() {
    if (this._has_token_counts_cache_updated_once) return

    if (this._token_cache_update_timeout) {
      clearTimeout(this._token_cache_update_timeout)
    }

    this._token_cache_update_timeout = setTimeout(async () => {
      const storage_path = this._context.globalStorageUri.fsPath
      const cache_path = path.join(storage_path, TOKEN_CACHE_FILE_NAME)
      const current_global_cache: TokenCountsCache = {}

      try {
        if (!fs.existsSync(storage_path)) {
          await fs.promises.mkdir(storage_path, { recursive: true })
        }
        const content = await fs.promises.readFile(cache_path, 'utf8')
        const raw_cache = JSON.parse(content)
        for (const root in raw_cache) {
          current_global_cache[root] = {
            modified_at: raw_cache[root].modified_at,
            files: this._flatten_tree(raw_cache[root].files || {})
          }
        }
      } catch {
        // Cache file might not exist yet or be corrupt
      }

      for (const root of this._provider.get_workspace_roots()) {
        if (this._session_cache[root]) {
          current_global_cache[root] = {
            modified_at: this._session_cache[root].modified_at,
            files: {
              ...(current_global_cache[root]?.files || {}),
              ...this._session_cache[root].files
            }
          }
        }
      }

      // Prune workspaces updated one week ago or later
      const one_week_ago = Date.now() - 7 * 24 * 60 * 60 * 1000
      for (const root in current_global_cache) {
        if (current_global_cache[root].modified_at < one_week_ago) {
          delete current_global_cache[root]
        }
      }

      const cache_to_write: any = {}
      for (const root in current_global_cache) {
        cache_to_write[root] = {
          modified_at: current_global_cache[root].modified_at,
          files: this._build_tree(current_global_cache[root].files)
        }
      }

      try {
        await fs.promises.writeFile(cache_path, JSON.stringify(cache_to_write))

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
    }, 5000)
  }

  private _update_session_cache(
    workspace_root: string,
    relative_path: string,
    mtime: number,
    token_count: number,
    compact_token_count: number
  ) {
    if (!this._session_cache[workspace_root]) {
      this._session_cache[workspace_root] = {
        modified_at: Date.now(),
        files: {}
      }
    }
    this._session_cache[workspace_root].files[relative_path] = [
      mtime,
      token_count,
      compact_token_count
    ]
    this._session_cache[workspace_root].modified_at = Date.now()
    this._update_token_counts_cache()
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

  public invalidate_token_counts_for_file(changed_file_path: string) {
    const workspace_root =
      this._provider.get_workspace_root_for_file(changed_file_path)
    if (!workspace_root) {
      this._file_token_counts.delete(changed_file_path)
      this._file_compact_token_counts.delete(changed_file_path)
      return
    }

    this._file_token_counts.delete(changed_file_path)
    this._file_compact_token_counts.delete(changed_file_path)

    let dir_path = path.dirname(changed_file_path)
    while (dir_path.startsWith(workspace_root)) {
      this._directory_token_counts.delete(dir_path)
      this._directory_compact_token_counts.delete(dir_path)
      this._directory_selected_token_counts.delete(dir_path)
      this._directory_selected_compact_token_counts.delete(dir_path)
      dir_path = path.dirname(dir_path)
    }
  }

  public invalidate_directory_counts(dir_path: string) {
    this._directory_token_counts.delete(dir_path)
    this._directory_compact_token_counts.delete(dir_path)
    this._directory_selected_token_counts.delete(dir_path)
    this._directory_selected_compact_token_counts.delete(dir_path)
  }

  public invalidate_directory_selected_count(dir_path: string) {
    this._directory_selected_token_counts.delete(dir_path)
    this._directory_selected_compact_token_counts.delete(dir_path)
  }

  public clear_caches() {
    this._file_token_counts.clear()
    this._file_compact_token_counts.clear()
    this._directory_token_counts.clear()
    this._directory_compact_token_counts.clear()
    this._directory_selected_token_counts.clear()
    this._directory_selected_compact_token_counts.clear()
  }

  public clear_selected_counts() {
    this._directory_selected_token_counts.clear()
    this._directory_selected_compact_token_counts.clear()
  }

  public get_cached_token_count(
    file_path: string
  ): { total: number; compact: number } | undefined {
    const total = this._file_token_counts.get(file_path)
    const compact = this._file_compact_token_counts.get(file_path)
    if (total !== undefined && compact !== undefined) {
      return { total, compact }
    }
    return undefined
  }

  public async calculate_file_tokens(
    file_path: string
  ): Promise<{ total: number; compact: number }> {
    if (
      this._file_token_counts.has(file_path) &&
      this._file_compact_token_counts.has(file_path)
    ) {
      return {
        total: this._file_token_counts.get(file_path)!,
        compact: this._file_compact_token_counts.get(file_path)!
      }
    }

    const workspace_root = this._provider.get_workspace_root_for_file(file_path)
    const range = this._provider.get_range(file_path)
    let mtime = 0

    if (workspace_root && !range) {
      try {
        const stats = await fs.promises.stat(file_path)
        mtime = Math.floor(stats.mtimeMs)
        const relative_path = path
          .relative(workspace_root, file_path)
          .replace(/\\/g, '/')

        const cached_file =
          this._token_cache[workspace_root]?.files?.[relative_path]

        if (
          cached_file &&
          Array.isArray(cached_file) &&
          cached_file[0] == mtime
        ) {
          const tokens = cached_file[1]
          const compact_tokens = cached_file[2]

          this._file_token_counts.set(file_path, tokens)
          this._file_compact_token_counts.set(file_path, compact_tokens)

          this._update_session_cache(
            workspace_root,
            relative_path,
            mtime,
            tokens,
            compact_tokens
          )
          return { total: tokens, compact: compact_tokens }
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

      const wrap_content = (text: string) => {
        if (!workspace_root) {
          return `<file path="${file_path.replace(
            /\\/g,
            '/'
          )}">\n<![CDATA[\n${text}\n]]>\n</file>\n`
        } else {
          const relative_path = path
            .relative(workspace_root, file_path)
            .replace(/\\/g, '/')
          if (this._provider.get_workspace_roots().length > 1) {
            const workspace_name =
              this._provider.get_workspace_name(workspace_root)
            return `<file path="${workspace_name}/${relative_path}">\n<![CDATA[\n${text}\n]]>\n</file>\n`
          } else {
            return `<file path="${relative_path}">\n<![CDATA[\n${text}\n]]>\n</file>\n`
          }
        }
      }

      const token_count = Math.floor(wrap_content(content).length / 4)
      const compact_content = compact_file(content, path.extname(file_path))
      const compact_token_count = Math.floor(
        wrap_content(compact_content).length / 4
      )

      this._file_token_counts.set(file_path, token_count)
      this._file_compact_token_counts.set(file_path, compact_token_count)

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

        const relative_path = path
          .relative(workspace_root, file_path)
          .replace(/\\/g, '/')

        this._token_cache[workspace_root].files[relative_path] = [
          mtime,
          token_count,
          compact_token_count
        ]
        this._token_cache[workspace_root].modified_at = Date.now()

        this._update_session_cache(
          workspace_root,
          relative_path,
          mtime,
          token_count,
          compact_token_count
        )
      }

      return { total: token_count, compact: compact_token_count }
    } catch (error) {
      Logger.error({
        function_name: 'calculate_file_tokens',
        message: `Error calculating tokens for ${file_path}`,
        data: error
      })
      return { total: 0, compact: 0 }
    }
  }

  public async calculate_directory_tokens(
    dir_path: string
  ): Promise<{ total: number; compact: number }> {
    if (
      this._directory_token_counts.has(dir_path) &&
      this._directory_compact_token_counts.has(dir_path)
    ) {
      return {
        total: this._directory_token_counts.get(dir_path)!,
        compact: this._directory_compact_token_counts.get(dir_path)!
      }
    }

    try {
      const workspace_root =
        this._provider.get_workspace_root_for_file(dir_path)
      if (!workspace_root) {
        return { total: 0, compact: 0 }
      }

      const relative_dir_path = path.relative(workspace_root, dir_path)
      if (
        this._provider.is_excluded(
          relative_dir_path ? relative_dir_path + '/' : relative_dir_path
        )
      ) {
        this._directory_token_counts.set(dir_path, 0)
        this._directory_compact_token_counts.set(dir_path, 0)
        return { total: 0, compact: 0 }
      }

      const entries = await fs.promises.readdir(dir_path, {
        withFileTypes: true
      })
      let total_tokens = 0
      let total_compact_tokens = 0

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
          const counts = await this.calculate_directory_tokens(full_path)
          total_tokens += counts.total
          total_compact_tokens += counts.compact
        } else if (
          entry.isFile() ||
          (is_symbolic_link && !is_broken_link && !is_directory)
        ) {
          // Add file tokens (including resolved symlinks that are files)
          const counts = await this.calculate_file_tokens(full_path)
          total_tokens += counts.total
          total_compact_tokens += counts.compact
        }
      }

      this._directory_token_counts.set(dir_path, total_tokens)
      this._directory_compact_token_counts.set(dir_path, total_compact_tokens)

      return { total: total_tokens, compact: total_compact_tokens }
    } catch (error) {
      Logger.error({
        function_name: 'calculate_directory_tokens',
        message: `Error calculating tokens for directory ${dir_path}`,
        data: error
      })
      return { total: 0, compact: 0 }
    }
  }

  public async calculate_directory_selected_tokens(
    dir_path: string
  ): Promise<{ total: number; compact: number }> {
    if (!dir_path) {
      return { total: 0, compact: 0 }
    }
    if (
      this._directory_selected_token_counts.has(dir_path) &&
      this._directory_selected_compact_token_counts.has(dir_path)
    ) {
      return {
        total: this._directory_selected_token_counts.get(dir_path)!,
        compact: this._directory_selected_compact_token_counts.get(dir_path)!
      }
    }

    let selected_tokens = 0
    let selected_compact_tokens = 0

    try {
      const workspace_root =
        this._provider.get_workspace_root_for_file(dir_path)
      if (!workspace_root || workspace_root == '') {
        Logger.warn({
          function_name: 'calculate_directory_selected_tokens',
          message: `No workspace root found for directory ${dir_path}`
        })
        return { total: 0, compact: 0 }
      }

      const relative_dir_path = path.relative(workspace_root, dir_path)
      if (
        this._provider.is_excluded(
          relative_dir_path ? relative_dir_path + '/' : relative_dir_path
        )
      ) {
        this._directory_selected_token_counts.set(dir_path, 0)
        this._directory_selected_compact_token_counts.set(dir_path, 0)
        return { total: 0, compact: 0 }
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
            const counts = await this.calculate_directory_tokens(full_path)
            selected_tokens += counts.total
            selected_compact_tokens += counts.compact
          } else if (this._provider.is_partially_checked(full_path)) {
            const counts =
              await this.calculate_directory_selected_tokens(full_path)
            selected_tokens += counts.total
            selected_compact_tokens += counts.compact
          }
        } else {
          if (checkbox_state === vscode.TreeItemCheckboxState.Checked) {
            const counts = await this.calculate_file_tokens(full_path)
            selected_tokens += counts.total
            selected_compact_tokens += counts.compact
          }
        }
      }
    } catch (error) {
      Logger.error({
        function_name: 'calculate_directory_selected_tokens',
        message: `Error calculating selected tokens for dir ${dir_path}`,
        data: error
      })
      return { total: 0, compact: 0 }
    }
    this._directory_selected_token_counts.set(dir_path, selected_tokens)
    this._directory_selected_compact_token_counts.set(
      dir_path,
      selected_compact_tokens
    )
    return { total: selected_tokens, compact: selected_compact_tokens }
  }

  public async get_checked_files_token_count(options?: {
    exclude_file_path?: string
  }): Promise<{ total: number; compact: number }> {
    const checked_files = this._provider.get_checked_files()
    const result = { total: 0, compact: 0 }

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
            result.total += this._file_token_counts.get(file_path)!
            result.compact += this._file_compact_token_counts.get(file_path)!
          } else {
            const count = await this.calculate_file_tokens(file_path)
            result.total += count.total
            result.compact += count.compact
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

    return result
  }

  public dispose() {
    if (this._token_cache_update_timeout) {
      clearTimeout(this._token_cache_update_timeout)
    }
  }

  private _flatten_tree(
    node: TokenCacheNode,
    prefix: string = ''
  ): { [file_path: string]: TokenData } {
    const result: { [file_path: string]: TokenData } = {}

    for (const key in node) {
      const value = node[key]
      const new_path = prefix ? `${prefix}/${key}` : key

      if (Array.isArray(value)) {
        result[new_path] = value as TokenData
      } else {
        const flat_children = this._flatten_tree(
          value as TokenCacheNode,
          new_path
        )
        Object.assign(result, flat_children)
      }
    }

    return result
  }

  private _build_tree(files: {
    [file_path: string]: TokenData
  }): TokenCacheNode {
    const root: TokenCacheNode = {}

    for (const [file_path, data] of Object.entries(files)) {
      const parts = file_path.split('/')
      let current = root

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]
        if (!current[part] || Array.isArray(current[part])) {
          current[part] = {}
        }
        current = current[part] as TokenCacheNode
      }

      current[parts[parts.length - 1]] = data
    }

    return root
  }
}
