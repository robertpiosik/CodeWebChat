type Props = {
  is_visible: boolean
}

export const ApiTab: React.FC<Props> = (props) => {
  return (
    <div style={{ display: !props.is_visible ? 'none' : undefined }}>
      <h1>API Tab</h1>
      <p>API functionality will be implemented here</p>
    </div>
  )
}
