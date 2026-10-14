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
        if (document.querySelector('div[contenteditable="true"]')) {
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
    input_element.focus()
  },
  setup_observer: (params) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id: params.client_id,
        raw_instructions: params.raw_instructions,
        footer,
        perform_copy: async (f) => {
          const copy_dropdown_arrow = f.querySelector(
            'div[class*="ToolbarCopy_arrowIconWrap"]'
          ) as HTMLElement
          if (!copy_dropdown_arrow) {
            report_initialization_error({
              function_name: 'yuanbao.perform_copy',
              log_message: 'Copy dropdown arrow not found'
            })
            return
          }
          copy_dropdown_arrow.click()

          await new Promise((resolve) => setTimeout(resolve, 100))

          const dropdown_items = document.querySelectorAll(
            '.t-popup__content[class*="ToolbarCopy_dropdown-menu"] .t-dropdown__item'
          )
          const copy_markdown_option = dropdown_items[1] as HTMLElement

          if (!copy_markdown_option) {
            report_initialization_error({
              function_name: 'yuanbao.perform_copy',
              log_message: 'Copy as markdown option not found'
            })
            return
          }
          copy_markdown_option.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[6])
      })
    }

    observe_for_responses({
      chatbot_name: 'Yuanbao',
      is_generating: () => !!document.querySelector('rect[x="7.71448"]'),
      footer_selector: '.agent-chat__toolbar__right',
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
