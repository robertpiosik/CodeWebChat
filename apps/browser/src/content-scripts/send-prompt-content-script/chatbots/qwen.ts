import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const qwen: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        const model_selector_button = document.querySelector(
          'textarea.message-input-textarea'
        ) as HTMLElement

        if (model_selector_button) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 1500))
  },
  set_model: async (chat) => {
    const model = chat.model
    if (!model) return
    const model_selector_button = document.querySelector(
      '.qwen-chat-v2-dropdown-menu-select'
    ) as HTMLElement
    if (!model_selector_button) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector button not found'
      })
      return
    }

    if (
      model_selector_button.textContent?.trim() ==
      CHATBOTS['Qwen'].models?.[model]?.label
    ) {
      return
    }

    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((r) => setTimeout(r, 100))

    const model_buttons = document.querySelectorAll(
      '.qwen-chat-v2-dropdown-menu-item'
    ) as NodeListOf<HTMLElement>
    for (const button of Array.from(model_buttons)) {
      const model_name_element = button.querySelector(
        '.qwen-chat-v2-dropdown-menu-item-label'
      ) as HTMLSpanElement
      if (
        model_name_element &&
        model_name_element.textContent?.trim() ==
          CHATBOTS['Qwen'].models?.[model]?.label
      ) {
        button.click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_options: async (chat) => {
    const options = chat.options
    if (!options) return
    const supported_options = CHATBOTS['Qwen'].supported_options
    for (const option of options) {
      if (option == 'temporary' && supported_options?.['temporary']) {
        const temporary_button = document.querySelector(
          '.temporary-chat-entry'
        ) as HTMLButtonElement
        if (
          temporary_button &&
          temporary_button.getAttribute('aria-pressed') !== 'true'
        ) {
          temporary_button.click()
        }
      }
    }
  },
  enter_message: async (params) => {
    const input_element = document.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'enter_message',
        log_message: 'Message input textarea not found'
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
        footer,
        get_code_from_block: (b) => b.querySelector('.cm-line')?.textContent,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:first-child'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'qwen.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          if (!copy_button) {
            report_initialization_error({
              function_name: 'qwen.perform_copy',
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
      chatbot_name: 'Qwen',
      is_generating: () => !document.querySelector('.send-button.disabled'),
      footer_selector: '.qwen-chat-package-comp-new-action-control-icons',
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
