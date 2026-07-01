import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const github_copilot: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('form button[aria-haspopup="true"]')) {
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
        log_message: 'Message input textarea not found for GitHub Copilot'
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
        edit_format: params.edit_format,
        footer,
        get_chat_turn: (f) => f.closest('div.message-container') as HTMLElement,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:nth-child(5)'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'github_copilot.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[7])
      })
    }

    observe_for_responses({
      chatbot_name: 'GitHub Copilot',
      is_generating: () =>
        !!document.querySelector(
          'path[d="M5.75 4h4.5c.966 0 1.75.784 1.75 1.75v4.5A1.75 1.75 0 0 1 10.25 12h-4.5A1.75 1.75 0 0 1 4 10.25v-4.5C4 4.784 4.784 4 5.75 4Z"]'
        ),
      footer_selector: 'div[data-testid="nonshared-toolbar"]',
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
