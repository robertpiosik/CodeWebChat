import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const yuanbao: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('.input-guide-v2')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  enter_message: async (params) => {
    const input_element = document.querySelector(
      'div[contenteditable="true"]'
    ) as HTMLElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'yuanbao.enter_message',
        log_message: 'Message input not found'
      })
      return
    }

    input_element.textContent = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.dispatchEvent(new Event('change', { bubbles: true }))
    input_element.focus()
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
        get_chat_turn: (f) => f.closest('.agent-chat__bubble__content'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            '.agent-chat__toolbar__copy'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'yuanbao.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[6])
      })
    }

    observe_for_responses({
      chatbot_name: 'Yuanbao',
      is_generating: () => !!document.querySelector('rect[x="7.71448"]'),
      footer_selector: '.agent-chat__toolbar__right',
      add_buttons
    })
  }
}
