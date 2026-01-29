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
    input_element.dispatchEvent(new Event('change', { bubbles: true }))
  },
  inject_apply_response_button: (
    client_id: number,
    raw_instructions?: string,
    edit_format?: string
  ) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        raw_instructions,
        edit_format,
        footer,
        get_chat_turn: (f) =>
          f
            .closest('div[role="group"]')
            ?.querySelector('div.prose') as HTMLElement,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:nth-child(3)'
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
      is_generating: () =>
        !!document.querySelector('canvas[data-sentry-component="Loading"]'),
      footer_selector:
        'div[aria-roledescription="slide"] > div > div > div.gap-2:last-child',
      add_buttons
    })
  }
}
