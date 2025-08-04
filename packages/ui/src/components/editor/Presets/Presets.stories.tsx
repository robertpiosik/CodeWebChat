import { Presets } from './Presets'
import { CHATBOTS } from '@shared/constants/chatbots'

export default {
  component: Presets
}

const presets: Presets.Preset[] = [
  {
    name: 'Gemini with Flash 2.0',
    chatbot: 'Gemini' as keyof typeof CHATBOTS
  },
  {
    name: 'Code review with AI Studio',
    chatbot: 'AI Studio' as keyof typeof CHATBOTS
  }
]

export const Multiple = () => {
  return (
    <Presets
      is_connected={true}
      has_active_editor={true}
      has_active_selection={false}
      presets={presets}
      on_preset_click={(name) => {
        console.log('on_preset_click', name)
      }}
      on_group_click={() => {}}
      on_preset_delete={(name) => console.log('on_preset_delete', name)}
      on_preset_edit={(name) => console.log('on_preset_edit', name)}
      on_preset_duplicate={(name) => console.log('on_preset_duplicate', name)}
      on_create_preset={() => console.log('on_create_preset')}
      on_preset_copy={(name) => console.log('on_preset_copy', name)}
      on_presets_reorder={(reordered) =>
        console.log('on_presets_reorder', reordered)
      }
      on_toggle_default_preset={() => {}}
      has_instructions={true}
      is_in_code_completions_mode={false}
      has_context={true}
      web_mode="edit-context"
      translations={{
        my_presets: 'My Chat Presets',
        set_presets_opening_by_default: 'Set presets opening by default',
        set_as_default: 'Set as Default',
        unset_as_default: 'Unset as Default',
        not_connected: 'Not connected to VS Code',
        preset_requires_active_editor: 'Preset requires an active editor',
        preset_cannot_be_used_with_selection:
          'Preset cannot be used with an active selection',
        initialize_chat_with_preset: 'Initialize chat with this preset',
        type_or_add_prompt_to_use_preset:
          'Type or add a prompt to use this preset',
        copy_to_clipboard: 'Copy to clipboard',
        duplicate: 'Duplicate',
        edit: 'Edit',
        delete: 'Delete',
        create: 'Create Preset',
        no_preset_enabled_or_selected_in_this_group:
          'No preset is enabled or set as default in this group'
      }}
    />
  )
}

export const CodeCompletionsMode = () => {
  return (
    <Presets
      is_connected={true}
      has_active_editor={true}
      has_active_selection={false}
      presets={presets}
      on_preset_click={(name) => {
        console.log('on_preset_click', name)
      }}
      on_group_click={() => {}}
      on_preset_delete={(name) => console.log('on_preset_delete', name)}
      on_preset_edit={(name) => console.log('on_preset_edit', name)}
      on_preset_duplicate={(name) => console.log('on_preset_duplicate', name)}
      on_create_preset={() => console.log('on_create_preset')}
      on_preset_copy={(name) => console.log('on_preset_copy', name)}
      on_presets_reorder={(reordered) =>
        console.log('on_presets_reorder', reordered)
      }
      on_toggle_default_preset={() => {}}
      has_instructions={true}
      is_in_code_completions_mode={false}
      has_context={true}
      web_mode="edit-context"
      translations={{
        my_presets: 'My Chat Presets',
        set_presets_opening_by_default: 'Set presets opening by default',
        set_as_default: 'Set as Default',
        unset_as_default: 'Unset as Default',
        not_connected: 'Not connected to VS Code',
        preset_requires_active_editor: 'Preset requires an active editor',
        preset_cannot_be_used_with_selection:
          'Preset cannot be used with an active selection',
        initialize_chat_with_preset: 'Initialize chat with this preset',
        type_or_add_prompt_to_use_preset:
          'Type or add a prompt to use this preset',
        copy_to_clipboard: 'Copy to clipboard',
        duplicate: 'Duplicate',
        edit: 'Edit',
        delete: 'Delete',
        create: 'Create Preset',
        no_preset_enabled_or_selected_in_this_group:
          'No preset is enabled or set as default in this group'
      }}
    />
  )
}
