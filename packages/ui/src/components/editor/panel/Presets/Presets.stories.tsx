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

export const Primary = () => {
  return (
    <Presets
      web_mode="edit-context"
      is_connected={true}
      has_instructions={true}
      is_in_code_completions_mode={false}
      has_context={true}
      presets={presets}
      on_create_preset={() => console.log('on_create_preset')}
      on_preset_click={(name) => {
        console.log('on_preset_click', name)
      }}
      on_group_click={() => {}}
      on_preset_copy={(name) => console.log('on_preset_copy', name)}
      on_presets_reorder={(reordered) =>
        console.log('on_presets_reorder', reordered)
      }
      on_preset_edit={(name) => console.log('on_preset_edit', name)}
      on_preset_duplicate={(name) => console.log('on_preset_duplicate', name)}
      on_preset_delete={(name) => console.log('on_preset_delete', name)}
      on_toggle_selected_preset={(name) =>
        console.log('on_toggle_selected_preset', name)
      }
      on_toggle_group_collapsed={(name) =>
        console.log('on_toggle_group_collapsed', name)
      }
      selected_preset_name={undefined}
      is_collapsed={false}
      on_create_group={() => {}}
      on_toggle_collapsed={() => {}}
      on_toggle_preset_pinned={() => {}}
    />
  )
}
