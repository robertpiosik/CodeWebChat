import { Home } from './home'
import { useEffect, useState } from 'react'
import { Template as UiTemplate } from '@ui/components/editor/Template'
import { Page as UiPage } from '@ui/components/editor/Page'
import { EditPresetForm as UiEditPresetForm } from '@ui/components/editor/EditPresetForm'
import { Preset } from '@shared/types/preset'
import { ExtensionMessage, WebviewMessage } from '../types/messages'
import { TextButton as UiTextButton } from '@ui/components/editor/TextButton'
import { Settings } from './settings/Settings'

const vscode = acquireVsCodeApi()

export const View = () => {
  const [updating_preset, set_updating_preset] = useState<Preset>()
  const [viewing_settings, set_viewing_settings] = useState(false)
  const [updated_preset, set_updated_preset] = useState<Preset>()
  const [is_in_code_completions_mode, set_is_in_code_completions_mode] =
    useState(false)
  const [ask_instructions, set_ask_instructions] = useState<
    string | undefined
  >()
  const [edit_instructions, set_edit_instructions] = useState<
    string | undefined
  >()
  const [no_context_instructions, set_no_context_instructions] = useState<
    string | undefined
  >()
  const [code_completions_instructions, set_code_completions_instructions] =
    useState<string | undefined>(undefined)

  const handle_instructions_change = (
    value: string,
    mode: 'ask' | 'edit' | 'no-context' | 'code-completions'
  ) => {
    if (mode == 'ask') set_ask_instructions(value)
    else if (mode == 'edit') set_edit_instructions(value)
    else if (mode == 'no-context') set_no_context_instructions(value)
    else if (mode == 'code-completions')
      set_code_completions_instructions(value)

    vscode.postMessage({
      command: 'SAVE_INSTRUCTIONS',
      instruction: value,
      mode: mode
    } as WebviewMessage)
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
        set_ask_instructions(message.ask)
        set_edit_instructions(message.edit)
        set_no_context_instructions(message.no_context)
        set_code_completions_instructions(message.code_completions)
      }
    }
    window.addEventListener('message', handle_message)

    const initial_messages: WebviewMessage[] = [{ command: 'GET_INSTRUCTIONS' }]
    initial_messages.forEach((message) => vscode.postMessage(message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const edit_preset_back_click_handler = () => {
    vscode.postMessage({
      command: 'UPDATE_PRESET',
      updating_preset: updating_preset,
      updated_preset: updated_preset
    } as WebviewMessage)
  }

  const handle_preview_preset = () => {
    vscode.postMessage({
      command: 'PREVIEW_PRESET',
      preset: updated_preset
    } as WebviewMessage)
  }

  if (
    ask_instructions === undefined ||
    edit_instructions === undefined ||
    no_context_instructions === undefined ||
    code_completions_instructions === undefined
  ) {
    return null
  }

  let overlay: React.ReactNode | undefined = undefined

  if (updating_preset) {
    overlay = (
      <UiPage
        on_back_click={edit_preset_back_click_handler}
        title="Edit Preset"
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
      </UiPage>
    )
  } else if (viewing_settings) {
    overlay = (
      <UiPage
        on_close_click={() => set_viewing_settings(false)}
        title="Settings"
      >
        <Settings vscode={vscode} />
      </UiPage>
    )
  }

  return (
    <UiTemplate
      overlay_slot={overlay}
      base_slot={
        <Home
          vscode={vscode}
          on_preset_edit={(preset) => {
            set_updating_preset(preset)
          }}
          on_settings_click={() => {
            // set_viewing_settings(true)
            vscode.postMessage({
              command: 'OPEN_SETTINGS'
            } as WebviewMessage)
          }}
          ask_instructions={ask_instructions}
          edit_instructions={edit_instructions}
          no_context_instructions={no_context_instructions}
          code_completions_instructions={code_completions_instructions}
          set_instructions={handle_instructions_change}
        />
      }
    />
  )
}
