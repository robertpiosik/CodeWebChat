import { ChatInput } from './ChatInput'

export default {
  component: ChatInput
}

const translations = {
  type_something: 'Type something',
  completion_instructions: 'Completion instructions',
  send_request: 'Send request',
  initialize_chat: 'Initialize chat',
  select_preset: 'Select preset',
  select_config: 'Select config',
  code_completions_mode_unavailable_with_text_selection:
    'Code completions mode unavailable with text selection',
  code_completions_mode_unavailable_without_active_editor:
    'Code completions mode unavailable without active editor',
  search: 'Search',
  websocket_not_connected: 'Websocket not connected',
  for_history_hint: 'for history hint',
  copy_to_clipboard: 'Copy to clipboard',
  insert_symbol: 'Insert symbol',
  prompt_templates: 'Prompt templates',
  approximate_token_count: 'Approximate token count',
  last_selection: 'Last selection',
  use_default: 'Use default',
  select: 'Select'
}

export const Empty = () => (
  <ChatInput
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
    translations={translations}
    on_at_sign_click={() => console.log('@ clicked')}
    on_search_click={() => console.log('Search clicked')}
    on_submit_with_control={() => {}}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)

export const WithText = () => (
  <ChatInput
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
    translations={translations}
    on_at_sign_click={() => console.log('@ clicked')}
    on_search_click={() => console.log('Search clicked')}
    on_submit_with_control={() => {}}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)

export const DisabledSubmit = () => (
  <ChatInput
    value="Cannot submit this message"
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={false}
    is_in_code_completions_mode={false}
    has_active_selection={false}
    has_active_editor={true}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_mode={false}
    translations={translations}
    on_at_sign_click={() => console.log('@ clicked')}
    on_search_click={() => console.log('Search clicked')}
    on_submit_with_control={() => {}}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)

export const MultilineText = () => (
  <ChatInput
    value="This is a message\nwith multiple\nlines of text"
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
    translations={translations}
    on_at_sign_click={() => console.log('@ clicked')}
    on_search_click={() => console.log('Search clicked')}
    on_submit_with_control={() => {}}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)

export const LongText = () => (
  <ChatInput
    value="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
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
    translations={translations}
    on_at_sign_click={() => console.log('@ clicked')}
    on_search_click={() => console.log('Search clicked')}
    on_submit_with_control={() => {}}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)

export const WithTokenCount = () => (
  <ChatInput
    value="This message has a token count."
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    token_count={15}
    is_in_code_completions_mode={false}
    has_active_editor={true}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_mode={false}
    on_at_sign_click={() => console.log('@ clicked')}
    on_search_click={() => console.log('Search clicked')}
    translations={translations}
    on_submit_with_control={() => {}}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)

export const WithLargeTokenCount = () => (
  <ChatInput
    value="This message has a large token count."
    chat_history={[]}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    token_count={12345}
    is_in_code_completions_mode={false}
    has_active_editor={true}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    is_web_mode={false}
    on_at_sign_click={() => console.log('@ clicked')}
    on_search_click={() => console.log('Search clicked')}
    translations={translations}
    on_submit_with_control={() => {}}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)

export const CodeCompletionsMode = () => (
  <ChatInput
    value="Suggest some code..."
    chat_history={['Previous suggestion 1', 'Previous suggestion 2']}
    on_change={(value) => console.log('Changed:', value)}
    on_submit={() => console.log('Submitted')}
    on_copy={() => console.log('Copied')}
    is_connected={true}
    is_in_code_completions_mode={true}
    has_active_editor={true}
    has_active_selection={false}
    on_caret_position_change={(pos) => console.log('Caret position:', pos)}
    on_search_click={() => console.log('Search clicked')}
    on_at_sign_click={() => console.log('@ clicked')}
    is_web_mode={false}
    translations={translations}
    on_submit_with_control={() => {}}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)

export const WithActiveSelection = () => (
  <ChatInput
    value="Ask about the "
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
    is_web_mode={false}
    on_submit_with_control={() => {}}
    translations={translations}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)

export const WithSavedContextPlaceholder = () => (
  <ChatInput
    value='Ask about the @SavedContext:JSON "My Context"'
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
    is_web_mode={false}
    on_submit_with_control={() => {}}
    translations={translations}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)

export const WithActiveSelectionAndPlaceholder = () => (
  <ChatInput
    value="Ask about the @Selection"
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
    is_web_mode={false}
    on_submit_with_control={() => {}}
    translations={translations}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)

export const WithPlaceholderNoSelection = () => (
  <ChatInput
    value="Ask about the @Selection"
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
    is_web_mode={false}
    on_submit_with_control={() => {}}
    translations={translations}
    on_curly_braces_click={() => {}}
    has_context={true}
  />
)
