import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'

export const qwen: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('button#model-selector-0-button')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_model: async (model: string) => {
    const model_selector_button = document.querySelector(
      'button#model-selector-0-button'
    ) as HTMLElement
    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const model_buttons = document.querySelectorAll(
      'div[aria-labelledby="model-selector-0-button"] button[aria-label="model-item"]'
    ) as NodeListOf<HTMLButtonElement>
    for (const button of Array.from(model_buttons)) {
      const model_name_element = button.querySelector(
        'div.text-sm'
      ) as HTMLDivElement
      if (
        model_name_element.textContent ==
        (CHATBOTS['Qwen'].models as any)[model]
      ) {
        button.click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_options: async (options: string[]) => {
    // Make sure thinking is not selected
    const buttons = document.querySelectorAll(
      '.chat-message-input button.chat-input-feature-btn'
    ) as NodeListOf<HTMLButtonElement>
    for (const button of Array.from(buttons)) {
      if (button.querySelector('i.icon-line-deepthink-01')) {
        // if button has class name active, click it
        if (button.classList.contains('active')) {
          button.click()
        }
      }
    }
    // Now check click any feature requested
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
      }
    }
  },
  enter_message_and_send: async (message: string) => {
    const file_input = document.querySelector(
      'input#filesUpload'
    ) as HTMLInputElement
    const blob = new Blob([message], { type: 'text/plain' })
    const file = new File([blob], 'message.txt', { type: 'text/plain' })
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    file_input.files = dataTransfer.files
    file_input.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (
          !document.querySelector(
            '.chat-message-input path[d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"]'
          )
        ) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    const submit_button = document.querySelector(
      'button#send-message-button'
    ) as HTMLButtonElement
    submit_button.click()
  }
}
