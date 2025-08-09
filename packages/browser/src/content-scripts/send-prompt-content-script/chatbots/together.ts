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
import { CHATBOTS } from '@shared/constants/chatbots'

export const together: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.activeElement?.tagName == 'TEXTAREA') {
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

    const model_label_to_find = (CHATBOTS['Together'].models as any)[model]
      ?.label
    if (!model_label_to_find) return

    const model_selector_button = document.querySelector(
      'button[aria-haspopup="listbox"]'
    ) as HTMLButtonElement

    if (model_selector_button.textContent?.includes(model_label_to_find)) {
      return
    }

    model_selector_button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
    await new Promise((r) => requestAnimationFrame(r))

    const models_dropdown = document.querySelector(
      'div[data-floating-ui-focusable]'
    ) as HTMLElement

    const options = models_dropdown.querySelectorAll('div[role="option"]')
    for (const option of Array.from(options)) {
      if (option.textContent?.startsWith(model_label_to_find)) {
        ;(option as HTMLElement).click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (params: { footer: Element }) => {
      // Check if buttons already exist by text content to avoid duplicates
      const existing_apply_response_button = Array.from(
        params.footer.querySelectorAll('button')
      ).find((btn) => btn.textContent == apply_response_button_text)

      if (existing_apply_response_button) return

      const chat_turn = params.footer.closest(
        'div[data-testid="assistant-message"]'
      ) as HTMLElement
      if (!chat_turn) return

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
            'button:first-child'
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
          document.querySelector('button[data-testid="stop-button"]') &&
          document.querySelector('div[data-testid="assistant-message-toolbar"]')
        ) {
          return
        }

        show_response_ready_notification({ chatbot_name: 'Together' })

        const all_footers = document.querySelectorAll(
          'div[data-testid="assistant-message-toolbar"]'
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
