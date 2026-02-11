import * as vscode from 'vscode'
import * as fs from 'fs'
import { Logger } from '@shared/utils/logger'

interface ReplaceLine {
  content: string
  search_index: number | null
}

class SearchBlock {
  public search_lines: string[]
  public replace_lines: ReplaceLine[]
  public search_block_start_index: number

  public constructor(
    search_lines: string[],
    replace_lines: ReplaceLine[],
    search_block_start_index: number
  ) {
    this.search_lines = search_lines
    this.replace_lines = replace_lines
    this.search_block_start_index = search_block_start_index
  }

  get_start_index() {
    return this.search_block_start_index
  }
  get_search_count() {
    return this.search_lines.length
  }
}

export const process_diff = async (params: {
  file_path: string
  diff_patch_path: string
  use_strict_whitespace?: boolean
}): Promise<string> => {
  const file_content = fs.readFileSync(params.file_path, 'utf8')
  const diff_patch_content = fs.readFileSync(params.diff_patch_path, 'utf8')

  const result = apply_diff({
    original_code: file_content,
    diff_patch: diff_patch_content,
    use_strict_whitespace: params.use_strict_whitespace
  })

  try {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(params.file_path),
      Buffer.from(result, 'utf8')
    )
    Logger.info({
      function_name: 'process_diff',
      message: 'File saved successfully'
    })
    return result
  } catch (error) {
    throw new Error('Failed to save file after applying diff patch')
  }
}

export const apply_diff = (params: {
  original_code: string
  diff_patch: string
  use_strict_whitespace?: boolean
}): string => {
  try {
    const original_code_normalized = params.original_code.replace(/\r\n/g, '\n')
    const original_code_lines = original_code_normalized.split(/^/m)
    const original_code_lines_normalized = []

    const patch_normalized = params.diff_patch.replace(/\r\n/g, '\n')
    const patch_lines = patch_normalized.split('\n')
    const patch_lines_original = []
    const patch_lines_normalized = []

    let line_count = 0
    for (let i = 0; i < original_code_lines.length; i++) {
      let line = original_code_lines[i]

      if (line.trim() == '') {
        line = '~nnn'
      }

      const line_normalized = line
        .replace(/\r\n/g, '')
        .replace(/\r/g, '')
        .replace(/\n/g, '')

      let line_normalized_processed = line_normalized.replace(/\s+/g, '')

      if (params.use_strict_whitespace) {
        line_normalized_processed = line_normalized
      }

      original_code_lines_normalized.push({
        key: line_count,
        value: line_normalized_processed
      })

      line_count++
    }

    for (let i = 0; i < patch_lines.length; i++) {
      let line = patch_lines[i]

      if (
        line.startsWith('diff --git') ||
        line.startsWith('index') ||
        line.startsWith('---') ||
        line.startsWith('+++')
      ) {
        continue
      }

      if (line.trim() == '') {
        line = '~nnn'
      } else if (line.trim() == '+') {
        line = '+~nnn'
      } else if (line.trim() == '-') {
        line = '-~nnn'
      }

      patch_lines_original.push(
        line.startsWith(' ') ? line.substring(1, line.length) : line
      )

      let line_normalized = line
        .replace(/\r\n/g, '')
        .replace(/\r/g, '')
        .replace(/\n/g, '')

      let line_normalized_processed = ''

      if (params.use_strict_whitespace) {
        if (line_normalized.startsWith(' ')) {
          line_normalized_processed = '~' + line_normalized.substring(1)
        } else {
          line_normalized_processed = line_normalized
        }
      } else {
        if (line_normalized.startsWith(' ')) {
          line_normalized = line_normalized.replace(/^\s+/, '~')
        }
        line_normalized_processed = line_normalized.replace(/\s+/g, '')
      }

      patch_lines_normalized.push(line_normalized_processed)
    }

    const search_replace_blocks: SearchBlock[] = []
    let search_chunks: string[] = []
    let replace_chunks: ReplaceLine[] = []

    let inside_replace_block = false
    let current_block_has_changes = false

    for (let i = 0; i < patch_lines_normalized.length; i++) {
      const line = patch_lines_normalized[i]
      const line_original = patch_lines_original[i]

      if (line.startsWith('@@')) {
        if (search_chunks.length > 0 || replace_chunks.length > 0) {
          if (current_block_has_changes) {
            search_replace_blocks.push(
              new SearchBlock(search_chunks, replace_chunks, -1)
            )
          }
        }
        search_chunks = []
        replace_chunks = []
        inside_replace_block = false
        current_block_has_changes = false
      }

      if (line.startsWith('-') || line.startsWith('~')) {
        if (inside_replace_block) {
          inside_replace_block = false

          if (search_chunks.length > 0 || replace_chunks.length > 0) {
            if (current_block_has_changes) {
              search_replace_blocks.push(
                new SearchBlock(search_chunks, replace_chunks, -1)
              )
            }
          }

          search_chunks = []
          replace_chunks = []
          current_block_has_changes = false
        }

        if (line.startsWith('-')) {
          current_block_has_changes = true
        }

        if (line.startsWith('~nnn') || line.startsWith('-~nnn')) {
          search_chunks.push('~nnn')
        } else {
          search_chunks.push(line.replace(/^-/, '').replace(/^~/, ''))
        }

        if (line.startsWith('~nnn')) {
          replace_chunks.push({
            content: line_original.replace(/^~nnn/, '') + '\n',
            search_index: search_chunks.length - 1
          })
        } else if (line.startsWith('~')) {
          replace_chunks.push({
            content: line_original + '\n',
            search_index: search_chunks.length - 1
          })
        }

        continue
      }

      if (line.startsWith('+')) {
        inside_replace_block = true
        current_block_has_changes = true

        if (line.startsWith('+~nnn')) {
          replace_chunks.push({
            content: line_original.replace(/^\+~nnn/, '') + '\n',
            search_index: null
          })
        } else {
          replace_chunks.push({
            content: line_original.replace(/^\+/, '') + '\n',
            search_index: null
          })
        }
      }
    }

    if (search_chunks.length > 0) {
      if (search_chunks[search_chunks.length - 1] == '~nnn') {
        search_chunks.pop()
        replace_chunks.pop()
      }

      if (search_chunks.length != 0 || replace_chunks.length != 0) {
        if (current_block_has_changes) {
          search_replace_blocks.push(
            new SearchBlock(search_chunks, replace_chunks, -1)
          )
        }
      }
    }

    let previous_found_index = 0
    for (let i = 0; i < search_replace_blocks.length; i++) {
      const search_replace_block = search_replace_blocks[i]
      const search_string = search_replace_block.search_lines.join('')

      let found = false
      for (
        let j = previous_found_index;
        j < original_code_lines_normalized.length;
        j++
      ) {
        if (
          search_replace_block.search_lines.length == 0 &&
          previous_found_index == 0
        ) {
          search_replace_block.search_block_start_index = -1
          found = true
          break
        } else {
          const chunk = original_code_lines_normalized.slice(
            j,
            j + search_replace_block.search_lines.length
          )

          const chunk_string = chunk.map((line) => line.value).join('')

          if (chunk_string == search_string) {
            if (previous_found_index > chunk[0].key) {
              throw new Error('Found index is less than previous found index')
            }

            search_replace_block.search_block_start_index = chunk[0].key
            found = true

            previous_found_index =
              chunk[0].key + search_replace_block.search_lines.length
            break
          }
        }
      }

      if (!found) {
        search_replace_block.search_block_start_index = -2

        throw new Error(`Search block not found: ${search_string}`)
      }
    }

    const valid_blocks = search_replace_blocks.filter(
      (block) => block.get_start_index() !== -2
    )
    valid_blocks.sort((a, b) => b.get_start_index() - a.get_start_index())

    const result_lines = [...original_code_lines]

    for (const block of valid_blocks) {
      const start_index =
        block.get_start_index() == -1 ? 0 : block.get_start_index()
      const search_count = block.get_search_count()
      const replacement_content = block.replace_lines.map((line) => {
        if (
          line.search_index !== null &&
          start_index + line.search_index < original_code_lines.length
        ) {
          let originalContent =
            original_code_lines[start_index + line.search_index]
          if (!originalContent.endsWith('\n')) {
            originalContent += '\n'
          }
          return originalContent
        }
        return line.content
      })

      if (start_index < 0 || start_index > result_lines.length) {
        continue
      }

      const actual_search_count = Math.min(
        search_count,
        result_lines.length - start_index
      )

      result_lines.splice(
        start_index,
        actual_search_count,
        ...replacement_content
      )
    }

    return result_lines.join('')
  } catch (error) {
    Logger.warn({
      function_name: 'apply_diff',
      message: 'Diff patch processor failed.',
      data: error
    })
    throw error
  }
}
