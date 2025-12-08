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
    name: 'Code Review Group',
    is_collapsed: false
  },
  {
    name: 'Code review with AI Studio',
    chatbot: 'AI Studio' as keyof typeof CHATBOTS,
    is_selected: true
  },
  {
    name: 'Security check with Claude',
    chatbot: 'Claude' as keyof typeof CHATBOTS,
    is_selected: true
  },
  {},
  {
    name: 'ChatGPT for documentation',
    chatbot: 'ChatGPT' as keyof typeof CHATBOTS,
    prompt_prefix: 'Please review and improve documentation',
    is_pinned: true
  },
  {
    name: 'Development Tasks',
    is_collapsed: true
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
      on_group_click={(name) => {
        console.log('on_group_click', name)
      }}
      on_create_preset_group_or_separator={(options) => {
        console.log('on_create_preset_group_or_separator', options)
      }}
      on_preset_copy={(name) => console.log('on_preset_copy', name)}
      on_presets_reorder={(reordered) =>
        console.log('on_presets_reorder', reordered)
      }
      on_preset_edit={(name) => console.log('on_preset_edit', name)}
      on_duplicate_preset_group_or_separator={(index) =>
        console.log('on_duplicate_preset_group_or_separator', index)
      }
      on_delete_preset_group_or_separator={(index) =>
        console.log('on_delete_preset_group_or_separator', index)
      }
      on_toggle_selected_preset={(name) =>
        console.log('on_toggle_selected_preset', name)
      }
      on_toggle_preset_pinned={(name) =>
        console.log('on_toggle_preset_pinned', name)
      }
      on_toggle_group_collapsed={(name) =>
        console.log('on_toggle_group_collapsed', name)
      }
      selected_preset_name="ChatGPT for documentation"
      is_collapsed={false}
      on_toggle_collapsed={(is_collapsed) =>
        console.log('on_toggle_collapsed', is_collapsed)
      }
    />
  )
}
