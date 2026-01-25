import { Message } from '@/types/messages'

export const is_message = (obj: any): obj is Message => {
  return obj && typeof obj.action == 'string'
}
