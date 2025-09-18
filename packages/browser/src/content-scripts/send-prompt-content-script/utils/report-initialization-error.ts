import { Logger } from '@shared/utils/logger'

export enum InitializationError {
  UNABLE_TO_SET_MODEL = 'Unable to set model',
  UNABLE_TO_SET_SYSTEM_INSTRUCTIONS = 'Unable to set system instructions',
  UNABLE_TO_SET_OPTIONS = 'Unable to set options',
  UNABLE_TO_SET_TEMPERATURE = 'Unable to set temperature',
  UNABLE_TO_SET_TOP_P = 'Unable to set top-p',
  UNABLE_TO_SET_THINKING_BUDGET = 'Unable to set thinking budget',
  UNABLE_TO_SEND_MESSAGE = 'Unable to send message',
  UNABLE_TO_COPY_RESPONSE = 'Unable to copy response',
  UNABLE_TO_OPEN_SETTINGS_PANEL = 'Unable to open settings panel',
  UNABLE_TO_CLOSE_SETTINGS_PANEL = 'Unable to close settings panel',
  UNABLE_TO_SET_PRIVATE_MODE = 'Unable to set private mode',
  UNABLE_TO_UPLOAD_FILE = 'Unable to upload file',
  UNABLE_TO_SEND_MESSAGE_WITH_FILE = 'Unable to send message with file'
}

export const report_initialization_error = (params: {
  function_name: string
  log_message: string
  alert_message: InitializationError
}) => {
  Logger.error({
    function_name: params.function_name,
    message: params.log_message
  })
  alert(`${params.alert_message}. Please open an issue.`)
}
