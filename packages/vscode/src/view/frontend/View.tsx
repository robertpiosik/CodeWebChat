import { Home } from './home'
import { useEffect, useState } from 'react'
import { Page as UiPage } from '@ui/components/editor/Page'
import { EditPresetForm as UiEditPresetForm } from '@ui/components/editor/EditPresetForm'
import { Preset } from '@shared/types/preset'
import { ExtensionMessage, WebviewMessage } from '../types/messages'
import { TextButton as UiTextButton } from '@ui/components/editor/TextButton'
import { HOME_VIEW_TYPES, HomeViewType } from '../types/home-view-type'
import { Intro } from './intro'
import styles from './View.module.scss'
import cn from 'classnames'
import { ApiMode, WebMode } from '@shared/types/modes'

const vscode = acquireVsCodeApi()

export const View = () => {
  const [active_view, set_active_view] = useState<'intro' | 'home'>('intro')
  const [version, set_version] = useState<string>('')
  const [updating_preset, set_updating_preset] = useState<Preset>()
  const [updated_preset, set_updated_preset] = useState<Preset>()
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
  const [home_view_type, set_home_view_type] = useState<HomeViewType>()
  const [web_mode, set_web_mode] = useState<WebMode>()
  const [api_mode, set_api_mode] = useState<ApiMode>()

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
      if (message.command == 'PRESET_UPDATED') {
        set_updating_preset(undefined)
        set_updated_preset(undefined)
      } else if (message.command == 'INSTRUCTIONS') {
        set_ask_instructions(message.ask)
        set_edit_instructions(message.edit)
        set_no_context_instructions(message.no_context)
        set_code_completions_instructions(message.code_completions)
        // Caret position is handled in Home.tsx
      } else if (message.command == 'VERSION') {
        set_version(message.version)
      } else if (message.command == 'HOME_VIEW_TYPE') {
        set_home_view_type(message.view_type)
      } else if (message.command == 'WEB_MODE') {
        set_web_mode(message.mode)
      } else if (message.command == 'API_MODE') {
        set_api_mode(message.mode)
      }
    }
    window.addEventListener('message', handle_message)

    const initial_messages: WebviewMessage[] = [
      { command: 'GET_INSTRUCTIONS' },
      { command: 'GET_VERSION' },
      { command: 'GET_HOME_VIEW_TYPE' },
      { command: 'GET_WEB_MODE' },
      { command: 'GET_API_MODE' }
    ]
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

  const handle_web_mode_change = (new_mode: WebMode) => {
    set_web_mode(new_mode)
    vscode.postMessage({
      command: 'SAVE_WEB_MODE',
      mode: new_mode
    } as WebviewMessage)
    vscode.postMessage({
      command: 'GET_SELECTED_PRESETS'
    } as WebviewMessage)
    vscode.postMessage({
      command: 'GET_CURRENT_TOKEN_COUNT'
    } as WebviewMessage)
  }

  const handle_api_mode_change = (new_mode: ApiMode) => {
    set_api_mode(new_mode)
    vscode.postMessage({
      command: 'SAVE_API_MODE',
      mode: new_mode
    } as WebviewMessage)
    vscode.postMessage({
      command: 'GET_SELECTED_PRESETS'
    } as WebviewMessage)
    vscode.postMessage({
      command: 'GET_CURRENT_TOKEN_COUNT'
    } as WebviewMessage)
  }

  const handle_home_view_type_change = (view_type: HomeViewType) => {
    set_home_view_type(view_type)
    vscode.postMessage({
      command: 'SAVE_HOME_VIEW_TYPE',
      view_type
    } as WebviewMessage)
  }

  if (
    ask_instructions === undefined ||
    edit_instructions === undefined ||
    no_context_instructions === undefined ||
    !version ||
    code_completions_instructions === undefined ||
    home_view_type === undefined ||
    web_mode === undefined ||
    api_mode === undefined
  ) {
    return null
  }

  let overlay: React.ReactNode | undefined = undefined

  const is_for_code_completions =
    (home_view_type == HOME_VIEW_TYPES.WEB && web_mode == 'code-completions') ||
    (home_view_type == HOME_VIEW_TYPES.API && api_mode == 'code-completions')

  if (updating_preset) {
    overlay = (
      <UiPage
        on_back_click={edit_preset_back_click_handler}
        title="Edit Preset"
        header_slot={
          <UiTextButton on_click={handle_preview_preset}>Preview</UiTextButton>
        }
      >
        <UiEditPresetForm
          preset={updating_preset}
          on_update={set_updated_preset}
          pick_open_router_model={() => {
            vscode.postMessage({ command: 'PICK_OPEN_ROUTER_MODEL' })
          }}
          on_at_sign_in_affix={() => {
            vscode.postMessage({
              command: 'SHOW_AT_SIGN_QUICK_PICK_FOR_PRESET_AFFIX',
              is_for_code_completions: is_for_code_completions
            } as WebviewMessage)
          }}
        />
      </UiPage>
    )
  }

  return (
    <div className={styles.container}>
      {overlay && <div className={styles.slot}>{overlay}</div>}
      <div
        className={cn(styles.slot, {
          [styles['slot--hidden']]: active_view != 'home'
        })}
      >
        <Home
          vscode={vscode}
          on_preset_edit={(preset) => {
            set_updating_preset(preset)
          }}
          on_show_intro={() => set_active_view('intro')}
          ask_instructions={ask_instructions}
          edit_instructions={edit_instructions}
          no_context_instructions={no_context_instructions}
          code_completions_instructions={code_completions_instructions}
          set_instructions={handle_instructions_change}
          home_view_type={home_view_type}
          web_mode={web_mode}
          api_mode={api_mode}
          on_home_view_type_change={handle_home_view_type_change}
          on_web_mode_change={handle_web_mode_change}
          on_api_mode_change={handle_api_mode_change}
        />
      </div>
      <div
        className={cn(styles.slot, {
          [styles['slot--hidden']]: active_view != 'intro'
        })}
      >
        <Intro
          on_open_home_view={() => set_active_view('home')}
          version={version}
        />
      </div>
    </div>
  )
}
