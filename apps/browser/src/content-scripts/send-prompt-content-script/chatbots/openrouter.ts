import { default_system_instructions } from '@shared/constants/default-system-instructions'
import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

const show_options_modal = async (function_name: string) => {
  const model_button = document.querySelector(
    'div[role="button"][aria-haspopup="dialog"]'
  ) as HTMLDivElement
  if (!model_button) {
    report_initialization_error({
      function_name,
      log_message: 'Model button not found'
    })
    return false
  }
  model_button.click()
  await new Promise((r) => requestAnimationFrame(r))
  const advanced_settings_button = Array.from(
    document.querySelectorAll('[data-side="bottom"] button')
  ).find((button) => {
    const path = button.querySelector('path')
    return (
      path?.getAttribute('d') ==
      'M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75'
    )
  }) as HTMLButtonElement
  if (!advanced_settings_button) {
    report_initialization_error({
      function_name,
      log_message: 'Advanced settings button not found'
    })
    return false
  }
  advanced_settings_button.click()

  await new Promise((r) => requestAnimationFrame(r))
  return true
}

const close_options_modal = async (function_name: string) => {
  const close_button = document.querySelector(
    '[data-slot="dialog-viewport"] [data-base-ui-focusable][data-open] > button'
  ) as HTMLButtonElement
  if (!close_button) {
    report_initialization_error({
      function_name,
      log_message: 'Close button for dialog not found'
    })
    return false
  }
  close_button.click()
  await new Promise((r) => requestAnimationFrame(r))
  return true
}

export const openrouter: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('textarea')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  enter_system_instructions: async (chat) => {
    const system_instructions =
      chat.system_instructions || default_system_instructions
    if (!system_instructions) return
    if (!(await show_options_modal('enter_system_instructions'))) return
    const textarea = document.querySelector(
      'div[role="dialog"] textarea'
    ) as HTMLTextAreaElement
    if (!textarea) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'System instructions textarea not found'
      })
      await close_options_modal('enter_system_instructions')
      return
    }
    const custom_system_instructions_button = Array.from(
      document.querySelectorAll('div[role="dialog"] button')
    ).find(
      (button) => button.textContent?.trim() == 'Custom'
    ) as HTMLButtonElement
    if (!custom_system_instructions_button) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'Custom system instructions button not found'
      })
      await close_options_modal('enter_system_instructions')
      return
    }
    custom_system_instructions_button.click()
    await new Promise((r) => requestAnimationFrame(r))

    const active_textarea = document.querySelector(
      'div[role="dialog"] textarea'
    ) as HTMLTextAreaElement
    if (!active_textarea) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'System instructions textarea disappeared'
      })
      await close_options_modal('enter_system_instructions')
      return
    }

    active_textarea.focus()
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set
    nativeTextAreaValueSetter?.call(active_textarea, system_instructions)
    active_textarea.dispatchEvent(new Event('input', { bubbles: true }))
    active_textarea.blur()
    await close_options_modal('enter_system_instructions')
  },
  set_reasoning_effort: async (chat) => {
    if (!chat.reasoning_effort) return
    if (!(await show_options_modal('set_reasoning_effort'))) return
    const dialog = document.querySelector(
      '[data-slot="dialog-viewport"] [data-base-ui-focusable][data-open]'
    )
    if (!dialog) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Dialog not found'
      })
      return
    }

    const reasoning_button = Array.from(dialog.querySelectorAll('button')).find(
      (button) =>
        ['None', 'Minimal', 'Low', 'Medium', 'High', 'XHigh', 'Max'].includes(
          button.textContent?.trim() || ''
        )
    ) as HTMLButtonElement

    if (!reasoning_button) {
      await close_options_modal('set_reasoning_effort')
      return
    }

    if (
      reasoning_button.textContent?.trim().toLowerCase() !==
      chat.reasoning_effort.toLowerCase()
    ) {
      reasoning_button.click()
      await new Promise((r) => requestAnimationFrame(r))

      const options = document.querySelectorAll('div[role="option"]')
      if (options.length === 0) {
        report_initialization_error({
          function_name: 'set_reasoning_effort',
          log_message: 'Reasoning effort options not found'
        })
        await close_options_modal('set_reasoning_effort')
        return
      }

      let found = false
      for (const option of Array.from(options)) {
        if (
          option.textContent?.trim().toLowerCase() ===
          chat.reasoning_effort.toLowerCase()
        ) {
          ;(option as HTMLElement).click()
          found = true
          break
        }
      }

      if (!found) {
        report_initialization_error({
          function_name: 'set_reasoning_effort',
          log_message: `Reasoning effort option "${chat.reasoning_effort}" not found`
        })
      }
    }

    await close_options_modal('set_reasoning_effort')
  },
  enter_message: async (params) => {
    const input_element = document.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'openrouter.enter_message',
        log_message: 'Message input textarea not found'
      })
      return
    }
    input_element.value = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.focus()
  },
  setup_observer: (params) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id: params.client_id,
        raw_instructions: params.raw_instructions,
        footer,
        perform_copy: (f) => {
          const actions = f.querySelectorAll('button')
          const copy_button = Array.from(actions).find((button) => {
            const path = button.querySelector('path')
            return (
              path?.getAttribute('d') ==
              'M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184'
            )
          }) as HTMLButtonElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'openrouter.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[5])
      })
    }

    observe_for_responses({
      chatbot_name: 'OpenRouter',
      is_generating: () => !!document.querySelector('.animate-spin'),
      footer_selector:
        'div[data-testid="assistant-message"] > div:last-child > div',
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
