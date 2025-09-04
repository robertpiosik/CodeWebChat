import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'

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
    const mouse_up = new MouseEvent('mouseup', { bubbles: true })
    deep_thinking_button.dispatchEvent(mouse_up)
    await new Promise((r) => requestAnimationFrame(r))
    const portal = document.querySelector('.semi-portal')
    const menu_items = portal!.querySelectorAll('li[role="menuitem"]')
    const last_menu_item = menu_items[menu_items.length - 1] as HTMLElement
    const mouse_down = new MouseEvent('mousedown', { bubbles: true })
    last_menu_item.dispatchEvent(mouse_down)
    await new Promise((r) => requestAnimationFrame(r))
    const supported_options = CHATBOTS['Doubao'].supported_options
    for (const option of options) {
      if (option == 'deep-thinking' && supported_options['deep-thinking']) {
        const deep_thinking_button = document.querySelector(
          'div[data-testid="chat_input"] input[data-testid="upload-file-input"] + button'
        ) as HTMLButtonElement
        const mouse_up = new MouseEvent('mouseup', { bubbles: true })
        deep_thinking_button.dispatchEvent(mouse_up)
        await new Promise((r) => requestAnimationFrame(r))
        const portal = document.querySelector('.semi-portal')
        const menu_items = portal!.querySelectorAll('li[role="menuitem"]')
        const last_menu_item = menu_items[1] as HTMLElement
        const mouse_down = new MouseEvent('mousedown', { bubbles: true })
        last_menu_item.dispatchEvent(mouse_down)
        await new Promise((r) => requestAnimationFrame(r))
      }
    }
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        footer,
        get_chat_turn: (f) => f.closest('div[data-testid="receive_message"]'),
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button[data-testid="message_action_copy"]'
          ) as HTMLElement
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
