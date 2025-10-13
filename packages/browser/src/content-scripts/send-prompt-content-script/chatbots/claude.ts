import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import {
  InitializationError,
  report_initialization_error
} from '../utils/report-initialization-error'

export const claude: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('body[style="pointer-events: auto;"]')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_model: async (model?: string) => {
    if (!model) return
    const model_selector_button = document.querySelector(
      'button[data-testid="model-selector-dropdown"]'
    ) as HTMLButtonElement
    if (!model_selector_button) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector button not found',
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      return
    }

    const model_name_to_find = (CHATBOTS['Claude'].models as any)[model]?.label
    if (!model_name_to_find) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: `Model "${model}" not found`,
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      return
    }

    if (model_selector_button.textContent?.includes(model_name_to_find)) {
      return
    }

    model_selector_button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
    await new Promise((r) => requestAnimationFrame(r))

    const menu_items = document.querySelectorAll(
      'div[data-radix-popper-content-wrapper] div[role="menuitem"]'
    )

    if (menu_items.length == 0) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector menu items not found',
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      return
    }

    for (const item of Array.from(menu_items)) {
      if (item.textContent?.includes(model_name_to_find)) {
        ;(item as HTMLElement).click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    const supported_options = CHATBOTS['Claude'].supported_options
    if (
      options.includes('incognito-chat') &&
      supported_options['incognito-chat']
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
            log_message: 'Incognito chat button not found for Claude',
            alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
          })
          return
        }
      } else {
        report_initialization_error({
          function_name: 'set_options',
          log_message: 'Incognito chat button path not found for Claude',
          alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
        })
        return
      }
    }
  },
  enter_message_and_send: async (params) => {
    const input_element = document.querySelector(
      'div[contenteditable=true]'
    ) as HTMLElement

    if (!input_element) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Message input not found',
        alert_message: InitializationError.UNABLE_TO_SEND_MESSAGE
      })
      return
    }

    input_element.innerText = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => setTimeout(r, 500))

    if (params.without_submission) return

    const submit_button = Array.from(
      document.querySelectorAll('fieldset button')
    ).find((button) =>
      button.querySelector(
        'path[d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"]'
      )
    ) as HTMLButtonElement
    if (!submit_button) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Submit button not found',
        alert_message: InitializationError.UNABLE_TO_SEND_MESSAGE
      })
      return
    }
    submit_button.click()
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
        get_chat_turn: (f) => f.closest('div[data-is-streaming="false"]'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button[data-testid="action-bar-copy"]'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'claude.perform_copy',
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[0])
      })
    }

    const stop_button_selector =
      'path[d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm40-112v56a12,12,0,0,1-12,12H100a12,12,0,0,1-12-12V100a12,12,0,0,1,12-12h56A12,12,0,0,1,168,100Z"]'
    const footer_selector =
      'div[data-is-streaming="false"] > div:nth-child(2) > div > div'

    observe_for_responses({
      chatbot_name: 'Claude',
      is_generating: () => !!document.querySelector(stop_button_selector),
      footer_selector,
      add_buttons
    })
  }
}
