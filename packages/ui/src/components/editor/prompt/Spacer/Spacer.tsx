export namespace Spacer {
  export type Props = {
    height: number
  }
}

export const Spacer: React.FC<Spacer.Props> = (props) => {
  return <div style={{ height: `${props.height}px` }} />
}
