import { handle_empty_file } from './utils/empty-file-handler'
import {
  normalize_original_code,
  normalize_patch_lines
} from './utils/normalize'
import { parse_patch_blocks } from './utils/parse-blocks'
import { match_blocks } from './utils/match-blocks'
import { apply_blocks } from './utils/apply-blocks'

export const apply_diff = (params: {
  original_code: string
  diff_patch: string
  use_strict_whitespace?: boolean
}): string => {
  const original_code_normalized = params.original_code.replace(/\r\n/g, '\n')

  if (original_code_normalized.trim() == '') {
    const empty_file_result = handle_empty_file(params.diff_patch)
    if (empty_file_result !== null) {
      return empty_file_result
    }
  }

  const original_code_lines = original_code_normalized.split(/^/m)
  const original_code_lines_normalized = normalize_original_code({
    original_code_lines,
    use_strict_whitespace: params.use_strict_whitespace
  })

  const patch_normalized = params.diff_patch.replace(/\r\n/g, '\n')
  const patch_lines = patch_normalized.split('\n')
  const { patch_lines_original, patch_lines_normalized } =
    normalize_patch_lines({
      patch_lines,
      use_strict_whitespace: params.use_strict_whitespace
    })

  const search_replace_blocks = parse_patch_blocks({
    patch_lines_normalized,
    patch_lines_original
  })

  match_blocks({
    search_replace_blocks,
    original_code_lines_normalized
  })

  const invalid_blocks = search_replace_blocks.filter(
    (block) => block.search_block_start_index == -2
  )

  if (invalid_blocks.length > 0) {
    throw new Error(
      `Failed to apply ${invalid_blocks.length} hunk(s). Aborting diff application for this file.`
    )
  }

  const valid_blocks = search_replace_blocks
  valid_blocks.sort(
    (a, b) => b.search_block_start_index - a.search_block_start_index
  )

  return apply_blocks({
    valid_blocks,
    original_code_lines
  })
}
