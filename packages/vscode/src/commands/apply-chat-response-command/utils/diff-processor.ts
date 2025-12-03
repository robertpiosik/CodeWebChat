import * as vscode from 'vscode'
import * as fs from 'fs'
import { Logger } from '@shared/utils/logger'

class SearchBlock {
  public search_lines: string[]
  public replace_lines: string[]
  public search_block_start_index: number

  public constructor(
    search_lines: string[],
    replace_lines: string[],
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
  diff_path_patch: string
}): Promise<void> => {
  const file_content = fs.readFileSync(params.file_path, 'utf8')
  const diff_patch_content = fs.readFileSync(params.diff_path_patch, 'utf8')

  const result = apply_diff({
    original_code: file_content,
    diff_patch: diff_patch_content
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
  } catch (error) {
    throw new Error('Failed to save file after applying diff patch')
  }
}

export const apply_diff = (params: {
  original_code: string
  diff_patch: string
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

      const line_normalized_2 = line_normalized.replace(/\s+/g, '')
      const line_normalized_3 = line_normalized_2.toLowerCase()

      original_code_lines_normalized.push({
        key: line_count,
        value: line_normalized_3
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
      if (line_normalized.startsWith(' ')) {
        line_normalized = line_normalized.replace(/^\s+/, '~')
      }

      const line_normalized_2 = line_normalized.replace(/\s+/g, '')
      const line_normalized_3 = line_normalized_2.toLowerCase()
      patch_lines_normalized.push(line_normalized_3)
    }

    const search_replace_blocks = []
    let search_chunks = []
    let replace_chunks = []

    let inside_replace_block = false
    let has_context_lines = false

    for (let i = 0; i < patch_lines_normalized.length; i++) {
      const line = patch_lines_normalized[i]
      const line_original = patch_lines_original[i]

      if (line.startsWith('@@')) {
        if (search_chunks.length > 0 || replace_chunks.length > 0) {
          // Validate that the hunk has context before adding it
          if (
            !has_context_lines &&
            search_chunks.length === 0 &&
            replace_chunks.length > 0
          ) {
            throw new Error(
              'Zero-context hunk detected: hunks with only additions and no context lines cannot be reliably applied. ' +
                'The diff must include surrounding unchanged lines for proper placement.'
            )
          }

          search_replace_blocks.push(
            new SearchBlock(search_chunks, replace_chunks, -1)
          )
        }
        search_chunks = []
        replace_chunks = []
        inside_replace_block = false
        has_context_lines = false
      }

      if (line.startsWith('-') || line.startsWith('~')) {
        if (inside_replace_block) {
          inside_replace_block = false

          if (search_chunks.length > 0 || replace_chunks.length > 0) {
            search_replace_blocks.push(
              new SearchBlock(search_chunks, replace_chunks, -1)
            )
          }

          search_chunks = []
          replace_chunks = []
          has_context_lines = false
        }

        if (line.startsWith('--')) {
          // Remove the leading '-' from the search line only if there are two -
          // Fix for files with lines that start with - eg. markdown
          search_chunks.push(line.substring(1, line.length))
        } else if (line.startsWith('~nnn') || line.startsWith('-~nnn')) {
          search_chunks.push('~nnn')
        } else {
          search_chunks.push(line.replace(/^-/, '').replace(/^~/, ''))
        }

        // Also replace unchanged lines
        if (line.startsWith('~nnn')) {
          replace_chunks.push(line_original.replace(/^~nnn/, '') + '\n')
          has_context_lines = true
        } else if (line.startsWith('~')) {
          replace_chunks.push(line_original.replace(/^~/, '') + '\n')
          has_context_lines = true
        }

        continue
      }

      if (line.startsWith('+')) {
        inside_replace_block = true

        if (line.startsWith('++')) {
          // Remove the leading '+' from the search line only if there are two +
          replace_chunks.push(line_original.substring(1, line.length) + '\n')
        } else if (line.startsWith('+~nnn')) {
          replace_chunks.push(line_original.replace(/^\+~nnn/, '') + '\n')
        } else {
          replace_chunks.push(line_original.replace(/^\+/, '') + '\n')
        }
      }
    }

    if (search_chunks.length > 0) {
      // A extra trailing new line is sometimes added by the AI model
      if (search_chunks[search_chunks.length - 1] == '~nnn') {
        search_chunks.pop()
        replace_chunks.pop()
      }

      if (search_chunks.length != 0 || replace_chunks.length != 0) {
        // Final validation for zero-context hunks
        if (
          !has_context_lines &&
          search_chunks.length === 0 &&
          replace_chunks.length > 0
        ) {
          throw new Error(
            'Zero-context hunk detected: hunks with only additions and no context lines cannot be reliably applied. ' +
              'The diff must include surrounding unchanged lines for proper placement.'
          )
        }

        // This is crucial for diffs that only have deletions
        search_replace_blocks.push(
          new SearchBlock(search_chunks, replace_chunks, -1)
        )
      }
    }

    let previous_found_index = 0
    for (let i = 0; i < search_replace_blocks.length; i++) {
      const search_replace_block = search_replace_blocks[i]
      const search_string = search_replace_block.search_lines.join('')

      // We start search from the previous found index to ensure duplicate code is not found at wrong index
      let found = false
      for (
        let j = previous_found_index;
        j < original_code_lines_normalized.length;
        j++
      ) {
        // This is a special case when a patch hunk starts with one or more + lines and no context lines
        if (
          search_replace_block.search_lines.length == 0 &&
          previous_found_index == 0
        ) {
          search_replace_block.search_block_start_index = -1 // insert at the start of the file
          found = true
        } else {
          const chunk = original_code_lines_normalized.slice(
            j,
            j + search_replace_block.search_lines.length
          )

          const chunk_string = chunk.map((line) => line.value).join('')

          if (chunk_string == search_string) {
            if (previous_found_index > chunk[0].key) {
              // This should never happen
              throw new Error('Found index is less than previous found index')
            }

            search_replace_block.search_block_start_index = chunk[0].key
            found = true

            previous_found_index = chunk[0].key
            break
          }
        }
      }

      if (!found) {
        search_replace_block.search_block_start_index = -2 // Not found

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
        block.get_start_index() == -1 ? 0 : block.get_start_index() // When -1, insert at the start of the file
      const search_count = block.get_search_count()
      const replacement_content = block.replace_lines

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
