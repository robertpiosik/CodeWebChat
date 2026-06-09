import { Presets } from './Presets'
import { CHATBOTS } from '@shared/constants/chatbots'

export default {
  component: Presets
}

const presets: Presets.Preset[] = [
  {
    name: 'Gemini with Flash 2.0',
    chatbot: 'Gemini' as keyof typeof CHATBOTS,
    model: 'gemini-2.0-flash-exp',
    is_pinned: true
  },
  {
    name: 'Code review with AI Studio',
    chatbot: 'AI Studio' as keyof typeof CHATBOTS
  },
  {
    name: 'Security check with Claude',
    chatbot: 'Claude' as keyof typeof CHATBOTS
  },
  {
    name: 'ChatGPT for documentation',
    chatbot: 'ChatGPT' as keyof typeof CHATBOTS,
    is_pinned: true
  },
  {
    name: 'Bug analysis',
    chatbot: 'DeepSeek' as keyof typeof CHATBOTS
  },
  {
    name: 'Performance optimization',
    chatbot: 'Copilot' as keyof typeof CHATBOTS
  }
]

const mock_translations = {
  title: 'Presets',
  empty: 'No presets created yet.',
  preset: 'preset',
  presets: 'presets',
  add_new: 'Add New',
  add_new_tooltip: 'Add new',
  copy_tooltip: 'Copy to clipboard',
  pin_tooltip: 'Pin',
  unpin_tooltip: 'Unpin',
  duplicate_tooltip: 'Duplicate',
  edit_tooltip: 'Edit',
  delete_tooltip: 'Delete',
  insert_tooltip: 'Insert a new item below/above',
}

export const Primary = () => {
  return (
    <Presets
      web_prompt_type="edit-context"
      is_connected={true}
      has_instructions={true}
      is_in_code_completions_mode={false}
      has_context={true}
      presets={presets}
      on_preset_click={(name) => {
        console.log('on_preset_click', name)
      }}
      on_create={(placement, reference_index) => {
        console.log(
          'on_create_preset',
          placement,
          reference_index
        )
      }}
      on_preset_copy={(name) => console.log('on_preset_copy', name)}
      on_presets_reorder={(reordered) =>
        console.log('on_presets_reorder', reordered)
      }
      on_preset_edit={(name) => console.log('on_preset_edit', name)}
      on_duplicate={(index) =>
        console.log('on_duplicate_preset', index)
      }
      on_delete={(index) =>
        console.log('on_delete_preset', index)
      }
      on_toggle_preset_pinned={(name) =>
        console.log('on_toggle_preset_pinned', name)
      }
      selected_preset_name="ChatGPT for documentation"
      is_collapsed={false}
      on_toggle_collapsed={(is_collapsed) =>
        console.log('on_toggle_collapsed', is_collapsed)
      }
      translations={mock_translations}
    />
  )
}
