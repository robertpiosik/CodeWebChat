import { Home } from './tabs/home'
import { Donations } from './tabs/donations/Donations'
import { Header as UiHeader } from '@ui/components/editor/Header'
import { useEffect, useState } from 'react'
import { Template as UiTemplate } from '@ui/components/editor/Template'
import { EditView as UiEditView } from '@ui/components/editor/EditView'
import { EditPresetForm as UiEditPresetForm } from '@ui/components/editor/EditPresetForm'
import { Preset } from '@shared/types/preset'
import {
  ExtensionMessage,
  SaveInstructionsMessage,
  SaveCodeCompletionSuggestionsMessage,
  WebviewMessage
} from '../types/messages'
import { TextButton as UiTextButton } from '@ui/components/editor/TextButton'
import { Settings } from './tabs/settings/Settings'

const vscode = acquireVsCodeApi()

const TAB_NAMES = {
  HOME: 'Home',
  SETTINGS: 'Settings',
  DONATIONS: 'Donations'
} as const

type TabName = (typeof TAB_NAMES)[keyof typeof TAB_NAMES]

export const View = () => {
  const [active_tab, set_active_tab] = useState<TabName>(TAB_NAMES.HOME)
  const [updating_preset, set_updating_preset] = useState<Preset>()
  const [updated_preset, set_updated_preset] = useState<Preset>()
  const [is_in_code_completions_mode, set_is_in_code_completions_mode] =
    useState(false)
  const [instructions, set_instructions] = useState<string | undefined>(
    undefined
  )
  const [code_completion_suggestions, set_code_completion_suggestions] =
    useState<string | undefined>(undefined)

  const handle_instructions_change = (value: string) => {
    set_instructions(value)
    vscode.postMessage({
      command: 'SAVE_INSTRUCTIONS',
      instruction: value
    } as SaveInstructionsMessage)
  }

  const handle_code_completion_suggestions_change = (value: string) => {
    set_code_completion_suggestions(value)
    vscode.postMessage({
      command: 'SAVE_CODE_COMPLETION_SUGGESTIONS',
      instruction: value
    } as SaveCodeCompletionSuggestionsMessage)
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'CODE_COMPLETIONS_MODE') {
        set_is_in_code_completions_mode(message.enabled)
      } else if (message.command == 'PRESET_UPDATED') {
        set_updating_preset(undefined)
        set_updated_preset(undefined)
      } else if (message.command == 'INSTRUCTIONS') {
        set_instructions(message.value)
      } else if (message.command == 'CODE_COMPLETION_SUGGESTIONS') {
        set_code_completion_suggestions(message.value)
      }
    }
    window.addEventListener('message', handle_message)

    const initial_messages: WebviewMessage[] = [
      { command: 'GET_INSTRUCTIONS' },
      { command: 'GET_CODE_COMPLETION_SUGGESTIONS' }
    ]
    initial_messages.forEach((message) => vscode.postMessage(message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const edit_preset_back_click_handler = () => {
    vscode.postMessage({
      command: 'UPDATE_PRESET',
      updating_preset: updating_preset,
      updated_preset: updated_preset
    })
  }

  const handle_preview_preset = () => {
    const instructions_to_send = is_in_code_completions_mode
      ? code_completion_suggestions
      : instructions

    vscode.postMessage({
      command: 'PREVIEW_PRESET',
      instruction: instructions_to_send,
      preset: updated_preset
    })
  }

  if (instructions === undefined || code_completion_suggestions === undefined) {
    return null
  }

  const tabs = (
    <>
      <UiHeader
        tabs={Object.values(TAB_NAMES)}
        active_tab={active_tab}
        on_tab_click={set_active_tab}
      />
      <Home
        vscode={vscode}
        is_visible={active_tab == TAB_NAMES.HOME}
        on_preset_edit={(preset) => {
          set_updating_preset(preset)
        }}
        normal_instructions={instructions}
        set_normal_instructions={handle_instructions_change}
        code_completion_suggestions={code_completion_suggestions}
        set_code_completion_suggestions={
          handle_code_completion_suggestions_change
        }
      />
      <Settings vscode={vscode} is_visible={active_tab == TAB_NAMES.SETTINGS} />
      <Donations
        vscode={vscode}
        is_visible={active_tab == TAB_NAMES.DONATIONS}
      />
    </>
  )

  let edit_view: React.ReactNode | undefined = undefined

  if (updating_preset) {
    edit_view = (
      <UiEditView
        on_back_click={edit_preset_back_click_handler}
        header_slot={
          <UiTextButton
            on_click={handle_preview_preset}
            disabled={
              is_in_code_completions_mode &&
              !!(updated_preset?.prompt_prefix || updated_preset?.prompt_suffix)
            }
            title={
              is_in_code_completions_mode &&
              !!(updated_preset?.prompt_prefix || updated_preset?.prompt_suffix)
                ? 'Preview is not available for presets with prompt prefix or suffix in code completions mode.'
                : undefined
            }
          >
            Preview
          </UiTextButton>
        }
      >
        <UiEditPresetForm
          preset={updating_preset}
          on_update={set_updated_preset}
          pick_open_router_model={() => {
            vscode.postMessage({ command: 'PICK_OPEN_ROUTER_MODEL' })
          }}
        />
      </UiEditView>
    )
  }

  return <UiTemplate edit_view_slot={edit_view} tabs_slot={tabs} />
}
