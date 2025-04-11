import { useState } from 'react'
import { Presets } from './Presets'

export default {
  component: Presets
}

const presets: Presets.Preset[] = [
  {
    name: 'Gemini with Flash 2.0',
    chatbot: 'Gemini',
    temperature: 0.5,
    prompt_prefix: 'Please help me with:',
    prompt_suffix: 'Be concise and accurate',
    system_instructions: 'You are a helpful assistant'
  },
  {
    name: 'Code review with ChatGPT',
    chatbot: 'ChatGPT',
    prompt_prefix: 'Review this code:',
    system_instructions: 'Focus on code quality and best practices'
  }
]

export const Multiple = () => {
  const [expanded_presets, set_expanded_presets] = useState<number[]>([])
  const [selected_presets, set_selected_presets] = useState<string[]>([])

  return (
    <Presets
      presets={presets}
      on_preset_click={(name) => console.log('on_preset_click', name)}
      disabled={false}
      selected_presets={selected_presets}
      on_selected_presets_change={(names) => {
        console.log('on_selected_presets_change', names)
        set_selected_presets(names)
      }}
      on_edit_presets={() => console.log('on_edit_presets')}
      expanded_presets={expanded_presets}
      on_expanded_presets_change={(indices) => {
        console.log('on_expanded_presets_change', indices)
        set_expanded_presets(indices)
      }}
      is_fim_mode={false}
      on_preset_copy={(name) => console.log('on_preset_copy', name)}
      on_presets_reorder={(reordered) =>
        console.log('on_presets_reorder', reordered)
      }
    />
  )
}
