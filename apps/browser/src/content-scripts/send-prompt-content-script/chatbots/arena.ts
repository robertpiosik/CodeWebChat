import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const arena: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('textarea[aria-hidden="true"]')) {
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
        function_name: 'arena.enter_message',
        log_message: 'Message input textarea not found'
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
        get_chat_turn: (f) =>
          f
            .closest('.bg-surface-primary')
            ?.querySelector('div.prose') as HTMLElement,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:has([d="M15 9V4.6C15 4.26863 14.7314 4 14.4 4H4.6C4.26863 4 4 4.26863 4 4.6V14.4C4 14.7314 4.26863 15 4.6 15H9"])'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'arena.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[0])
      })
    }

    observe_for_responses({
      chatbot_name: 'Arena',
      is_generating: () => !!document.querySelector('ol.animate-spin'),
      footer_selector:
        'ol .bg-surface-primary > div:last-child > div.text-text-primary',
      add_buttons
    })
  }
}
