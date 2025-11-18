import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const minimax: Chatbot = {
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
          f.parentElement!.parentElement!.querySelector('.message'),
        perform_copy: (f) => {
          const copy_button = f.querySelector('div:first-child') as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'minimax.perform_copy',
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
      chatbot_name: 'Minimax',
      is_generating: () =>
        !!document.querySelector(
          'path[d="M0 3C0 1.34315 1.34315 0 3 0H9C10.6569 0 12 1.34315 12 3V9C12 10.6569 10.6569 12 9 12H3C1.34315 12 0 10.6569 0 9V3Z"]'
        ) ||
        !document.querySelector(
          '.message.received + div > div > div:last-child'
        ),
      footer_selector: '.message.received + div > div',
      add_buttons
    })
  }
}
