import { useState } from 'react'
import { PromptField, type EditFormat } from './PromptField'
import { TARGET } from '@shared/types/mode'

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
    prompt_type="edit-files"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_target={false}
    target={TARGET.API}
    on_target_change={(target) => console.log('Target changed:', target)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    selected_files={[]}
    on_slash_click={() => {}}
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_open_website={(url) => console.log('Open website:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_long_text={(content) => console.log('Paste long text:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_pasted_text={(hash) => console.log('Open pasted text:', hash)}
    on_paste_url={(url) => console.log('Paste URL:', url)}
    is_recording={false}
    on_recording_started={() => console.log('Recording started')}
    on_recording_finished={() => console.log('Recording finished')}
    tabs_count={1}
    active_tab_index={0}
    on_tab_change={() => {}}
    on_new_tab={() => {}}
    on_tab_delete={() => {}}
    prompt_token_count={0}
    translations={{
      voice_input: 'Voice input',
      stop_recording: 'Stop recording',
      reference_file: 'Reference file',
      insert_symbol: 'Insert symbol',
      use_template: 'Use template',
      edit_format: 'Edit format',
      edit_format_whole: 'Whole-File Overwrite',
      edit_format_search_replace: 'Search & Replace',
      edit_format_diff: 'Unified Diff',
      edit_format_truncated: 'Ellipsis truncations',
      placeholder_code_history: 'Optional instructions (⇅ for history)',
      placeholder_code: 'Optional instructions',
      placeholder_history: 'Type instructions (⇅ for history)',
      placeholder_default: 'Type instructions',
      send_with: 'Send with',
      send_with_ellipsis: 'Send with...',
      copy_prompt: 'Copy prompt',
      preview_prompt: 'Preview prompt',
      more_actions: 'More actions',
      send: 'Send',
      attach_selected_files: 'Attach selected files',
      target: 'Target'
    }}
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
    prompt_type="edit-files"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_target={false}
    target={TARGET.API}
    on_target_change={(target) => console.log('Target changed:', target)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    selected_files={[]}
    on_slash_click={() => {}}
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_open_website={(url) => console.log('Open website:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_long_text={(content) => console.log('Paste long text:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_pasted_text={(hash) => console.log('Open pasted text:', hash)}
    on_paste_url={(url) => console.log('Paste URL:', url)}
    is_recording={false}
    on_recording_started={() => console.log('Recording started')}
    on_recording_finished={() => console.log('Recording finished')}
    tabs_count={1}
    active_tab_index={0}
    on_tab_change={() => {}}
    on_new_tab={() => {}}
    on_tab_delete={() => {}}
    prompt_token_count={0}
    translations={{
      voice_input: 'Voice input',
      stop_recording: 'Stop recording',
      reference_file: 'Reference file',
      insert_symbol: 'Insert symbol',
      use_template: 'Use template',
      edit_format: 'Edit format',
      edit_format_whole: 'Whole-File Overwrite',
      edit_format_search_replace: 'Search & Replace',
      edit_format_diff: 'Unified Diff',
      edit_format_truncated: 'Ellipsis truncations',
      placeholder_code_history: 'Optional instructions (⇅ for history)',
      placeholder_code: 'Optional instructions',
      placeholder_history: 'Type instructions (⇅ for history)',
      placeholder_default: 'Type instructions',
      send_with: 'Send with',
      send_with_ellipsis: 'Send with...',
      copy_prompt: 'Copy prompt',
      preview_prompt: 'Preview prompt',
      more_actions: 'More actions',
      send: 'Send',
      attach_selected_files: 'Attach selected files',
      target: 'Target'
    }}
  />
)

export const LongText = () => (
  <PromptField
    value="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    chat_history={[]}
    prompt_token_count={2500}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="edit-files"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_target={false}
    target={TARGET.API}
    on_target_change={(target) => console.log('Target changed:', target)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    selected_files={[]}
    on_slash_click={() => {}}
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_open_website={(url) => console.log('Open website:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_long_text={(content) => console.log('Paste long text:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_pasted_text={(hash) => console.log('Open pasted text:', hash)}
    on_paste_url={(url) => console.log('Paste URL:', url)}
    is_recording={false}
    on_recording_started={() => console.log('Recording started')}
    on_recording_finished={() => console.log('Recording finished')}
    tabs_count={1}
    active_tab_index={0}
    on_tab_change={() => {}}
    on_new_tab={() => {}}
    on_tab_delete={() => {}}
    translations={{
      voice_input: 'Voice input',
      stop_recording: 'Stop recording',
      reference_file: 'Reference file',
      insert_symbol: 'Insert symbol',
      use_template: 'Use template',
      edit_format: 'Edit format',
      edit_format_whole: 'Whole-File Overwrite',
      edit_format_search_replace: 'Search & Replace',
      edit_format_diff: 'Unified Diff',
      edit_format_truncated: 'Ellipsis truncations',
      placeholder_code_history: 'Optional instructions (⇅ for history)',
      placeholder_code: 'Optional instructions',
      placeholder_history: 'Type instructions (⇅ for history)',
      placeholder_default: 'Type instructions',
      send_with: 'Send with',
      send_with_ellipsis: 'Send with...',
      copy_prompt: 'Copy prompt',
      preview_prompt: 'Preview prompt',
      more_actions: 'More actions',
      send: 'Send',
      attach_selected_files: 'Attach selected files',
      target: 'Target'
    }}
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
    prompt_type="edit-files"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    target={TARGET.API}
    on_target_change={(target) => console.log('Target changed:', target)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_target={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    selected_files={[]}
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_slash_click={() => {}}
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_open_website={(url) => console.log('Open website:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_long_text={(content) => console.log('Paste long text:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_pasted_text={(hash) => console.log('Open pasted text:', hash)}
    on_paste_url={(url) => console.log('Paste URL:', url)}
    is_recording={false}
    on_recording_started={() => console.log('Recording started')}
    on_recording_finished={() => console.log('Recording finished')}
    tabs_count={1}
    active_tab_index={0}
    on_tab_change={() => {}}
    on_new_tab={() => {}}
    on_tab_delete={() => {}}
    prompt_token_count={0}
    translations={{
      voice_input: 'Voice input',
      stop_recording: 'Stop recording',
      reference_file: 'Reference file',
      insert_symbol: 'Insert symbol',
      use_template: 'Use template',
      edit_format: 'Edit format',
      edit_format_whole: 'Whole-File Overwrite',
      edit_format_search_replace: 'Search & Replace',
      edit_format_diff: 'Unified Diff',
      edit_format_truncated: 'Ellipsis truncations',
      placeholder_code_history: 'Optional instructions (⇅ for history)',
      placeholder_code: 'Optional instructions',
      placeholder_history: 'Type instructions (⇅ for history)',
      placeholder_default: 'Type instructions',
      send_with: 'Send with',
      send_with_ellipsis: 'Send with...',
      copy_prompt: 'Copy prompt',
      preview_prompt: 'Preview prompt',
      more_actions: 'More actions',
      send: 'Send',
      attach_selected_files: 'Attach selected files',
      target: 'Target'
    }}
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
    prompt_type="edit-files"
    current_selection={{
      text: 'Selected text content',
      start_line: 1,
      start_col: 1,
      end_line: 1,
      end_col: 22
    }}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    target={TARGET.API}
    on_target_change={(target) => console.log('Target changed:', target)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_target={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    selected_files={[]}
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_slash_click={() => {}}
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_open_website={(url) => console.log('Open website:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_long_text={(content) => console.log('Paste long text:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_pasted_text={(hash) => console.log('Open pasted text:', hash)}
    on_paste_url={(url) => console.log('Paste URL:', url)}
    is_recording={false}
    on_recording_started={() => console.log('Recording started')}
    on_recording_finished={() => console.log('Recording finished')}
    tabs_count={1}
    active_tab_index={0}
    on_tab_change={() => {}}
    on_new_tab={() => {}}
    on_tab_delete={() => {}}
    prompt_token_count={0}
    translations={{
      voice_input: 'Voice input',
      stop_recording: 'Stop recording',
      reference_file: 'Reference file',
      insert_symbol: 'Insert symbol',
      use_template: 'Use template',
      edit_format: 'Edit format',
      edit_format_whole: 'Whole-File Overwrite',
      edit_format_search_replace: 'Search & Replace',
      edit_format_diff: 'Unified Diff',
      edit_format_truncated: 'Ellipsis truncations',
      placeholder_code_history: 'Optional instructions (⇅ for history)',
      placeholder_code: 'Optional instructions',
      placeholder_history: 'Type instructions (⇅ for history)',
      placeholder_default: 'Type instructions',
      send_with: 'Send with',
      send_with_ellipsis: 'Send with...',
      copy_prompt: 'Copy prompt',
      preview_prompt: 'Preview prompt',
      more_actions: 'More actions',
      send: 'Send',
      attach_selected_files: 'Attach selected files',
      target: 'Target'
    }}
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
    prompt_type="edit-files"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    target={TARGET.API}
    on_target_change={(target) => console.log('Target changed:', target)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_target={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    selected_files={[]}
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_slash_click={() => {}}
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_open_website={(url) => console.log('Open website:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_long_text={(content) => console.log('Paste long text:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_pasted_text={(hash) => console.log('Open pasted text:', hash)}
    on_paste_url={(url) => console.log('Paste URL:', url)}
    is_recording={false}
    on_recording_started={() => console.log('Recording started')}
    on_recording_finished={() => console.log('Recording finished')}
    tabs_count={1}
    active_tab_index={0}
    on_tab_change={() => {}}
    on_new_tab={() => {}}
    on_tab_delete={() => {}}
    prompt_token_count={0}
    translations={{
      voice_input: 'Voice input',
      stop_recording: 'Stop recording',
      reference_file: 'Reference file',
      insert_symbol: 'Insert symbol',
      use_template: 'Use template',
      edit_format: 'Edit format',
      edit_format_whole: 'Whole-File Overwrite',
      edit_format_search_replace: 'Search & Replace',
      edit_format_diff: 'Unified Diff',
      edit_format_truncated: 'Ellipsis truncations',
      placeholder_code_history: 'Optional instructions (⇅ for history)',
      placeholder_code: 'Optional instructions',
      placeholder_history: 'Type instructions (⇅ for history)',
      placeholder_default: 'Type instructions',
      send_with: 'Send with',
      send_with_ellipsis: 'Send with...',
      copy_prompt: 'Copy prompt',
      preview_prompt: 'Preview prompt',
      more_actions: 'More actions',
      send: 'Send',
      attach_selected_files: 'Attach selected files',
      target: 'Target'
    }}
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
    prompt_type="edit-files"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    target={TARGET.API}
    on_target_change={(target) => console.log('Target changed:', target)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    is_web_target={false}
    on_submit_with_control={() => console.log('Submitted with control')}
    selected_files={[]}
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_slash_click={() => {}}
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_open_website={(url) => console.log('Open website:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_long_text={(content) => console.log('Paste long text:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_pasted_text={(hash) => console.log('Open pasted text:', hash)}
    on_paste_url={(url) => console.log('Paste URL:', url)}
    is_recording={false}
    on_recording_started={() => console.log('Recording started')}
    on_recording_finished={() => console.log('Recording finished')}
    tabs_count={1}
    active_tab_index={0}
    on_tab_change={() => {}}
    on_new_tab={() => {}}
    on_tab_delete={() => {}}
    prompt_token_count={0}
    translations={{
      voice_input: 'Voice input',
      stop_recording: 'Stop recording',
      reference_file: 'Reference file',
      insert_symbol: 'Insert symbol',
      use_template: 'Use template',
      edit_format: 'Edit format',
      edit_format_whole: 'Whole-File Overwrite',
      edit_format_search_replace: 'Search & Replace',
      edit_format_diff: 'Unified Diff',
      edit_format_truncated: 'Ellipsis truncations',
      placeholder_code_history: 'Optional instructions (⇅ for history)',
      placeholder_code: 'Optional instructions',
      placeholder_history: 'Type instructions (⇅ for history)',
      placeholder_default: 'Type instructions',
      send_with: 'Send with',
      send_with_ellipsis: 'Send with...',
      copy_prompt: 'Copy prompt',
      preview_prompt: 'Preview prompt',
      more_actions: 'More actions',
      send: 'Send',
      attach_selected_files: 'Attach selected files',
      target: 'Target'
    }}
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
      prompt_type="edit-files"
      current_selection={null}
      currently_open_file_path="/path/to/file"
      on_caret_position_change={(pos) => console.log('Caret position:', pos)}
      is_web_target={false}
      target={TARGET.API}
      on_target_change={(target) => console.log('Target changed:', target)}
      on_at_sign_click={() => console.log('@ clicked')}
      on_hash_sign_click={() => console.log('# clicked')}
      on_submit_with_control={() => console.log('Submitted with control')}
      on_slash_click={() => {}}
      show_edit_format_selector={true}
      edit_format={edit_format}
      on_edit_format_change={(f) => {
        if (f) set_edit_format(f)
      }}
      selected_files={[]}
      on_go_to_file={(path) => console.log('Go to file:', path)}
      on_pasted_lines_click={(path, start, end) =>
        console.log('Pasted lines clicked:', path, start, end)
      }
      on_open_url={(url) => console.log('Open URL:', url)}
      on_open_website={(url) => console.log('Open website:', url)}
      on_paste_image={(content) => console.log('Paste image:', content)}
      on_paste_long_text={(content) => console.log('Paste long text:', content)}
      on_open_image={(hash) => console.log('Open image:', hash)}
      on_open_pasted_text={(hash) => console.log('Open pasted text:', hash)}
      on_paste_url={(url) => console.log('Paste URL:', url)}
      is_recording={false}
      on_recording_started={() => console.log('Recording started')}
      on_recording_finished={() => console.log('Recording finished')}
      tabs_count={1}
      active_tab_index={0}
      on_tab_change={() => {}}
      on_new_tab={() => {}}
      on_tab_delete={() => {}}
      prompt_token_count={0}
      translations={{
        voice_input: 'Voice input',
        stop_recording: 'Stop recording',
        reference_file: 'Reference file',
        insert_symbol: 'Insert symbol',
        use_template: 'Use template',
        edit_format: 'Edit format',
        edit_format_whole: 'Whole-File Overwrite',
        edit_format_search_replace: 'Search & Replace',
        edit_format_diff: 'Unified Diff',
        edit_format_truncated: 'Ellipsis truncations',
        placeholder_code_history: 'Optional instructions (⇅ for history)',
        placeholder_code: 'Optional instructions',
        placeholder_history: 'Type instructions (⇅ for history)',
        placeholder_default: 'Type instructions',
        send_with: 'Send with',
        send_with_ellipsis: 'Send with...',
        copy_prompt: 'Copy prompt',
        preview_prompt: 'Preview prompt',
        more_actions: 'More actions',
        send: 'Send',
        attach_selected_files: 'Attach selected files',
        target: 'Target'
      }}
    />
  )
}

export const WithWarning = () => (
  <PromptField
    value="I want to copy this even if there is a warning"
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="ask-about-files"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_target={true}
    target={TARGET.WEB}
    on_target_change={(target) => console.log('Target changed:', target)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    selected_files={[]}
    on_slash_click={() => {}}
    on_go_to_file={(path) => console.log('Go to file:', path)}
    on_pasted_lines_click={() => {}}
    on_open_url={() => {}}
    on_open_website={() => {}}
    on_paste_image={() => {}}
    on_paste_long_text={() => {}}
    on_open_image={() => {}}
    on_open_pasted_text={() => {}}
    on_paste_url={() => {}}
    is_recording={false}
    on_recording_started={() => {}}
    on_recording_finished={() => {}}
    tabs_count={1}
    active_tab_index={0}
    on_tab_change={() => {}}
    on_new_tab={() => {}}
    on_tab_delete={() => {}}
    prompt_token_count={0}
    translations={{
      voice_input: 'Voice input',
      stop_recording: 'Stop recording',
      reference_file: 'Reference file',
      insert_symbol: 'Insert symbol',
      use_template: 'Use template',
      edit_format: 'Edit format',
      edit_format_whole: 'Whole-File Overwrite',
      edit_format_search_replace: 'Search & Replace',
      edit_format_diff: 'Unified Diff',
      edit_format_truncated: 'Ellipsis truncations',
      placeholder_code_history: 'Optional instructions (⇅ for history)',
      placeholder_code: 'Optional instructions',
      placeholder_history: 'Type instructions (⇅ for history)',
      placeholder_default: 'Type instructions',
      send_with: 'Send with',
      send_with_ellipsis: 'Send with...',
      copy_prompt: 'Copy prompt',
      preview_prompt: 'Preview prompt',
      more_actions: 'More actions',
      send: 'Send',
      attach_selected_files: 'Attach selected files',
      target: 'Target'
    }}
  />
)

export const WithFilePaths = () => (
  <PromptField
    value="This is about `path/to/my/file.ts` and not about `another/file.txt`"
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    prompt_type="edit-files"
    current_selection={null}
    currently_open_file_path="/path/to/file"
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_target={false}
    target={TARGET.API}
    on_target_change={(target) => console.log('Target changed:', target)}
    on_at_sign_click={() => console.log('@ clicked')}
    on_hash_sign_click={() => console.log('# clicked')}
    on_submit_with_control={() => console.log('Submitted with control')}
    on_slash_click={() => {}}
    on_go_to_file={(path) => console.log('Go to file:', path)}
    selected_files={['path/to/my/file.ts']}
    on_pasted_lines_click={(path, start, end) =>
      console.log('Pasted lines clicked:', path, start, end)
    }
    on_open_url={(url) => console.log('Open URL:', url)}
    on_open_website={(url) => console.log('Open website:', url)}
    on_paste_image={(content) => console.log('Paste image:', content)}
    on_paste_long_text={(content) => console.log('Paste long text:', content)}
    on_open_image={(hash) => console.log('Open image:', hash)}
    on_open_pasted_text={(hash) => console.log('Open pasted text:', hash)}
    on_paste_url={(url) => console.log('Paste URL:', url)}
    is_recording={false}
    on_recording_started={() => console.log('Recording started')}
    on_recording_finished={() => console.log('Recording finished')}
    tabs_count={1}
    active_tab_index={0}
    on_tab_change={() => {}}
    on_new_tab={() => {}}
    on_tab_delete={() => {}}
    prompt_token_count={0}
    translations={{
      voice_input: 'Voice input',
      stop_recording: 'Stop recording',
      reference_file: 'Reference file',
      insert_symbol: 'Insert symbol',
      use_template: 'Use template',
      edit_format: 'Edit format',
      edit_format_whole: 'Whole-File Overwrite',
      edit_format_search_replace: 'Search & Replace',
      edit_format_diff: 'Unified Diff',
      edit_format_truncated: 'Ellipsis truncations',
      placeholder_code_history: 'Optional instructions (⇅ for history)',
      placeholder_code: 'Optional instructions',
      placeholder_history: 'Type instructions (⇅ for history)',
      placeholder_default: 'Type instructions',
      send_with: 'Send with',
      send_with_ellipsis: 'Send with...',
      copy_prompt: 'Copy prompt',
      preview_prompt: 'Preview prompt',
      more_actions: 'More actions',
      send: 'Send',
      attach_selected_files: 'Attach selected files',
      target: 'Target'
    }}
  />
)

export const WithTabs = () => {
  const [tabs, set_tabs] = useState(['Prompt 1', 'Prompt 2', 'Prompt 3'])
  const [active_index, set_active_index] = useState(0)

  const handle_change = (val: string) => {
    const new_tabs = [...tabs]
    new_tabs[active_index] = val
    set_tabs(new_tabs)
  }

  const handle_new_tab = () => {
    set_tabs([...tabs, ''])
    set_active_index(tabs.length)
  }

  const handle_tab_delete = (index: number) => {
    const new_tabs = tabs.filter((_, i) => i !== index)
    if (new_tabs.length == 0) {
      set_tabs([''])
      set_active_index(0)
    } else {
      set_tabs(new_tabs)
      if (active_index >= new_tabs.length) {
        set_active_index(new_tabs.length - 1)
      }
    }
  }

  return (
    <PromptField
      value={tabs[active_index]}
      chat_history={[]}
      on_change={handle_change}
      on_submit={() => console.log('Submitted:', tabs[active_index])}
      on_copy={() => console.log('Copied')}
      is_connected={true}
      prompt_type="edit-files"
      current_selection={null}
      currently_open_file_path="/path/to/file"
      on_caret_position_change={(pos) => console.log('Caret position:', pos)}
      is_web_target={false}
      target={TARGET.API}
      on_target_change={(target) => console.log('Target changed:', target)}
      on_at_sign_click={() => console.log('@ clicked')}
      on_hash_sign_click={() => console.log('# clicked')}
      on_submit_with_control={() => console.log('Submitted with control')}
      on_slash_click={() => {}}
      on_go_to_file={(path) => console.log('Go to file:', path)}
      selected_files={['path/to/my/file.ts']}
      on_pasted_lines_click={(path, start, end) =>
        console.log('Pasted lines clicked:', path, start, end)
      }
      on_open_url={(url) => console.log('Open URL:', url)}
      on_open_website={(url) => console.log('Open website:', url)}
      on_paste_image={(content) => console.log('Paste image:', content)}
      on_paste_long_text={(content) => console.log('Paste long text:', content)}
      on_open_image={(hash) => console.log('Open image:', hash)}
      on_open_pasted_text={(hash) => console.log('Open pasted text:', hash)}
      on_paste_url={(url) => console.log('Paste URL:', url)}
      is_recording={false}
      on_recording_started={() => console.log('Recording started')}
      on_recording_finished={() => console.log('Recording finished')}
      tabs_count={tabs.length}
      active_tab_index={active_index}
      on_tab_change={set_active_index}
      on_new_tab={handle_new_tab}
      on_tab_delete={handle_tab_delete}
      prompt_token_count={0}
      translations={{
        voice_input: 'Voice input',
        stop_recording: 'Stop recording',
        reference_file: 'Reference file',
        insert_symbol: 'Insert symbol',
        use_template: 'Use template',
        edit_format: 'Edit format',
        edit_format_whole: 'Whole-File Overwrite',
        edit_format_search_replace: 'Search & Replace',
        edit_format_diff: 'Unified Diff',
        edit_format_truncated: 'Ellipsis truncations',
        placeholder_code_history: 'Optional instructions (⇅ for history)',
        placeholder_code: 'Optional instructions',
        placeholder_history: 'Type instructions (⇅ for history)',
        placeholder_default: 'Type instructions',
        send_with: 'Send with',
        send_with_ellipsis: 'Send with...',
        copy_prompt: 'Copy prompt',
        preview_prompt: 'Preview prompt',
        more_actions: 'More actions',
        send: 'Send',
        attach_selected_files: 'Attach selected files',
        target: 'Target'
      }}
    />
  )
}
