declare function acquireVsCodeApi(): {
  postMessage(message: any)
  setState(state: any)
  getState(): any
}
