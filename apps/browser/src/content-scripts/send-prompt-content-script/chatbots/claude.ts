import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const claude: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        const input_element = document.querySelector(
          'div[contenteditable=true]'
        ) as HTMLElement

        if (input_element) {
          input_element.innerText = ' '
          input_element.dispatchEvent(new Event('input', { bubbles: true }))

          if (input_element.innerText === ' ') {
            resolve(null)
            return
          }
        }

        setTimeout(check_for_element, 100)
      }
      check_for_element()
    })
  },
  set_options: async (chat) => {
    const options = chat.options
    if (!options) return
    const supported_options = CHATBOTS['Claude'].supported_options
    if (
      options.includes('incognito-chat') &&
      supported_options?.['incognito-chat']
    ) {
      const incognito_button_path = document.querySelector(
        'path[d="M6.99951 8.66672C7.5518 8.66672 7.99951 9.11443 7.99951 9.66672C7.9993 10.2188 7.55166 10.6667 6.99951 10.6667C6.44736 10.6667 5.99973 10.2188 5.99951 9.66672C5.99951 9.11443 6.44723 8.66672 6.99951 8.66672Z"]'
      )
      if (incognito_button_path) {
        const incognito_button = incognito_button_path.closest(
          'button'
        ) as HTMLButtonElement
        if (incognito_button) {
          incognito_button.click()
          await new Promise((r) => requestAnimationFrame(r))
        } else {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Incognito chat button not found for Claude'
          })
          return
        }
      } else {
        report_initialization_error({
          function_name: 'set_options',
          log_message: 'Incognito chat button path not found for Claude'
        })
        return
      }
    }
  },
  enter_message: async (params) => {
    const input_element = document.querySelector(
      'div[contenteditable=true]'
    ) as HTMLElement

    if (!input_element) {
      report_initialization_error({
        function_name: 'enter_message',
        log_message: 'Message input not found'
      })
      return
    }

    input_element.innerText = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.focus()
  },
  setup_observer: (params) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id: params.client_id,
        raw_instructions: params.raw_instructions,
        footer,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:nth-child(2)'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'claude.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[0])
      })
    }

    const footer_selector =
      'div[data-cds="AssistantMessage"] > div:last-child > div'

    observe_for_responses({
      chatbot_name: 'Claude',
      is_generating: () =>
        !!document.querySelector(
          'div[data-cds="AssistantMessage"] div[data-cds="TurnStatus"]'
        ),
      footer_selector,
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
