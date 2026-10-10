import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const copilot: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (
          document.getElementById('gptModeSwitcher') &&
          document.getElementById('m365-chat-editor-target-element')
        ) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_options: async (chat) => {
    const options = chat.options
    if (!options) return

    const supported_options = CHATBOTS['Copilot'].supported_options
    for (const option of options) {
      if (option == 'temporary' && supported_options?.['temporary']) {
        const temporary_button = document.querySelector(
          'button[aria-label="Temporary chat"]'
        ) as HTMLButtonElement

        if (!temporary_button) {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Temporary chat button not found'
          })
          return
        }

        if (temporary_button.getAttribute('aria-pressed') != 'true') {
          temporary_button.click()
          await new Promise((r) => requestAnimationFrame(r))
        }
      }
    }
  },
  set_reasoning_effort: async (chat) => {
    const reasoning_effort = chat.reasoning_effort
    if (!reasoning_effort) return

    const mode_switcher = document.getElementById(
      'gptModeSwitcher'
    ) as HTMLButtonElement
    if (!mode_switcher) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Mode switcher not found for Copilot'
      })
      return
    }

    mode_switcher.click()
    await new Promise((resolve) => setTimeout(resolve, 500))

    const popover = document.querySelector('.fui-MenuPopover')
    if (!popover) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Mode switcher popover not found'
      })
      return
    }

    const menu_items = Array.from(popover.querySelectorAll('[role="menuitem"]'))

    let target_text = ''
    if (reasoning_effort.toLowerCase() == 'auto') {
      target_text = 'auto'
    } else if (reasoning_effort.toLowerCase() == 'quick') {
      target_text = 'quick response'
    } else if (reasoning_effort.toLowerCase() == 'deep') {
      target_text = 'think deeper'
    }

    const target_item = menu_items.find((item) => {
      const title = item.querySelector('h4')?.textContent?.trim().toLowerCase()
      return title == target_text
    }) as HTMLElement

    if (target_item) {
      target_item.click()
    } else {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    }

    await new Promise((resolve) => requestAnimationFrame(resolve))
  },
  enter_message: async (params) => {
    const input_element = document.getElementById(
      'm365-chat-editor-target-element'
    ) as HTMLElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'enter_message',
        log_message: 'Message input element not found for Copilot'
      })
      return
    }

    input_element.focus()

    input_element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: params.message
      })
    )
  },
  setup_observer: (params) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id: params.client_id,
        raw_instructions: params.raw_instructions,
        footer,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button[data-testid="CopyButtonTestId"]'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'copilot.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.firstChild)
      })
    }

    observe_for_responses({
      chatbot_name: 'Copilot',
      is_generating: () =>
        !!document.querySelector('button svg rect[rx="2.5"]'),
      footer_selector:
        '.fai-CopilotMessage__actions > div > div > div > div > div',
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
