import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'
import browser from 'webextension-polyfill'
import {
  apply_chat_response_button_style,
  set_button_disabled_state
} from '../utils/apply-response-styles'
import { Message } from '@/types/messages'
import { is_eligible_code_block } from '../utils/is-eligible-code-block'
import {
  apply_response_button_text,
  apply_response_button_title
} from '../constants/copy'
import { show_response_ready_notification } from '../utils/show-response-ready-notification'

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
    const add_buttons = (params: { footer: Element }) => {
      // Check if buttons already exist by text content to avoid duplicates
      const existing_apply_response_button = Array.from(
        params.footer.querySelectorAll('button')
      ).find((btn) => btn.textContent == apply_response_button_text)

      if (existing_apply_response_button) return

      const chat_turn = params.footer.closest(
        'div[data-testid="receive_message"]'
      ) as HTMLElement
      const code_blocks = chat_turn.querySelectorAll('code')
      let has_eligible_block = false
      for (const code_block of Array.from(code_blocks)) {
        const first_line_text = code_block?.textContent?.split('\n')[0]
        if (first_line_text && is_eligible_code_block(first_line_text)) {
          has_eligible_block = true
          break
        }
      }
      if (!has_eligible_block) return

      const create_apply_response_button = () => {
        const apply_response_button = document.createElement('button')
        apply_response_button.textContent = apply_response_button_text
        apply_response_button.title = apply_response_button_title
        apply_chat_response_button_style(apply_response_button)

        apply_response_button.addEventListener('click', async () => {
          set_button_disabled_state(apply_response_button)
          const copy_button = params.footer.querySelector(
            'button[data-testid="message_action_copy"]'
          ) as HTMLElement
          copy_button.click()
          await new Promise((resolve) => setTimeout(resolve, 500))
          browser.runtime.sendMessage<Message>({
            action: 'apply-chat-response',
            client_id
          })
        })

        params.footer.insertBefore(
          apply_response_button,
          params.footer.children[params.footer.children.length]
        )

        apply_response_button.focus()
      }

      create_apply_response_button()
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          !document
            .querySelector('div[data-testid="chat_input_local_break_button"]')
            ?.classList.contains('!hidden')
        ) {
          return
        }

        show_response_ready_notification({ chatbot_name: 'Doubao' })

        const all_footers = document.querySelectorAll(
          'div[data-testid="message_action_bar"] > div > div > div'
        )
        all_footers.forEach((footer) => {
          add_buttons({
            footer
          })
        })
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    })
  }
}
