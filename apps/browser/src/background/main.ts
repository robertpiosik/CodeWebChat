import { connect_websocket } from './websocket'
import { setup_keep_alive } from './keep-alive'
import { setup_message_listeners } from './message-handler'
import { clear_chat_init_data } from './clear-chat-init-data'

async function init() {
  await clear_chat_init_data()
  connect_websocket()
  setup_keep_alive()
  setup_message_listeners()
}

init().catch((error) => {
  console.error('Error during initialization:', error)
})
