import { HomeLinkButton } from './HomeLinkButton'

export default {
  component: HomeLinkButton
}

export const BuyMeACoffee = () => (
  <HomeLinkButton
    url="https://buymeacoffee.com/robertpiosik"
    background_color="#ffdd00"
    fill_color="black"
    logo_icon="BUY_ME_A_COFFEE_LOGO"
    text_icon="BUY_ME_A_COFFEE_TEXT"
    label="Support"
    title="Support author"
  />
)

export const CodeWebChat = () => (
  <HomeLinkButton
    url="https://codeweb.chat"
    background_color="black"
    fill_color="white"
    logo_icon="CODE_WEB_CHAT_LOGO"
    text_icon="CODE_WEB_CHAT_TEXT"
    label="Website"
    title="Visit website"
  />
)
