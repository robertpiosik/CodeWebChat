import BuyMeACoffee from '../../../assets/icons/buy-me-a-coffee.svg'
import Github from '../../../assets/icons/github.svg'

export namespace Icon {
  export type Variant = 'BUY_ME_A_COFFEE' | 'GITHUB'

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
  }

  return icon
}
