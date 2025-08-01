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
    if (!model_selector_button) return

    const model_name_to_find = (CHATBOTS['Claude'].models as any)[model]?.label
    if (!model_name_to_find) return

    if (model_selector_button.textContent?.includes(model_name_to_find)) {
      return
    }

    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))

    const menu_items = document.querySelectorAll('div[role="menuitem"]')

    for (const item of Array.from(menu_items)) {
      if (item.textContent?.includes(model_name_to_find)) {
        ;(item as HTMLElement).click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  enter_message_and_send: async (message: string) => {
    const input_element = document.querySelector(
      'div[contenteditable=true]'
    ) as HTMLElement

    if (input_element) {
      input_element.innerText = message
      input_element.dispatchEvent(new Event('input', { bubbles: true }))
      input_element.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 500))
      const submit_button = Array.from(
        document.querySelectorAll('fieldset button')
      ).find((button) =>
        button.querySelector(
          'path[d="M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z"]'
        )
      ) as HTMLButtonElement
      if (submit_button) {
        submit_button.click()
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
        'div[data-is-streaming="false"]'
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
            'button:nth-child(2)'
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
          // Stop button
          document.querySelector(
            'path[d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm40-112v56a12,12,0,0,1-12,12H100a12,12,0,0,1-12-12V100a12,12,0,0,1,12-12h56A12,12,0,0,1,168,100Z"]'
          ) ||
          // Share button
          !document.querySelector(
            'path[d="M12.1279 2.66477C12.3126 2.45986 12.6298 2.44322 12.835 2.62766L17.835 7.12773L17.9053 7.20585C17.9666 7.29039 17.9999 7.39362 18 7.4998C18 7.64143 17.9402 7.77707 17.835 7.87188L12.835 12.3719L12.7529 12.4315C12.5524 12.5493 12.2896 12.5144 12.1279 12.3348C11.9664 12.1552 11.9594 11.89 12.0977 11.703L12.165 11.6278L16.1963 7.99981H11.5C7.91029 7.99981 5.00023 10.9102 5 14.4999V16.4999L4.99023 16.6005C4.94371 16.8285 4.74171 16.9999 4.5 16.9999C4.25829 16.9999 4.05629 16.8285 4.00977 16.6005L4 16.4999V14.4999C4.00023 10.3579 7.35801 6.99979 11.5 6.99979H16.1963L12.165 3.37181C11.96 3.18704 11.9433 2.86994 12.1279 2.66477Z"]'
          )
        ) {
          return
        }

        show_response_ready_notification({ chatbot_name: 'Claude' })

        const all_footers = document.querySelectorAll(
          'div[data-is-streaming="false"] > div:nth-child(2) > div > div'
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
