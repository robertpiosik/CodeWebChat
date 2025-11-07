import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import { Logger } from '@shared/utils/logger'

export async function resolve_glob_patterns(
  patterns: string[],
  workspace_provider: WorkspaceProvider
): Promise<string[]> {
  const all_files_in_cache = new Set<string>()

  for (const root of workspace_provider.getWorkspaceRoots()) {
    const files = await workspace_provider.find_all_files(root)
    files.forEach((file) => all_files_in_cache.add(file))
  }

  let resolved_final_paths: Set<string>
  const has_positive_include_directives = patterns.some(
    (p) => !p.startsWith('!')
  )

  if (!has_positive_include_directives) {
    resolved_final_paths = new Set(all_files_in_cache)
  } else {
    resolved_final_paths = new Set<string>()
  }

  for (const pattern_string of patterns) {
    const is_exclude = pattern_string.startsWith('!')
    const current_actual_pattern = is_exclude
      ? pattern_string.substring(1)
      : pattern_string
    const normalized_pattern = path.normalize(current_actual_pattern)

    const files_this_rule_applies_to = new Set<string>()

    if (fs.existsSync(normalized_pattern)) {
      if (fs.lstatSync(normalized_pattern).isDirectory()) {
        const dir_path = normalized_pattern
        for (const cached_file of all_files_in_cache) {
          const normalized_cached_file = path.normalize(cached_file)
          if (normalized_cached_file.startsWith(dir_path + path.sep)) {
            files_this_rule_applies_to.add(cached_file)
          }
        }
      } else if (fs.lstatSync(normalized_pattern).isFile()) {
        if (all_files_in_cache.has(normalized_pattern)) {
          files_this_rule_applies_to.add(normalized_pattern)
        }
      }
    } else {
      try {
        const glob_matches = glob.sync(normalized_pattern, { absolute: true })
        glob_matches.forEach((match) => {
          const normalized_match = path.normalize(match)
          if (all_files_in_cache.has(normalized_match)) {
            files_this_rule_applies_to.add(normalized_match)
          }
        })
      } catch (error) {
        Logger.warn({
          function_name: 'resolve_glob_patterns',
          message: `Failed to resolve glob pattern "${normalized_pattern}"`,
          data: error
        })
      }
    }

    if (is_exclude) {
      files_this_rule_applies_to.forEach((file) =>
        resolved_final_paths.delete(file)
      )
    } else {
      files_this_rule_applies_to.forEach((file) =>
        resolved_final_paths.add(file)
      )
    }
    Logger.info({
      message: `Files this pattern ${pattern_string} applies to: ${files_this_rule_applies_to.size}`,
      data: {
        files_this_rule_applies_to
      }
    })
  }

  Logger.info({
    message: `Resolved final paths: ${resolved_final_paths.size}`
  })

  return [...resolved_final_paths]
}
