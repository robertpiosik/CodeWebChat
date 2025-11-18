import { Logger } from '@shared/utils/logger'

export const report_initialization_error = (params: {
  function_name: string
  log_message: string
}) => {
  Logger.error({
    function_name: params.function_name,
    message: params.log_message
  })
}
