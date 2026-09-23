export class AgenticSearchState {
  private _in_progress: boolean = false

  public get in_progress(): boolean {
    return this._in_progress
  }

  public set in_progress(value: boolean) {
    this._in_progress = value
  }
}
