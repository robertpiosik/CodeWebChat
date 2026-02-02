import { useState } from 'react'
import { PromptField, type EditFormat } from './PromptField'

export default {
  component: PromptField
}

export const Empty = () => (
  <PromptField
    value=""
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="edit-context"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_mode={false}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    on_curly_braces_click={() => {}}
    invocation_count={1}
    on_invocation_count_change={(count) =>
      console.log('Invocation count changed:', count)
    }
    on_go_to_file={(path) => console.log('Go to file:', path)}
    prune_context_instructions_prefix=""
    on_prune_context_instructions_prefix_change={(val) =>
      console.log('Prune prefix changed:', val)
    }
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_document={(content) => console.log('Paste document:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_document={(hash) => console.log('Open document:', hash)}
  />
)

export const WithText = () => (
  <PromptField
    value="Hello, this is a sample message"
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="edit-context"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_mode={false}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    on_curly_braces_click={() => {}}
    invocation_count={1}
    on_invocation_count_change={(count) =>
      console.log('Invocation count changed:', count)
    }
    on_go_to_file={(path) => console.log('Go to file:', path)}
    prune_context_instructions_prefix=""
    on_prune_context_instructions_prefix_change={(val) =>
      console.log('Prune prefix changed:', val)
    }
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_document={(content) => console.log('Paste document:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_document={(hash) => console.log('Open document:', hash)}
  />
)

export const LongText = () => (
  <PromptField
    value="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="edit-context"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_mode={false}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    on_curly_braces_click={() => {}}
    invocation_count={1}
    on_invocation_count_change={(count) =>
      console.log('Invocation count changed:', count)
    }
    on_go_to_file={(path) => console.log('Go to file:', path)}
    prune_context_instructions_prefix=""
    on_prune_context_instructions_prefix_change={(val) =>
      console.log('Prune prefix changed:', val)
    }
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_document={(content) => console.log('Paste document:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_document={(hash) => console.log('Open document:', hash)}
  />
)

export const WithPlaceholderSavedContext = () => (
  <PromptField
    value='Ask about the #SavedContext(JSON "My Context")'
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="edit-context"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_mode={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    invocation_count={1}
    on_invocation_count_change={(count) =>
      console.log('Invocation count changed:', count)
    }
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_curly_braces_click={() => {}}
    prune_context_instructions_prefix=""
    on_prune_context_instructions_prefix_change={(val) =>
      console.log('Prune prefix changed:', val)
    }
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_document={(content) => console.log('Paste document:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_document={(hash) => console.log('Open document:', hash)}
  />
)

export const WithPlaceholderSelection = () => (
  <PromptField
    value="Ask about the #Selection"
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="edit-context"
    current_selection={{
      text: 'Selected text content',
      start_line: 1,
      start_col: 1,
      end_line: 1,
      end_col: 22
    }}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_mode={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    invocation_count={1}
    on_invocation_count_change={(count) =>
      console.log('Invocation count changed:', count)
    }
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_curly_braces_click={() => {}}
    prune_context_instructions_prefix=""
    on_prune_context_instructions_prefix_change={(val) =>
      console.log('Prune prefix changed:', val)
    }
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_document={(content) => console.log('Paste document:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_document={(hash) => console.log('Open document:', hash)}
  />
)

export const WithCommit = () => (
  <PromptField
    value='Ask about #Commit(my-repo:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 "Initial commit")'
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="edit-context"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_mode={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    invocation_count={1}
    on_invocation_count_change={(count) =>
      console.log('Invocation count changed:', count)
    }
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_curly_braces_click={() => {}}
    prune_context_instructions_prefix=""
    on_prune_context_instructions_prefix_change={(val) =>
      console.log('Prune prefix changed:', val)
    }
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_document={(content) => console.log('Paste document:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_document={(hash) => console.log('Open document:', hash)}
  />
)

export const WithCommitWithQuotes = () => (
  <PromptField
    value='Ask about #Commit(my-repo:a1b2c3d "feat: add \"cool\" feature")'
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="edit-context"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_mode={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    invocation_count={1}
    on_invocation_count_change={(count) =>
      console.log('Invocation count changed:', count)
    }
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_curly_braces_click={() => {}}
    prune_context_instructions_prefix=""
    on_prune_context_instructions_prefix_change={(val) =>
      console.log('Prune prefix changed:', val)
    }
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_document={(content) => console.log('Paste document:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_document={(hash) => console.log('Open document:', hash)}
  />
)
export const WithContextAtCommit = () => (
  <PromptField
    value='Ask about #ContextAtCommit(my-repo:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 "Initial commit")'
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="edit-context"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_mode={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    invocation_count={1}
    on_invocation_count_change={(count) =>
      console.log('Invocation count changed:', count)
    }
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_curly_braces_click={() => {}}
    prune_context_instructions_prefix=""
    on_prune_context_instructions_prefix_change={(val) =>
      console.log('Prune prefix changed:', val)
    }
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_document={(content) => console.log('Paste document:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_document={(hash) => console.log('Open document:', hash)}
  />
)

export const WithEditFormatSelector = () => {
  const [edit_format, set_edit_format] = useState<EditFormat>('diff')
  return (
    <PromptField
      value="Hello, this is a sample message"
      chat_history={[]}
      on_change={(value) => console.log('Changed:', value)}
      on_submit={() => console.log('Submitted')}
      on_copy={() => console.log('Copied')}
      is_connected={true}
      prompt_type="edit-context"
      current_selection={null}
      currently_open_file_path="/path/to/file"
      on_caret_position_change={(pos) => console.log('Caret position:', pos)}
      is_web_mode={false}
      on_at_sign_click={() => console.log('@ clicked')}
      on_hash_sign_click={() => console.log('# clicked')}
      on_submit_with_control={() => console.log('Submitted with control')}
      on_curly_braces_click={() => {}}
      show_edit_format_selector={true}
      edit_format={edit_format}
      on_edit_format_change={set_edit_format}
      context_file_paths={[]}
      invocation_count={1}
      on_invocation_count_change={set_edit_format as any}
      on_go_to_file={(path) => console.log('Go to file:', path)}
      prune_context_instructions_prefix=""
      on_prune_context_instructions_prefix_change={(val) =>
        console.log('Prune prefix changed:', val)
      }
      on_pasted_lines_click={(path, start, end) =>
        console.log('Pasted lines clicked:', path, start, end)
      }
      on_open_url={(url) => console.log('Open URL:', url)}
      on_paste_image={(content) => console.log('Paste image:', content)}
      on_paste_document={(content) => console.log('Paste document:', content)}
      on_open_image={(hash) => console.log('Open image:', hash)}
      on_open_document={(hash) => console.log('Open document:', hash)}
    />
  )
}

export const WithFilePaths = () => (
  <PromptField
    value="This is about `path/to/my/file.ts` and not about `another/file.txt`"
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="edit-context"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_mode={false}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    on_curly_braces_click={() => {}}
    on_go_to_file={(path) => console.log('Go to file:', path)}
    context_file_paths={['path/to/my/file.ts']}
    invocation_count={1}
    on_invocation_count_change={(count) =>
      console.log('Invocation count changed:', count)
    }
    prune_context_instructions_prefix=""
    on_prune_context_instructions_prefix_change={(val) =>
      console.log('Prune prefix changed:', val)
    }
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_document={(content) => console.log('Paste document:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_document={(hash) => console.log('Open document:', hash)}
  />
)
