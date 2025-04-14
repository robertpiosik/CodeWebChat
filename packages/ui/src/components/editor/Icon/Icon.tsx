import BuyMeACoffee from '../../../assets/icons/buy-me-a-coffee.svg'
import Github from '../../../assets/icons/github.svg'
import AIStudio from '../../../assets/icons/ai-studio.svg'

export namespace Icon {
  export type Variant = 'BUY_ME_A_COFFEE' | 'GITHUB' | 'AI_STUDIO'

  export type Props = {
    variant: Variant
  }
}

export const Icon: React.FC<Icon.Props> = ({ variant }) => {
  let icon: JSX.Element

  switch (variant) {
    case 'BUY_ME_A_COFFEE':
      icon = <BuyMeACoffee />
      break
    case 'GITHUB':
      icon = <Github />
      break
    case 'AI_STUDIO':
      icon = <AIStudio />
      break
  }

  return icon
}
