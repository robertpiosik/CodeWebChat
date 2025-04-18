import { debounce } from '@/utils/debounce'
import { extract_filename_from_comment } from '@shared/utils/extract-filename-from-comment'
import browser from 'webextension-polyfill'

// Function to check if any code block contains truncated fragments
const has_truncated_fragments = (container: Element): boolean => {
  const code_blocks = container.querySelectorAll('ms-code-block')
  for (const block of Array.from(code_blocks)) {
    const code_content = block.querySelector('code')?.textContent
    if (code_content && /^\s*\/\/\s+\.\.\.\s*$/m.test(code_content)) {
      return true
    }
  }
  return false
}

// Function to check if any code block contains diff markers
const has_diff_markers = (container: Element): boolean => {
  const code_blocks = container.querySelectorAll('ms-code-block')
  for (const block of Array.from(code_blocks)) {
    const code_content = block.querySelector('code')?.textContent
    if (code_content && /^[+-]/.test(code_content)) {
      return true
    }
  }
  return false
}

// Apply common button styles
const apply_button_style = (button: HTMLButtonElement) => {
  button.style.fontSize = '13px'
  button.style.marginLeft = '8px'
  button.style.padding = '4px 9px'
  button.style.borderRadius = '4px'
  button.style.color = 'white'
  button.style.background =
    'linear-gradient(to bottom right, #9168C0 12%, #319749 40%, #42de67 90%)'
  button.style.border = 'none'
  button.style.cursor = 'pointer'
}

// Handle button click
const handle_button_click = (
  button: HTMLButtonElement,
  client_id: number,
  action: 'fast-replace' | 'intelligent-update'
) => {
  // Find the parent chat-turn-container
  const chat_turn_container = button.closest('.chat-turn-container')
  if (!chat_turn_container) return

  button.disabled = true

  // Find the ms-chat-turn-options element within the container
  const options = chat_turn_container.querySelector(
    'ms-chat-turn-options > div > button'
  )
  if (options) {
    // Simulate a click on the ms-chat-turn-options element
    ;(options as any).click()
    const markdown_copy_button = Array.from(
      document.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('markdown_copy'))

    if (markdown_copy_button) {
      ;(markdown_copy_button as any).click()
      browser.runtime.sendMessage({
        action: `invoke-${action}`,
        client_id
      })
    }
  }
}

// Function to observe DOM for new message footers
export const inject_apply_changes_buttons = (params: {
  client_id: number
  is_ai_studio: boolean
}) => {
  if (params.is_ai_studio) {
    const debounced_add_buttons = debounce(
      (params: { footer: Element; client_id: number }) => {
        const fast_replace_button_text = 'Apply Changes with Fast Replace'
        const intelligent_update_button_text =
          'Apply Changes with Intelligent Update'

        // Check if buttons already exist by text content to avoid duplicates
        const existing_fast_replace_button = Array.from(
          params.footer.querySelectorAll('button')
        ).find((btn) => btn.textContent == fast_replace_button_text)
        const existing_intelligent_update_button = Array.from(
          params.footer.querySelectorAll('button')
        ).find((btn) => btn.textContent == intelligent_update_button_text)

        if (
          existing_fast_replace_button ||
          existing_intelligent_update_button
        ) {
          return
        }

        // Find the parent chat-turn-container
        const chat_turn = params.footer.closest('ms-chat-turn') as HTMLElement

        if (!chat_turn) {
          console.error(
            'Chat turn container not found for footer:',
            params.footer
          )
          return
        }

        // TODO Remove checking for name attribute a few weeks from 18 Apr 2025
        let has_eligible_block = false

        const language_span = chat_turn.querySelector(
          'ms-code-block footer > span.language'
        ) as HTMLSpanElement

        if (language_span.textContent?.includes('name=')) {
          has_eligible_block = true
        }

        if (!has_eligible_block) {
          const code_block = chat_turn.querySelector(
            'ms-code-block code > span.hljs-comment:first-child'
          ) as HTMLElement
          if (
            code_block.textContent &&
            extract_filename_from_comment(code_block.textContent)
          ) {
            has_eligible_block = true
          }
        }

        // Only proceed if we found at least one code block with a name attribute or filename comment
        if (!has_eligible_block) return

        const has_truncated = has_truncated_fragments(chat_turn)
        const has_diff = has_diff_markers(chat_turn)

        const create_fast_replace_button = () => {
          const fast_replace_button = document.createElement('button')
          fast_replace_button.textContent = fast_replace_button_text
          fast_replace_button.title =
            'Overrides original files. Action can be reverted.'
          apply_button_style(fast_replace_button)

          // Add event listener for Fast replace button click
          fast_replace_button.addEventListener('click', () => {
            handle_button_click(
              fast_replace_button,
              params.client_id,
              'fast-replace'
            )
          })

          params.footer.insertBefore(
            fast_replace_button,
            params.footer.children[2]
          )
        }
        const create_intelligent_update_button = () => {
          const intelligent_update_button = document.createElement('button')
          intelligent_update_button.textContent = intelligent_update_button_text
          intelligent_update_button.title =
            'Uses AI to merge partial changes into existing files. Enabled because detected truncated fragments with ellipsis comments.'
          apply_button_style(intelligent_update_button)
          intelligent_update_button.style.background =
            'linear-gradient(to bottom right, #9168C0 12%, #319749 40%, #42de67 90%)'

          // Add event listener for Intelligent update button click
          intelligent_update_button.addEventListener('click', () => {
            handle_button_click(
              intelligent_update_button,
              params.client_id,
              'intelligent-update'
            )
          })

          params.footer.insertBefore(
            intelligent_update_button,
            params.footer.children[2]
          )
        }

        if (has_truncated || has_diff) {
          create_intelligent_update_button()
        } else {
          create_fast_replace_button()
        }
      },
      100
    )

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        const all_footers = document.querySelectorAll(
          'ms-chat-turn .turn-footer'
        )
        all_footers.forEach((footer) => {
          // Check if the footer is for an AI response (contains thumb_up icon)
          if (
            footer.querySelector('mat-icon')?.textContent?.trim() == 'thumb_up'
          ) {
            debounced_add_buttons({
              footer,
              client_id: params.client_id
            })
          }
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
