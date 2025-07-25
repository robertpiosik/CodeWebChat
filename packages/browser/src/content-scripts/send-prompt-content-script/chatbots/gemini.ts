import { CHATBOTS } from '@shared/constants/chatbots'
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

export const gemini: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('toolbox-drawer')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_model: async (model?: string) => {
    if(!model) return
    if (model && model in CHATBOTS['Gemini'].models) {
      const model_selector_trigger = document.querySelector(
        'bard-logo + button'
      ) as HTMLButtonElement
      if (model_selector_trigger) {
        model_selector_trigger.click()
        await new Promise((r) => requestAnimationFrame(r))
        const menu_content =
          document.querySelector('.mat-mdc-menu-content') ||
          document.querySelector('mat-action-list')
        if (menu_content) {
          const model_options = Array.from(
            menu_content.querySelectorAll('button[mat-menu-item]')
          )
          for (const option of model_options) {
            const name_element = option.querySelector(
              '.title-and-description > span:last-child'
            )
            if (
              name_element &&
              name_element.textContent?.trim() ==
                (CHATBOTS['Gemini'].models as any)[model]
            ) {
              ;(option as HTMLElement).click()
              await new Promise((r) => requestAnimationFrame(r))
              break
            }
          }
        }
      }
    }
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    const supported_options = CHATBOTS['Gemini'].supported_options
    for (const option of options) {
      if (option == 'canvas' && supported_options['canvas']) {
        const canvas_button = Array.from(
          document.querySelectorAll('button')
        ).find(
          (button) => button.textContent?.trim() == 'Canvas'
        ) as HTMLButtonElement
        if (canvas_button) {
          canvas_button.click()
        }
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
        'response-container'
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
          const more_button = params.footer.querySelector(
            'button[data-test-id="more-menu-button"]'
          ) as HTMLElement
          more_button.click()
          await new Promise((r) => requestAnimationFrame(r))
          const copy_button = document.querySelector(
            '.cdk-overlay-container button[data-test-id="copy-button"]'
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

        apply_response_button.focus()
      }

      create_apply_response_button()
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (document.querySelector('mat-icon[data-mat-icon-name="stop"]')) {
          return
        }

        show_response_ready_notification({ chatbot_name: 'Gemini' })

        const all_footers = document.querySelectorAll(
          'message-actions > div > div'
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
