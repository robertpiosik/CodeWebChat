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

export const doubao: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (
          document.querySelector(
            'span[data-testid="chat_header_avatar_button"]'
          )
        ) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    const deep_thinking_button = document.querySelector(
      'div[data-testid="chat_input"] input[data-testid="upload-file-input"] + button'
    ) as HTMLButtonElement
    if (!deep_thinking_button) {
      report_initialization_error({
        function_name: 'doubao.set_options',
        log_message: 'Thinking mode button not found',
        alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
      })
      return
    }
    const mouse_up = new MouseEvent('mouseup', { bubbles: true })
    deep_thinking_button.dispatchEvent(mouse_up)
    await new Promise((r) => requestAnimationFrame(r))
    const portal = document.querySelector('.semi-portal')
    if (!portal) {
      report_initialization_error({
        function_name: 'doubao.set_options',
        log_message: 'Options portal not found',
        alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
      })
      return
    }
    const menu_items = portal.querySelectorAll('li[role="menuitem"]')
    if (menu_items.length === 0) {
      report_initialization_error({
        function_name: 'doubao.set_options',
        log_message: 'Options menu items not found',
        alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
      })
      return
    }
    const last_menu_item = menu_items[menu_items.length - 1] as HTMLElement
    const mouse_down = new MouseEvent('mousedown', { bubbles: true })
    last_menu_item.dispatchEvent(mouse_down)
    await new Promise((r) => requestAnimationFrame(r))
    const supported_options = CHATBOTS['Doubao'].supported_options
    for (const option of options) {
      if (option == 'deep-thinking' && supported_options['deep-thinking']) {
        const deep_thinking_button_2 = document.querySelector(
          'div[data-testid="chat_input"] input[data-testid="upload-file-input"] + button'
        ) as HTMLButtonElement
        if (!deep_thinking_button_2) {
          report_initialization_error({
            function_name: 'doubao.set_options',
            log_message: 'Thinking mode button not found (for deep-thinking)',
            alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
          })
          return
        }
        deep_thinking_button_2.dispatchEvent(
          new MouseEvent('mouseup', { bubbles: true })
        )
        await new Promise((r) => requestAnimationFrame(r))
        const portal_2 = document.querySelector('.semi-portal')
        if (!portal_2) {
          report_initialization_error({
            function_name: 'doubao.set_options',
            log_message: 'Options portal not found (for deep-thinking)',
            alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
          })
          return
        }
        const menu_items_2 = portal_2.querySelectorAll('li[role="menuitem"]')
        if (menu_items_2.length < 2) {
          report_initialization_error({
            function_name: 'doubao.set_options',
            log_message: 'Deep thinking menu item not found',
            alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
          })
          return
        }
        const deep_thinking_item = menu_items_2[1] as HTMLElement
        deep_thinking_item.dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true })
        )
        await new Promise((r) => requestAnimationFrame(r))
      }
    }
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
        get_chat_turn: (f) => f.closest('div[data-testid="receive_message"]'),
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button[data-testid="message_action_copy"]'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'doubao.perform_copy',
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
      chatbot_name: 'Doubao',
      is_generating: () =>
        !document
          .querySelector('div[data-testid="chat_input_local_break_button"]')
          ?.classList.contains('!hidden'),
      footer_selector:
        'div[data-testid="message_action_bar"] > div > div > div',
      add_buttons
    })
  }
}
