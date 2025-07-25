import { Chatbot } from '../types/chatbot'
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

export const mistral: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('div[contenteditable="true"]')) {
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
    const think_button_icon_path = document.querySelector(
      'path[d="M9 18h6"]'
    ) as SVGPathElement

    const think_button = think_button_icon_path.closest(
      'button'
    ) as HTMLButtonElement

    const should_be_on = options.includes('think')
    const is_on = think_button.getAttribute('data-state') == 'on'

    if (should_be_on != is_on) {
      think_button.click()
      await new Promise((r) => requestAnimationFrame(r))
    }
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (params: { footer: Element }) => {
      // Check if buttons already exist by text content to avoid duplicates
      const existing_apply_response_button = Array.from(
        params.footer.querySelectorAll('button')
      ).find((btn) => btn.textContent == apply_response_button_text)

      if (existing_apply_response_button) return

      const chat_turn =
        params.footer.parentElement?.parentElement?.querySelector(
          '.prose'
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
            'button:last-child'
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
          params.footer.children[0]
        )

        apply_response_button.focus()
      }

      create_apply_response_button()
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          !document.querySelector(
            'path[d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"]'
          ) || // Share button in top right corner
          document.querySelector('form rect[rx="2"]') // Stop button
        )
          return

        show_response_ready_notification({ chatbot_name: 'Mistral' })

        const all_footers = document.querySelectorAll(
          'div[data-message-author-role="assistant"] > div:last-child > div:last-child > div:last-child'
        )

        all_footers.forEach((footer) => {
          add_buttons({
            footer
          })
        })
      })
    })

    requestAnimationFrame(() => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      })
    })
  }
}
