import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import {
  InitializationError,
  report_initialization_error
} from '../utils/report-initialization-error'

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
  set_model: async (model?: string) => {
    if (!model) return
    const model_selector_button = document.querySelector(
      'button[dt-button-id="model_switch"]'
    ) as HTMLElement
    if (!model_selector_button) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector button not found',
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      return
    }
    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const model_buttons = document.querySelectorAll(
      '.switch-model-dropdown .drop-down-item'
    ) as NodeListOf<HTMLButtonElement>
    for (const button of Array.from(model_buttons)) {
      const model_name_element = button.querySelector(
        '.drop-down-item__name'
      ) as HTMLDivElement
      if (
        model_name_element?.textContent ==
        (CHATBOTS['Yuanbao'].models as any)[model]?.label
      ) {
        button.click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    const supported_options = CHATBOTS['Yuanbao'].supported_options

    if (supported_options['deep-think']) {
      const deep_think_button = document.querySelector(
        'button[dt-button-id="deep_think"]'
      ) as HTMLButtonElement
      if (!deep_think_button) {
        report_initialization_error({
          function_name: 'set_options',
          log_message: 'Deep think button not found',
          alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
        })
        return
      }
      const is_checked = deep_think_button.classList.contains('checked')
      const should_be_checked = options.includes('deep-think')
      if (is_checked !== should_be_checked) {
        deep_think_button.click()
      }
    }

    if (supported_options['search']) {
      const search_button = document.querySelector(
        'button[dt-button-id="online_search"]'
      ) as HTMLButtonElement
      if (!search_button) {
        report_initialization_error({
          function_name: 'set_options',
          log_message: 'Search button not found',
          alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
        })
        return
      }
      const is_checked = search_button.classList.contains('checked')
      const should_be_checked = options.includes('search')
      if (is_checked !== should_be_checked) {
        search_button.click()
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
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
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
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
