import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import {
  InitializationError,
  report_initialization_error
} from '../utils/report-initialization-error'

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
  inject_apply_response_button: (
    client_id: number,
    raw_instructions?: string
  ) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        raw_instructions,
        footer,
        get_chat_turn: (f) => {
          const chat_turn = f.parentElement?.querySelector('.chat-assistant')
          if (!chat_turn) {
            report_initialization_error({
              function_name: 'z_ai.get_chat_turn',
              log_message: 'Chat turn container not found for footer',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
            })
            return null
          }
          return chat_turn as HTMLElement
        },
        get_code_blocks: (t) => t.querySelectorAll('.cm-content'),
        get_code_from_block: (b) => b.querySelector('.cm-line')?.textContent,
        perform_copy: (f) => {
          const copy_button = f.querySelector('button.copy-response-button')
          if (!copy_button) {
            report_initialization_error({
              function_name: 'z_ai.perform_copy',
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
            })
            return
          }
          ;(copy_button as HTMLElement).click()
        },
        insert_button: (f, b) =>
          f.insertBefore(b, f.children[f.children.length])
      })
    }

    observe_for_responses({
      chatbot_name: 'Z.AI',
      is_generating: () =>
        !!document.querySelector(
          'path[d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm6-2.438c0-.724.588-1.312 1.313-1.312h4.874c.725 0 1.313.588 1.313 1.313v4.874c0 .725-.588 1.313-1.313 1.313H9.564a1.312 1.312 0 01-1.313-1.313V9.564z"]'
        ),
      footer_selector: '.chat-assistant + div',
      add_buttons
    })
  }
}
