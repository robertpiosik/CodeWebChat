export class AgenticSearchState {
  private _in_progress: boolean = false

  get in_progress(): boolean {
    return this._in_progress
  }

  set in_progress(value: boolean) {
    this._in_progress = value
  }
}
