import * as path from 'path'
import * as fs from 'fs'
import { promisify } from 'util'
import { execFile } from 'child_process'

const execFileAsync = promisify(execFile)

async function get_all_files(dir: string): Promise<string[]> {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    dirents.map(async (dirent) => {
      const res = path.resolve(dir, dirent.name)
      return dirent.isDirectory() ? get_all_files(res) : res
    })
  )
  return Array.prototype.concat(...files) as string[]
}

export const generate_diff_markdown = async (
  temp_dir_path: string,
  file_mappings: Map<string, { original: string; dest_rel: string }>
): Promise<string> => {
  let diff_markdown = ''
  const temp_files = await get_all_files(temp_dir_path)

  for (const temp_file of temp_files) {
    const rel_path = path.relative(temp_dir_path, temp_file)
    const unix_rel_path = rel_path.replace(/\\/g, '/')

    const temp_file_resolved = path.resolve(temp_file)
    let mapping = file_mappings.get(temp_file)
    if (!mapping) {
      for (const [dest_path, map] of file_mappings.entries()) {
        if (path.resolve(dest_path) === temp_file_resolved) {
          mapping = map
          break
        }
      }
    }

    if (mapping) {
      const original_content = await fs.promises.readFile(
        mapping.original,
        'utf-8'
      )
      const new_content = await fs.promises.readFile(temp_file, 'utf-8')

      if (original_content !== new_content) {
        try {
          await execFileAsync('git', [
            'diff',
            '--no-index',
            mapping.original,
            temp_file
          ])
        } catch (err: any) {
          if (err.code === 1 && err.stdout) {
            const stdout: string = err.stdout
            const diff_lines = stdout.split('\n')
            const at_at_index = diff_lines.findIndex((l) =>
              l.startsWith('@@ ')
            )
            if (at_at_index !== -1) {
              const diff_body = diff_lines.slice(at_at_index).join('\n')
              diff_markdown +=
                '\n### Updated file: `' +
                unix_rel_path +
                '`\n\n```diff\n--- a/' +
                unix_rel_path +
                '\n+++ b/' +
                unix_rel_path +
                '\n' +
                diff_body +
                (diff_body.endsWith('\n') ? '' : '\n') +
                '```\n'
            } else {
              diff_markdown +=
                '\n### Updated file: `' +
                unix_rel_path +
                '`\n\n```\n' +
                new_content +
                (new_content.endsWith('\n') ? '' : '\n') +
                '```\n'
            }
          } else {
            diff_markdown +=
              '\n### Updated file: `' +
              unix_rel_path +
              '`\n\n```\n' +
              new_content +
              (new_content.endsWith('\n') ? '' : '\n') +
              '```\n'
          }
        }
      }
    } else {
      const new_content = await fs.promises.readFile(temp_file, 'utf-8')
      diff_markdown +=
        '\n### Created file: `' +
        unix_rel_path +
        '`\n\n```\n' +
        new_content +
        (new_content.endsWith('\n') ? '' : '\n') +
        '```\n'
    }
  }

  for (const [dest_path, mapping] of file_mappings.entries()) {
    const normalized_dest = path.resolve(dest_path)
    const is_kept = temp_files.some(
      (t) => path.resolve(t) === normalized_dest
    )
    if (!is_kept) {
      diff_markdown += '\n### Deleted file: `' + mapping.dest_rel + '`\n'
    }
  }

  return diff_markdown
}
