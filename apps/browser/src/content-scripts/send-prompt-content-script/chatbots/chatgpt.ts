import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const chatgpt: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        const input_element = document.querySelector(
          'div#prompt-textarea'
        ) as HTMLElement

        if (input_element) {
          input_element.innerText = ' '
          input_element.dispatchEvent(new Event('input', { bubbles: true }))

          if (input_element.innerText == ' ') {
            resolve(null)
            return
          }
        }

        setTimeout(check_for_element, 100)
      }
      check_for_element()
    })
  },
  set_options: async (chat) => {
    const options = chat.options
    if (!options) return
    const supported_options = CHATBOTS['ChatGPT'].supported_options
    for (const option of options) {
      if (option == 'temporary' && supported_options?.['temporary']) {
        const button = document.querySelector(
          '#conversation-header-actions button'
        )
        let found = false
        if (button) {
          ;(button as HTMLElement).click()
          found = true
        }
        if (found) {
          await new Promise((resolve) => {
            const check_for_param = () => {
              if (window.location.search.includes('temporary-chat=true')) {
                setTimeout(() => resolve(null), 250)
              } else {
                setTimeout(check_for_param, 100)
              }
            }
            check_for_param()
          })
        } else {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Temporary chat button not found'
            // Don't show alert because temporary mode doesn't work in projects (url override)
          })
        }
      }
    }
  },
  enter_message: async (params) => {
    const input_element = document.querySelector(
      'div#prompt-textarea'
    ) as HTMLTextAreaElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'enter_message',
        log_message: 'Message input textarea not found for ChatGPT'
      })
      return
    }
    input_element.innerText = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
  },
  setup_observer: (params) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id: params.client_id,
        raw_instructions: params.raw_instructions,
        footer,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button[data-testid="copy-turn-action-button"]'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'chatgpt.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) =>
          f.insertBefore(b, f.children[f.children.length])
      })
    }

    observe_for_responses({
      chatbot_name: 'ChatGPT',
      is_generating: () =>
        !!document.querySelector('button[data-testid="stop-button"]'),
      footer_selector: '.agent-turn > div:nth-of-type(2) > div',
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
