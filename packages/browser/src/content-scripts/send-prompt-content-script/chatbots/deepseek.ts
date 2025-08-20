import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import browser from 'webextension-polyfill'
import {
  apply_chat_response_button_style,
  set_button_disabled_state
} from '../utils/apply-response-styles'
import { Message } from '@/types/messages'
import { is_eligible_code_block } from '../utils/is-eligible-code-block'
import { show_response_ready_notification } from '../utils/show-response-ready-notification'
import {
  apply_response_button_text,
  apply_response_button_title
} from '../constants/copy'

export const deepseek: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('div.intercom-lightweight-app')) {
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
    // Uncheck deep think
    const deep_think_button = Array.from(
      document.querySelectorAll('div[role="button"]')
    ).find(
      (button) =>
        button.textContent == 'DeepThink' || button.textContent == '深度思考'
    ) as HTMLElement
    const deep_think_button_style = window.getComputedStyle(deep_think_button)
    if (
      deep_think_button_style.getPropertyValue('--ds-button-color') !=
        'transparent' &&
      deep_think_button_style.getPropertyValue('--ds-button-color') != '#fff'
    ) {
      deep_think_button.click()
    }

    // Uncheck search
    const search_button = Array.from(
      document.querySelectorAll('div[role="button"]')
    ).find(
      (button) =>
        button.textContent == 'Search' || button.textContent == '联网搜索'
    ) as HTMLElement
    const search_button_style = window.getComputedStyle(search_button)
    if (
      search_button_style.getPropertyValue('--ds-button-color') !=
        'transparent' &&
      search_button_style.getPropertyValue('--ds-button-color') != '#fff'
    ) {
      search_button.click()
    }

    await new Promise((r) => requestAnimationFrame(r))

    const supported_options = CHATBOTS['DeepSeek'].supported_options || {}
    for (const option of options) {
      if (option == 'deep-think' && supported_options['deep-think']) {
        const deep_think_button = Array.from(
          document.querySelectorAll('div[role="button"]')
        ).find(
          (button) =>
            button.textContent == 'DeepThink' ||
            button.textContent == '深度思考'
        ) as HTMLElement
        const button_style = window.getComputedStyle(deep_think_button)
        if (
          button_style.getPropertyValue('--ds-button-color') == 'transparent' ||
          button_style.getPropertyValue('--ds-button-color') == '#fff'
        ) {
          deep_think_button.click()
        }
      } else if (option == 'search' && supported_options['search']) {
        const search_button = Array.from(
          document.querySelectorAll('div[role="button"]')
        ).find(
          (button) =>
            button.textContent == 'Search' || button.textContent == '联网搜索'
        ) as HTMLElement
        const button_style = window.getComputedStyle(search_button)
        if (
          button_style.getPropertyValue('--ds-button-color') == 'transparent' ||
          button_style.getPropertyValue('--ds-button-color') == '#fff'
        ) {
          search_button.click()
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

      const chat_turn =
        params.footer.parentElement?.parentElement?.querySelector(
          '.ds-markdown'
        ) as HTMLElement
      const code_blocks = chat_turn.querySelectorAll('pre')
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
            '.ds-icon-button'
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
          document.querySelector(
            'input[type="file"] + div[aria-disabled="false"]'
          ) &&
          !(
            document.querySelector('textarea#chat-input') as HTMLTextAreaElement
          )?.value
        ) {
          return
        }

        show_response_ready_notification({
          chatbot_name: 'DeepSeek'
        })

        const all_footers = document.querySelectorAll(
          '.ds-flex[style="align-items: center; gap: 16px;"]'
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
