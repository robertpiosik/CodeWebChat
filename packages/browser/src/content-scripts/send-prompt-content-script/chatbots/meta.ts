import { Chatbot } from '../types/chatbot'
import {
  InitializationError,
  report_initialization_error
} from '../utils/report-initialization-error'
// import browser from 'webextension-polyfill'
// import {
//   apply_chat_response_button_style,
//   set_button_disabled_state
// } from '../utils/apply-response-styles'
// import { Message } from '@/types/messages'
// import {
//   apply_response_button_text,
//   apply_response_button_title
// } from '../constants/copy'
// import { show_response_ready_notification } from '../utils/show-response-ready-notification'

export const meta: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('i[data-visualcompletion="css-img"]')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  enter_message_and_send: async (params) => {
    const input_element = document.querySelector(
      'div[contenteditable=true]'
    ) as HTMLElement

    if (!input_element) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Message input element not found',
        alert_message: InitializationError.UNABLE_TO_SEND_MESSAGE
      })
      return
    }

    input_element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: params.message
      })
    )

    if (params.without_submission) return

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = 5000 // 5 seconds
        const start_time = Date.now()
        const check_button_state = () => {
          if (Date.now() - start_time > timeout) {
            return reject(
              new Error(
                'Send button not found or did not become enabled in time.'
              )
            )
          }
          const path_element = document.querySelector(
            'path[d="M13 7.414V19a1 1 0 1 1-2 0V7.414l-3.293 3.293a1 1 0 0 1-1.414-1.414l5-5a1 1 0 0 1 1.414 0l5 5a1 1 0 0 1-1.414 1.414L13 7.414z"]'
          )
          const send_button = path_element?.closest(
            'div[role="button"]'
          ) as HTMLElement

          if (
            send_button &&
            send_button.getAttribute('aria-disabled') != 'true'
          ) {
            send_button.click()
            resolve()
          } else {
            setTimeout(check_button_state, 100)
          }
        }
        check_button_state()
      })
    } catch (error) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Failed to send message',
        alert_message: InitializationError.UNABLE_TO_SEND_MESSAGE
      })
    }
  }
  // Disabled for now because code blocks in copied text are not enclosed in markdown blocks (```)
  // inject_apply_response_button: (client_id: number) => {
  //   const add_buttons = (params: { footer: Element }) => {
  //     // Check if buttons already exist by text content to avoid duplicates
  //     const existing_apply_response_button = Array.from(
  //       params.footer.querySelectorAll('button')
  //     ).find((btn) => btn.textContent == apply_response_button_text)

  //     if (existing_apply_response_button) return

  //     const chat_turn = params.footer.parentElement as HTMLElement
  //     if (!chat_turn) return

  //     const create_apply_response_button = () => {
  //       const apply_response_button = document.createElement('button')
  //       apply_response_button.textContent = apply_response_button_text
  //       apply_response_button.title = apply_response_button_title
  //       apply_chat_response_button_style(apply_response_button)

  //       apply_response_button.addEventListener('click', async () => {
  //         set_button_disabled_state(apply_response_button)
  //         const copy_button = params.footer.querySelector(
  //           'div[role="button"]'
  //         ) as HTMLDivElement
  //         if (copy_button) {
  //           copy_button.click()
  //         }
  //         await new Promise((resolve) => setTimeout(resolve, 500))
  //         browser.runtime.sendMessage<Message>({
  //           action: 'apply-chat-response',
  //           client_id
  //         })
  //       })

  //       params.footer.insertBefore(
  //         apply_response_button,
  //         params.footer.children[params.footer.children.length]
  //       )
  //     }

  //     create_apply_response_button()
  //   }

  //   const observer = new MutationObserver(() => {
  //     const thumb_up_paths = document.querySelectorAll(
  //       'div[role="button"] path[d="m10.894 6.447 1.715-3.429c.56.107.939.669.794 1.247L13.04 5.72l-.988 2.964A1 1 0 0 0 13 10h6.53a.7.7 0 0 1 .436 1.246l-.526.421a1.09 1.09 0 0 0-.226 1.457.818 0 0 1-.19 1.108l-.624.468a1 1 0 0 0-.294 1.247l.105.211a1 1 0 0 1-.447 1.342l-.211.106a1 1 0 0 0-.502 1.21l.092.276a.69 0 0 1-.655.908h-4.204a4.515 0 0 1-3.192-1.323A5.727 0 0 0 5.042 17H4a1 1 0 1 0 0 2h1.042c.988 0 1.936.393 2.636 1.092A6.515 0 0 0 12.284 22h4.204a2.69 0 0 0 2.67-3.025 3.004 0 0 0 1.06-3.138l.006-.005a2.819 0 0 0 1.015-3.043A2.7 0 0 0 19.53 8h-5.142l.562-1.684a.993 0 0 0 .021-.073l.373-1.493A3.018 0 0 0 12.416 1c-.634 0-1.213.358-1.496.925L9.127 5.51l-1.3 2.08A3 0 0 1 5.283 9H4a1 1 0 0 0 0 2h1.283a5 0 0 0 4.24-2.35l1.325-2.12a.977 0 0 0 .046-.083z"]'
  //     )
  //     const thumb_up_buttons: Element[] = []
  //     thumb_up_paths.forEach((path) =>
  //       thumb_up_buttons.push(path.closest('div[role="button"]') as HTMLElement)
  //     )
  //     const all_footers: Element[] = []
  //     thumb_up_buttons.forEach((button) =>
  //       all_footers.push(button.closest('div:not([role="button"])') as Element)
  //     )

  //     if (
  //       !all_footers.length ||
  //       !document.querySelector(
  //         'div[aria-disabled="true"] path[d="M3 6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6z"]'
  //       )
  //     ) {
  //       return
  //     }

  //     show_response_ready_notification({ chatbot_name: 'Meta' })

  //     all_footers.forEach((footer) => add_buttons({ footer }))
  //   })

  //   observer.observe(document.body, { childList: true, subtree: true })
  // }
}
