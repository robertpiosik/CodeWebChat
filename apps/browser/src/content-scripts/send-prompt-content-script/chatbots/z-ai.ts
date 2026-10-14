import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const z_ai: Chatbot = {
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
  },
  enter_message: async (params) => {
    const input_element = document.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'z_ai.enter_message',
        log_message: 'Message input textarea not found'
      })
      return
    }
    input_element.value = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
  },
  setup_observer: (params) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id: params.client_id,
        raw_instructions: params.raw_instructions,
        footer,
        get_code_from_block: (b) => b.querySelector('.cm-line')?.textContent,
        perform_copy: (f) => {
          const copy_button = f.querySelector('button.copy-response-button')
          if (!copy_button) {
            report_initialization_error({
              function_name: 'z_ai.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          ;(copy_button as HTMLElement).click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[0])
      })
    }

    observe_for_responses({
      chatbot_name: 'Z.AI',
      is_generating: () =>
        !document.querySelector('button[id="send-message-button"]'),
      footer_selector:
        'div[id="messages-container"] > div > div > div > div > div:last-child > div > div:last-child > div > div:last-child',
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
