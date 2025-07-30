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

export const qwen: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        const model_selector_button = document.querySelector(
          'button#model-selector-0-button'
        ) as HTMLElement

        if (
          model_selector_button &&
          model_selector_button.textContent &&
          Object.values(CHATBOTS['Qwen'].models)
            .map((model) => model.label)
            .includes(model_selector_button.textContent.trim())
        ) {
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
      'button#model-selector-0-button'
    ) as HTMLElement

    if (
      model_selector_button.textContent?.trim() ==
      (CHATBOTS['Qwen'].models as any)[model]?.label
    ) {
      return
    }

    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const model_buttons = document.querySelectorAll(
      'div[aria-labelledby="model-selector-0-button"] button[aria-label="model-item"]'
    ) as NodeListOf<HTMLButtonElement>
    for (const button of Array.from(model_buttons)) {
      const model_name_element = (button.querySelector('div.text-sm') ||
        button.querySelector('div.text-15')) as HTMLDivElement
      if (
        model_name_element.textContent ==
        (CHATBOTS['Qwen'].models as any)[model]?.label
      ) {
        button.click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    const supported_options = CHATBOTS['Qwen'].supported_options
    for (const option of options) {
      if (option == 'thinking' && supported_options['thinking']) {
        const buttons = document.querySelectorAll(
          '.chat-message-input button.chat-input-feature-btn'
        ) as NodeListOf<HTMLButtonElement>
        for (const button of Array.from(buttons)) {
          if (button.querySelector('i.icon-line-deepthink-01')) {
            button.click()
          }
        }
      } else if (option == 'search' && supported_options['search']) {
        const search_button = document.querySelector(
          'button.websearch_button'
        ) as HTMLButtonElement
        search_button.click()
      } else if (option == 'temporary' && supported_options['temporary']) {
        const model_selector_button = document.querySelector(
          'button#model-selector-0-button'
        ) as HTMLElement
        model_selector_button.click()
        await new Promise((r) => requestAnimationFrame(r))
        const temporary_switch = document.querySelector(
          'div[aria-labelledby="model-selector-0-button"] button[role="switch"]'
        ) as HTMLButtonElement
        temporary_switch.click()
        await new Promise((r) => requestAnimationFrame(r))
        model_selector_button.click()
        await new Promise((r) => requestAnimationFrame(r))
      }
    }
  },
  enter_message_and_send: async (message: string) => {
    let instructions = message
    if (message.includes('<files>')) {
      instructions = message.split('<files>')[0].trim()
      const context = message.split('<files>')[1].split('</files>')[0].trim()

      // Upload file
      const file_input = document.querySelector(
        'input#filesUpload'
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
          if (document.querySelector('i.icontxt1')) {
            resolve(null)
          } else {
            setTimeout(check_for_element, 100)
          }
        }
        check_for_element()
      })
    }

    // Enter instructions
    const input_element = document.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    input_element.value = instructions
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))

    // Submit
    const submit_button = document.querySelector(
      'button#send-message-button'
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

      const chat_turn =
        params.footer.parentElement?.parentElement?.querySelector(
          '#response-content-container'
        ) as HTMLElement
      const code_blocks = chat_turn.querySelectorAll('.cm-content')
      let has_eligible_block = false
      for (const code_block of Array.from(code_blocks)) {
        const first_line_text =
          code_block?.querySelector('.cm-line')?.textContent
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
        apply_response_button.style.order = '7'
        apply_chat_response_button_style(apply_response_button)

        apply_response_button.addEventListener('click', async () => {
          set_button_disabled_state(apply_response_button)
          const copy_button = params.footer.querySelector(
            'button.copy-response-button'
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
          document.querySelector('i.icon-StopIcon') ||
          !document.querySelector('.message-footer-buttons')
        )
          return

        show_response_ready_notification({ chatbot_name: 'Qwen' })

        const all_footers = document.querySelectorAll('.message-footer-buttons')
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
