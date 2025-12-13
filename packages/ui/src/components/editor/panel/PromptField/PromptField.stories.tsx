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
    is_in_code_completions_mode={false}
    has_active_selection={false}
    has_active_editor={true}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_mode={false}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_search_click={() => console.log('Search clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    on_curly_braces_click={() => {}}
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
    is_in_code_completions_mode={false}
    has_active_selection={false}
    has_active_editor={true}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_mode={false}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_search_click={() => console.log('Search clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    on_curly_braces_click={() => {}}
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
    is_in_code_completions_mode={false}
    has_active_selection={false}
    has_active_editor={true}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_mode={false}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_search_click={() => console.log('Search clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    on_curly_braces_click={() => {}}
  />
)

export const WithPlaceholderSavedContext = () => (
  <PromptField
    value='Ask about the #SavedContext:JSON "My Context"'
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={false}
    has_active_editor={true}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    on_search_click={() => console.log('Search clicked')}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_mode={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    on_curly_braces_click={() => {}}
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
    is_in_code_completions_mode={false}
    has_active_editor={true}
    has_active_selection={true}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    on_search_click={() => console.log('Search clicked')}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_mode={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    on_curly_braces_click={() => {}}
  />
)

export const WithCommit = () => (
  <PromptField
    value='Ask about #Commit:my-repo:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 "Initial commit"'
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={false}
    has_active_editor={true}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    on_search_click={() => console.log('Search clicked')}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_mode={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    on_curly_braces_click={() => {}}
  />
)

export const WithCommitWithQuotes = () => (
  <PromptField
    value='Ask about #Commit:my-repo:a1b2c3d "feat: add "cool" feature"'
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={false}
    has_active_editor={true}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    on_search_click={() => console.log('Search clicked')}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_mode={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    on_curly_braces_click={() => {}}
  />
)
export const WithContextAtCommit = () => (
  <PromptField
    value='Ask about #ContextAtCommit:my-repo:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 "Initial commit"'
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={false}
    has_active_editor={true}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    on_search_click={() => console.log('Search clicked')}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_mode={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    context_file_paths={[]}
    on_curly_braces_click={() => {}}
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
      is_in_code_completions_mode={false}
      has_active_selection={false}
      has_active_editor={true}
      on_caret_position_change={(pos) => console.log('Caret position:', pos)}
      is_web_mode={false}
      on_at_sign_click={() => console.log('@ clicked')}
      on_hash_sign_click={() => console.log('# clicked')}
      on_search_click={() => console.log('Search clicked')}
      on_submit_with_control={() => console.log('Submitted with control')}
      on_curly_braces_click={() => {}}
      show_edit_format_selector={true}
      edit_format={edit_format}
      on_edit_format_change={set_edit_format}
      edit_format_instructions={{
        whole: 'Use the whole...',
        truncated: 'Use truncated...',
        diff: 'Use diff...'
      }}
      context_file_paths={[]}
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
    is_in_code_completions_mode={false}
    has_active_selection={false}
    has_active_editor={true}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_mode={false}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_search_click={() => console.log('Search clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    on_curly_braces_click={() => {}}
    on_go_to_file={(path) => console.log('Go to file:', path)}
    context_file_paths={['path/to/my/file.ts']}
  />
)
