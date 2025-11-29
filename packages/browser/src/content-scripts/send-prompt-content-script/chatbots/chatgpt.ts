import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const chatgpt: Chatbot = {
  wait_until_ready: async () => {
    const url = new URL(window.location.href)
    if (url.pathname == '/') {
      await new Promise((resolve) => {
        const check_for_element = () => {
          if (
            document.querySelector(
              'span[data-testid="blocking-initial-modals-done"]'
            )
          ) {
            resolve(null)
          } else {
            setTimeout(check_for_element, 100)
          }
        }
        check_for_element()
      })
    } else {
      // User used custom path url for a "project"
      await new Promise((resolve) => {
        const check_for_element = () => {
          if (document.querySelector('textarea')) {
            resolve(null)
          } else {
            setTimeout(check_for_element, 100)
          }
        }
        check_for_element()
      })
    }
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    const supported_options = CHATBOTS['ChatGPT'].supported_options
    for (const option of options) {
      if (option == 'temporary' && supported_options['temporary']) {
        const buttons = document.querySelectorAll('button')
        let found = false
        for (const item of Array.from(buttons)) {
          const path_element = item.querySelector(
            'path[d="M15.5713 4.33536C14.5314 3.41405 13.2387 2.74892 11.8057 2.44181C11.4468 2.3651 11.0937 2.59374 11.0166 2.95255C10.9396 3.31166 11.1682 3.66563 11.5273 3.74259C12.7361 4.00163 13.8209 4.56095 14.6895 5.33048L14.8604 5.4877L14.9668 5.56973C15.2291 5.73327 15.5785 5.69604 15.7998 5.46329C16.0211 5.23026 16.0403 4.87903 15.8633 4.6254L15.7754 4.52286L15.5713 4.33536Z"]'
          )
          if (path_element) {
            ;(item as HTMLElement).click()
            found = true
            break
          }
        }
        if (found) {
          await new Promise((resolve) => {
            const check_for_param = () => {
              if (window.location.search.includes('temporary-chat=true')) {
                setTimeout(() => resolve(null), 250)
              } else {
                setTimeout(check_for_param, 100)
              }
            }
            check_for_param()
          })
        } else {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Temporary chat button not found'
            // Don't show alert because temporary mode doesn't work in projects (url override)
          })
        }
      } else if (option == 'thinking' && supported_options['thinking']) {
        const plus_button = document.querySelector(
          'button[data-testid="composer-plus-btn"]'
        ) as HTMLButtonElement
        if (plus_button) {
          plus_button.dispatchEvent(
            new PointerEvent('pointerdown', { bubbles: true })
          )
          await new Promise((resolve) => setTimeout(resolve, 500))
          const menu_items = document.querySelectorAll(
            'div[role="menuitemradio"]'
          )
          const target_path_d =
            'M14.3352 10.0257C14.3352 7.6143 12.391 5.66554 10.0002 5.66537C7.60929 5.66537 5.66528 7.61419 5.66528 10.0257C5.66531 11.5493 6.44221 12.8881 7.61938 13.6683H12.3811C13.558 12.8881 14.3352 11.5491 14.3352 10.0257ZM8.84399 16.9984C9.07459 17.3983 9.50543 17.6683 10.0002 17.6683C10.495 17.6682 10.926 17.3984 11.1565 16.9984H8.84399ZM8.08813 15.6683H11.9114V14.9984H8.08813V15.6683ZM1.66626 9.33529L1.80103 9.34896C2.10381 9.41116 2.3313 9.67914 2.3313 10.0003C2.33115 10.3214 2.10377 10.5896 1.80103 10.6517L1.66626 10.6654H0.833252C0.466091 10.6654 0.168389 10.3674 0.168213 10.0003C0.168213 9.63306 0.465983 9.33529 0.833252 9.33529H1.66626ZM19.1663 9.33529L19.301 9.34896C19.6038 9.41116 19.8313 9.67914 19.8313 10.0003C19.8311 10.3214 19.6038 10.5896 19.301 10.6517L19.1663 10.6654H18.3333C17.9661 10.6654 17.6684 10.3674 17.6682 10.0003C17.6682 9.63306 17.966 9.33529 18.3333 9.33529H19.1663ZM3.0481 3.04818C3.2753 2.82099 3.62593 2.79189 3.88403 2.96224L3.98853 3.04818L4.57739 3.63705L4.66235 3.74154C4.83285 3.99966 4.80464 4.35021 4.57739 4.57748C4.35013 4.80474 3.99958 4.83293 3.74146 4.66244L3.63696 4.57748L3.0481 3.98861L2.96216 3.88412C2.79181 3.62601 2.82089 3.27538 3.0481 3.04818ZM16.012 3.04818C16.2717 2.7886 16.6927 2.78852 16.9524 3.04818C17.2117 3.30786 17.2119 3.72901 16.9524 3.98861L16.3625 4.57748C16.1028 4.83717 15.6818 4.83718 15.4221 4.57748C15.1626 4.31776 15.1625 3.89669 15.4221 3.63705L16.012 3.04818ZM9.33521 1.66634V0.833336C9.33521 0.466067 9.63297 0.168297 10.0002 0.168297C10.3674 0.168472 10.6653 0.466175 10.6653 0.833336V1.66634C10.6653 2.0335 10.3674 2.33121 10.0002 2.33138C9.63297 2.33138 9.33521 2.03361 9.33521 1.66634ZM15.6653 10.0257C15.6653 11.9571 14.7058 13.6634 13.2415 14.6917V16.3333C13.2415 16.7004 12.9444 16.9971 12.5774 16.9974C12.282 18.1473 11.2423 18.9982 10.0002 18.9984C8.75792 18.9984 7.71646 18.1476 7.42114 16.9974C7.05476 16.9964 6.75806 16.7 6.75806 16.3333V14.6917C5.29383 13.6634 4.33523 11.957 4.33521 10.0257C4.33521 6.88608 6.86835 4.33529 10.0002 4.33529C13.132 4.33547 15.6653 6.88618 15.6653 10.0257Z'

          let found = false
          for (const item of Array.from(menu_items)) {
            const path_element = item.querySelector(
              `path[d="${target_path_d}"]`
            )
            if (path_element) {
              ;(item as HTMLElement).click()
              await new Promise((resolve) => setTimeout(resolve, 250))
              found = true
              break
            }
          }
          if (!found) {
            report_initialization_error({
              function_name: 'set_options',
              log_message: 'Think longer button not found'
            })
          }
        } else {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Plus button for "Think longer" not found'
          })
        }
      }
    }
  },
  inject_apply_response_button: (
    client_id: number,
    raw_instructions?: string,
    edit_format?: string
  ) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        raw_instructions,
        edit_format,
        footer,
        get_chat_turn: (f) => f.closest('.agent-turn'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button[data-testid="copy-turn-action-button"]'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'chatgpt.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) =>
          f.insertBefore(b, f.children[f.children.length])
      })
    }

    observe_for_responses({
      chatbot_name: 'ChatGPT',
      is_generating: () =>
        !!document.querySelector('button[data-testid="stop-button"]'),
      footer_selector: '.agent-turn > div:nth-of-type(2) > div',
      add_buttons
    })
  }
}
