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

export const deepseek: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('div.intercom-lightweight-app')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  set_options: async (options?: string[]) => {
    if (!options) return

    const deep_think_button = Array.from(
      document.querySelectorAll('button')
    ).find(
      (button) =>
        button.textContent === 'DeepThink' || button.textContent === '深度思考'
    )
    if (!deep_think_button) {
      report_initialization_error({
        function_name: 'set_options',
        log_message: 'DeepThink button not found',
        alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
      })
      return
    }

    const search_button = Array.from(document.querySelectorAll('button')).find(
      (button) =>
        button.textContent === 'Search' || button.textContent === '联网搜索'
    )
    if (!search_button) {
      report_initialization_error({
        function_name: 'set_options',
        log_message: 'Search button not found',
        alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
      })
      return
    }

    // Uncheck deep think
    const deep_think_button_style = window.getComputedStyle(deep_think_button)
    if (
      deep_think_button_style.getPropertyValue('color') !== 'rgb(15, 17, 21)' &&
      deep_think_button_style.getPropertyValue('color') !== 'rgb(249, 250, 251)'
    ) {
      deep_think_button.click()
    }

    // Uncheck search
    const search_button_style = window.getComputedStyle(search_button)
    if (
      search_button_style.getPropertyValue('color') !== 'rgb(15, 17, 21)' &&
      search_button_style.getPropertyValue('color') !== 'rgb(249, 250, 251)'
    ) {
      search_button.click()
    }

    await new Promise((r) => requestAnimationFrame(r))

    const supported_options = CHATBOTS.DeepSeek.supported_options || {}
    for (const option of options) {
      if (option === 'deep-think' && supported_options['deep-think']) {
        deep_think_button.click()
      } else if (option === 'search' && supported_options.search) {
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
        get_chat_turn: (f) =>
          f.parentElement?.parentElement?.querySelector(
            '.ds-markdown'
          ) as HTMLElement,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'div[role="button"]'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'deepseek.perform_copy',
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
            })
            return
          }
          if (!copy_button) {
            report_initialization_error({
              function_name: 'deepseek.perform_copy',
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
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
      chatbot_name: 'DeepSeek',
      is_generating: () => {
        const textarea = document.querySelector('textarea')
        if (!textarea) {
          return false
        }
        return (
          !!document.querySelector(
            'input[type="file"] + div[aria-disabled="false"]'
          ) && !textarea.value
        )
      },
      footer_selector: 'div.ds-message + div + div > div.ds-flex',
      add_buttons
    })
  }
}
