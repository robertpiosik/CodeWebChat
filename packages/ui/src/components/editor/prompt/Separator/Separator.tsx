export namespace Separator {
  export type Props = {
    height: number
  }
}

export const Separator: React.FC<Separator.Props> = (props) => {
  return <div style={{ height: `${props.height}px` }} />
}
