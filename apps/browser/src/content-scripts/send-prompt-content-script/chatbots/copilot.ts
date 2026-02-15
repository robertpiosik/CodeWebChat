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
        function_name: 'enter_message',
        log_message: 'Message input textarea not found for Copilot'
      })
      return
    }
    input_element.value = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
  },
  inject_apply_response_button: (params) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id: params.client_id,
        raw_instructions: params.raw_instructions,
        edit_format: params.edit_format,
        footer,
        get_chat_turn: (f) => f.closest('div[data-content="ai-message"]'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button[data-testid="copy-message-button"]'
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
        !!document.querySelector('button[data-testid="stop-button"]'),
      footer_selector: 'div[data-testid="message-item-reactions"]',
      add_buttons
    })
  }
}
