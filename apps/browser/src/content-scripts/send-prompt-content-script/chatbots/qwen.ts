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
          '.ant-dropdown-trigger'
        ) as HTMLElement

        if (model_selector_button) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  set_model: async (chat) => {
    const model = chat.model
    if (!model) return
    const model_selector_button = document.querySelector(
      '.header-left .ant-dropdown-trigger'
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

    const expand_more = document.querySelector(
      '[class*="index-module__model-selector-view-more__"]'
    ) as HTMLElement
    if (expand_more) {
      expand_more.click()
      await new Promise((r) => setTimeout(r, 300))
    } else {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Expand more button not found'
      })
      return
    }
    const model_buttons = document.querySelectorAll(
      '[class*="index-module__model-selector-dropdown-menu-item___"]'
    ) as NodeListOf<HTMLButtonElement>
    for (const button of Array.from(model_buttons)) {
      const model_name_element = (button.querySelector(
        '[class*="index-module__model-name-text___"]'
      ) || button.querySelector('div.text-15')) as HTMLDivElement
      if (
        model_name_element &&
        model_name_element.textContent ==
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
        if (!temporary_button) {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Temporary chat button not found'
          })
          return
        }
        temporary_button.click()
        await new Promise((r) => requestAnimationFrame(r))
      } else if (option == 'thinking' && supported_options?.['thinking']) {
        const thinking_button = document.querySelector(
          '.chat-message-input-thinking-budget-btn > div'
        ) as HTMLDivElement
        if (!thinking_button) {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Thinking button not found'
          })
          return
        }
        thinking_button.click()
        await new Promise((r) => requestAnimationFrame(r))
      } else if (option == 'search' && supported_options?.['search']) {
        const search_button = document.querySelector(
          '.chat-message-input-thinking-budget-btn + div'
        ) as HTMLDivElement
        if (!search_button) {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Search button not found'
          })
          return
        }
        search_button.click()
        await new Promise((r) => requestAnimationFrame(r))
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
          f.closest('.chat-response-message') as HTMLElement,
        get_code_from_block: (b) => b.querySelector('.cm-line')?.textContent,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'div.qwen-chat-package-comp-new-action-control-container-copy'
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
        insert_button: (f, b) => f.insertBefore(b, f.children[0]),
        customize_button: (b) => (b.style.order = '7')
      })
    }

    observe_for_responses({
      chatbot_name: 'Qwen',
      is_generating: () => !document.querySelector('.send-button.disabled'),
      footer_selector: '.qwen-chat-package-comp-new-action-control-icons',
      add_buttons
    })
  }
}
