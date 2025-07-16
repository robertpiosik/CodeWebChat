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

export const perplexity: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  enter_message_and_send: async (message: string) => {
    let instructions = message
    if (message.includes('<files>')) {
      instructions = message.split('<files>')[0].trim()
      const context = message.split('<files>')[1].split('</files>')[0].trim()

      // Upload file
      const file_input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement
      const blob = new Blob([context], { type: 'text/plain' })
      const file = new File([blob], 'context.txt', { type: 'text/plain' })
      const data_transfer = new DataTransfer()
      data_transfer.items.add(file)
      file_input.files = data_transfer.files
      file_input.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((r) => requestAnimationFrame(r))
      await new Promise((resolve) => {
        const check_for_element = () => {
          if (document.querySelector('svg.tabler-icon-file-text')) {
            resolve(null)
          } else {
            setTimeout(check_for_element, 100)
          }
        }
        check_for_element()
      })
    }

    const input_element = document.querySelector(
      'div[contenteditable=true]'
    ) as HTMLElement

    input_element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: instructions
      })
    )

    await new Promise((r) => requestAnimationFrame(r))

    const submit_button = document.querySelector(
      'button[data-testid="submit-button"]'
    ) as HTMLButtonElement
    submit_button.click()
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (params: { footer: Element }) => {
      // Check if buttons already exist by text content to avoid duplicates
      const existing_apply_response_button = Array.from(
        params.footer.querySelectorAll('button')
      ).find((btn) => btn.textContent == apply_response_button_text)

      if (existing_apply_response_button) return

      const chat_turn = params.footer.closest(
        '.max-w-threadContentWidth'
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
          const buttons = params.footer.querySelectorAll('button')
          const copy_button = Array.from(buttons).find((button) => {
            const path = button.querySelectorAll('path')
            return Array.from(path).some(
              (p) =>
                p.getAttribute('d') ==
                'M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1'
            )
          }) as HTMLElement
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
      }

      create_apply_response_button()
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          document.querySelector(
            'path[d="M17 4h-10a3 3 0 0 0 -3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3 -3v-10a3 3 0 0 0 -3 -3z"]'
          )
        ) {
          return
        }

        show_response_ready_notification({ chatbot_name: 'Perplexity' })

        const all_footers = document.querySelectorAll(
          '.max-w-threadContentWidth > .relative > div > div > div > div > div + div > div + div'
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
