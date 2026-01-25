declare function acquireVsCodeApi(): {
  postMessage(message: any): void
  setState(state: any): void
  getState(): any
}
