import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { Logger } from '@/helpers/logger'

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

export const process_diff_patch = async (
  file_path: string,
  diff_path_patch: string
): Promise<void> => {
  if (!fs.existsSync(file_path)) {
    // Check if file exists, if not then create it and any directories
    try {
      // Ensure the directory exists
      const dir_path = path.dirname(file_path)
      await fs.promises.mkdir(dir_path, { recursive: true })

      // Write the new file
      await fs.promises.writeFile(file_path, '', { flag: 'w' })

      // Delay to prevent file system issues when creating a lot of files quickly
      await new Promise((f) => setTimeout(f, 500))

      Logger.log({
        function_name: 'process_diff_patch',
        message: `File created successfully at: ${file_path}`
      })
    } catch (error: any) {
      Logger.error({
        function_name: 'process_diff_patch',
        message: `Error creating file: ${error.message}`
      })
      throw new Error(`Failed to create file: ${error.message}`)
    }
  }

  const file_content = fs.readFileSync(file_path, 'utf8')
  const diff_patch_content = fs.readFileSync(diff_path_patch, 'utf8')

  let result = ''

  // New file or apply diff
  if (diff_patch_content.includes('--- /dev/null')) {
    // New file
    result = create_new_file_from_patch(diff_patch_content)
  } else {
    // Apply diff
    result = apply_diff_patch(file_content, diff_patch_content)
  }

  // Save result to file
  try {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.file(file_path),
      Buffer.from(result, 'utf8')
    )
    Logger.log({
      function_name: 'process_diff_patch',
      message: 'File saved successfully'
    })
  } catch (error) {
    Logger.error({
      function_name: 'process_diff_patch',
      message: 'Error saving file',
      data: error
    })
    throw new Error('Failed to save file after applying diff patch')
  }
}

const create_new_file_from_patch = (diff_patch: string): string => {
  let new_file_content = ''

  const patch_normalized = diff_patch.replace(/\r\n/g, '\n')
  const patch_lines = patch_normalized.split('\n')

  for (let i = 0; i < patch_lines.length; i++) {
    const line = patch_lines[i]

    // Skip patch header and chunk identifier lines
    if (
      line.startsWith('diff --git') ||
      line.startsWith('index') ||
      line.startsWith('new file mode') ||
      line.startsWith('---') ||
      line.startsWith('+++') ||
      line.startsWith('@@')
    ) {
      continue
    }

    new_file_content += line.replace(/^\+/, '') + '\n'
  }

  return new_file_content
}

const apply_diff_patch = (
  original_code: string,
  diff_patch: string
): string => {
  try {
    const original_code_normalized = original_code.replace(/\r\n/g, '\n') // Remove windows line endings
    const original_code_lines = original_code_normalized.split(/^/m) // Split by new line
    const original_code_lines_normalized = []

    const patch_normalized = diff_patch.replace(/\r\n/g, '\n') // Remove windows line endings
    const patch_lines = patch_normalized.split('\n') // Split by new line
    const patch_lines_original = []
    const patch_lines_normalized = []

    // === Count new lines at the end of the original text ===
    const trailing_new_lines = count_trailing_new_lines(original_code)

    // .split will miss the last new line so we must add it manually if any exist
    if (trailing_new_lines > 0) {
      original_code_lines.push('\n')
    }

    // === Normalize the code lines ===
    let line_count = 0
    for (let i = 0; i < original_code_lines.length; i++) {
      let line = original_code_lines[i]

      // Treat empty new lines as ~nnn
      if (line.trim() === '') {
        line = '~nnn'
      }

      // Remove all line endings
      const line_normalized = line
        .replace(/\r\n/g, '')
        .replace(/\r/g, '')
        .replace(/\n/g, '')

      // Remove all white spaces
      const line_normalized_2 = line_normalized.replace(/\s+/g, '')

      // Change to lower case
      const line_normalized_3 = line_normalized_2.toLowerCase()

      // Store the normilized code line
      original_code_lines_normalized.push({
        key: line_count,
        value: line_normalized_3
      })

      line_count++
    }

    // === Normalize the patch lines ===
    for (let i = 0; i < patch_lines.length; i++) {
      let line = patch_lines[i]

      // If line is part of git patch header, skip it
      if (
        line.startsWith('diff --git') ||
        line.startsWith('index') ||
        line.startsWith('---') ||
        line.startsWith('+++')
      ) {
        continue
      }

      // Treat empty new lines as ~nnn
      if (line.trim() === '') {
        // Orignal empty line
        line = '~nnn'
      } else if (line.trim() === '+') {
        // Add empty line
        line = '+~nnn'
      } else if (line.trim() === '-') {
        // Remove empty line
        line = '-~nnn'
      }

      // Save original patch line for applying later. Remove leading space.
      patch_lines_original.push(
        line.startsWith(' ') ? line.substring(1, line.length) : line
      )

      // Remove all line endings
      let line_normalized = line
        .replace(/\r\n/g, '')
        .replace(/\r/g, '')
        .replace(/\n/g, '')

      // If white space at start convert to ~
      if (line_normalized.startsWith(' ')) {
        line_normalized = line_normalized.replace(/^\s+/, '~')
      }

      // Remove all white spaces
      const line_normalized_2 = line_normalized.replace(/\s+/g, '')

      // Change to lower case
      const line_normalized_3 = line_normalized_2.toLowerCase()

      // Store the normilized patch line
      patch_lines_normalized.push(line_normalized_3)
    }

    // if line does not start with + or - then is unmodified code add to search and replace
    // if line starts with - then add to search
    // if line starts with ~ then add to search and replace
    // if line starts with + then add to replace

    // Contains the search and replace chunks
    const search_replace_blocks = []

    // Contains the search and replace lines for each chunk
    let search_chunks = []
    let replace_chunks = []

    // === Process the patch lines ===
    let inside_replace_block = false
    for (let i = 0; i < patch_lines_normalized.length; i++) {
      const line = patch_lines_normalized[i]
      const line_original = patch_lines_original[i]

      if (line.startsWith('@@')) {
        // Start of new hunk
        // Reset for new hunk
        search_chunks = []
        replace_chunks = []
        inside_replace_block = false
      }

      if (line.startsWith('-') || line.startsWith('~')) {
        if (inside_replace_block) {
          // We hit a new search block, store the previous one
          inside_replace_block = false

          // Don't add the block if there is no matching search or replace
          if (search_chunks.length > 0 || replace_chunks.length > 0) {
            // Add the previous search block to the searchReplaceBlocks
            search_replace_blocks.push(
              new SearchBlock(search_chunks, replace_chunks, -1)
            )
          }

          // Clear the search and replace chunks
          search_chunks = []
          replace_chunks = []
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
        } else if (line.startsWith('~')) {
          replace_chunks.push(line_original.replace(/^~/, '') + '\n')
        }

        continue
      }

      if (line.startsWith('+')) {
        inside_replace_block = true

        if (line.startsWith('++')) {
          // Remove the leading '+' from the search line only if there are two +
          replace_chunks.push(line_original.substring(1, line.length) + '\n')
        } else if (line.startsWith('+~nnn')) {
          // Remove new line tag from start of line
          replace_chunks.push(line_original.replace(/^\+~nnn/, '') + '\n')
        } else {
          // Remove + from start of line
          replace_chunks.push(line_original.replace(/^\+/, '') + '\n')
        }
      }
    }

    // Reached end of patch. Add the final search block to the searchReplaceBlocks
    if (search_chunks.length > 0) {
      // When there are only + lines in the last search block and corresponding no replace lines remove a trailing ~nnn if exists
      // A extra trailing new line is sometimes added by the AI model
      if (search_chunks[search_chunks.length - 1] == '~nnn') {
        // If the last search chunk ends in a ~nnn (blank new line), remove it and it's corresponding replace chunk new line
        search_chunks.pop()
        replace_chunks.pop()
      }

      if (search_chunks.length != 0 || replace_chunks.length != 0) // Don't add search or replace blocks if empty
      {
        // Add the final search block to the searchReplaceBlocks
        // This is crucial for diffs that only have deletions
        search_replace_blocks.push(
          new SearchBlock(search_chunks, replace_chunks, -1)
        )
      }
    }

    //print_debug(original_code_lines, original_code_lines_normalized, patch_lines_normalized, search_replace_blocks);

    // === Work through search and replace blocks finding start of search block ===
    let previous_found_index = 0
    for (let i = 0; i < search_replace_blocks.length; i++) {
      const search_replace_block = search_replace_blocks[i]

      // Create search string chunk from searchReplaceBlock
      const search_string = search_replace_block.search_lines.join('')

      //console.log('Search string: ' + search_string);

      // Iterate over the originalCodeLinesNormalized to find the search string
      // We start search from the previous found index to ensure duplicate code is not found at wrong index
      let found = false
      for (
        let j = previous_found_index;
        j < original_code_lines_normalized.length;
        j++
      ) {
        // Create a chunk of lines from originalCodeLinesNormalized
        const chunk = original_code_lines_normalized.slice(
          j,
          j + search_replace_block.search_lines.length
        )
        const chunk_string = chunk.map((line) => line.value).join('')

        // console.log('Chunk string: ' + chunk_string);

        // If we have no search lines and only replace lines and our previous found index is 0
        // assume we are at the start of the file and set the search block start index to 0
        // This is a special case when a patch hunk starts with one or more + lines and no context lines
        if (search_replace_block.search_lines.length == 0 && previous_found_index == 0) 
        {
          search_replace_block.search_block_start_index = -1 // insert at the start of the file
          found = true
        }
        else
        {
          // Create a chunk of lines from originalCodeLinesNormalized
          const chunk = original_code_lines_normalized.slice(
            j,
            j + search_replace_block.search_lines.length
          )

          const chunk_string = chunk.map((line) => line.value).join('')

          //console.log('Chunk string: ' + chunk_string);
          //console.log('Previous found index: ' + previous_found_index);
          //console.log('Chunk: ' + JSON.stringify(chunk, null, 2));
       
          // Check if the chunk matches the search string
          if (chunk_string == search_string) {
            // Check if found index is greater than the previous found index
            if (previous_found_index > chunk[0].key) {
              // This should never happen
              throw new Error('Found index is less than previous found index')
            }

            // Store the index of the first line of the search block
            search_replace_block.search_block_start_index = chunk[0].key
            found = true

            previous_found_index = chunk[0].key // Update the previous index

            //console.log('Found search block at line ' + chunk[0].key);
            break
          }
        }
      }

      // If not found, set the search_block_start_index to -2
      if (!found) {
        search_replace_block.search_block_start_index = -2 // Not found

         const error_message = `Search block not found: ${search_string}`
        Logger.error({
          function_name: 'apply_diff_patch',
          message: error_message
        })
        Logger.error({
          function_name: 'apply_diff_patch',
          message: `search_replace_block: ${JSON.stringify(
            search_replace_block
          )}`
        })

        throw new Error(`Search block not found: ${search_string}`)
      }
    }

    // === Apply the search and replace blocks ===
    // Get all blocks with a valid start index
    const valid_blocks = search_replace_blocks.filter(
      (block) => block.get_start_index() !== -2
    )

    // Sort blocks by descending index
    valid_blocks.sort((a, b) => b.get_start_index() - a.get_start_index())

    const result_lines = [...original_code_lines] // Operate on a copy

    // Iterrate over the valid blocks and apply them
    for (const block of valid_blocks) {
      const start_index = block.get_start_index() == -1 ? 0 : block.get_start_index() // When -1, insert at the start of the file
      const search_count = block.get_search_count()
      const replacement_content = block.replace_lines // These are original lines

      if (start_index < 0 || start_index > result_lines.length) {
        // start_index can be == result_lines.length for appending
        Logger.error({
          function_name: 'apply_diff_patch',
          message: `Invalid start index ${start_index} for block application. Max index: ${
            result_lines.length - 1
          }`
        })
        continue
      }

      // Ensure search_count does not exceed available lines from start_index
      const actual_search_count = Math.min(
        search_count,
        result_lines.length - start_index
      )

      // console.log(`Applying block at index ${start_index}: removing ${actual_search_count} lines, inserting ${replacement_content.length} lines.`);
      // Apply the replacement
      result_lines.splice(
        start_index,
        actual_search_count,
        ...replacement_content
      )
    }

    // print_debug(result_lines, original_code_lines, original_code_lines_normalized, patch_lines_normalized, search_replace_blocks);

    return result_lines.join('')
  } catch (error) {
    Logger.error({
      function_name: 'apply_diff_patch',
      message: 'Error during diff processing',
      data: error
    })
    throw error
  }
}

// function print_debug(
//   original_code_lines: string[],
//   original_code_lines_normalized: any[],
//   patch_lines_normalized: string[],
//   search_replace_blocks: SearchBlock[]
// ) {
//   // Output the original code lines
//   console.log('\n=== Original Code Lines ===')
//   console.log(JSON.stringify(original_code_lines, null, 2))

//   // Output the search_replace_blocks in JSON format
//   console.log('=== Search and Replace Blocks ===')
//   console.log(JSON.stringify(search_replace_blocks, null, 2))

//   let output_code_lines = ''
//   for (let i = 0; i < original_code_lines_normalized.length; i++) {
//     output_code_lines +=
//       original_code_lines_normalized[i].key +
//       ' ' +
//       original_code_lines_normalized[i].value +
//       '\n'
//   }

//   // Output the normalized lines
//   console.log('=== Normalized Original Code Lines ===')
//   console.log(output_code_lines)

//   console.log('=== Normalized Patch Lines ===')
//   console.log(patch_lines_normalized.join('\n'))
// }

const count_trailing_new_lines = (text: string): number => {
  let count = 0
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] == '\n') {
      count++
    } else {
      break
    }
  }
  return count
}
