import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'
import { debounce } from '@/utils/debounce'
import browser from 'webextension-polyfill'
import { extract_path_from_line_of_code } from '@shared/utils/extract-path-from-line-of-code'
import {
  apply_chat_response_button_style,
  set_button_disabled_state
} from '../utils/apply-response'
import { Message } from '@/types/messages'

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
  set_options: async (options: string[]) => {
    const supported_options = CHATBOTS['Doubao'].supported_options
    for (const option of options) {
      if (option == 'deep-thinking' && supported_options['deep-thinking']) {
        const deep_thinking_button = document.querySelector(
          'div[data-testid="use-deep-thinking-switch-btn"] > button'
        ) as HTMLButtonElement
        // Their script has such listener
        const mouse_up = new MouseEvent('mouseup', { bubbles: true })
        deep_thinking_button.dispatchEvent(mouse_up)
      }
    }
  },
  inject_apply_response_button: (client_id: number) => {
    const debounced_add_buttons = debounce((params: { footer: Element }) => {
      const apply_response_button_text = 'Apply response'

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
        if (
          first_line_text &&
          extract_path_from_line_of_code(first_line_text)
        ) {
          has_eligible_block = true
          break
        }
      }
      if (!has_eligible_block) return

      const create_apply_response_button = () => {
        const apply_response_button = document.createElement('button')
        apply_response_button.textContent = apply_response_button_text
        apply_response_button.title =
          'Integrate changes with the codebase. You can fully revert this operation.'
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
          params.footer.children[5]
        )
      }

      create_apply_response_button()
    }, 100)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          // Stop icon of a stopping response generation button
          !document
            .querySelector('div[data-testid="chat_input_local_break_button"]')
            ?.classList.contains('!hidden')
        ) {
          return
        }

        const all_footers = document.querySelectorAll(
          'div[data-testid="message_action_bar"] > div > div > div'
        )
        all_footers.forEach((footer) => {
          debounced_add_buttons({
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
