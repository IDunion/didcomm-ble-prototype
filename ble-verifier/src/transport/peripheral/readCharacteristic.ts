import Bleno from '@abandonware/bleno'

export class didcommReadCharacteristic extends Bleno.Characteristic {
  private resolveFunc: any

  constructor(uuid: string) {
    super({
      uuid: uuid,
      properties: ['read', 'notify'],
      value: Buffer.from('')
    });
  }

  private setMessage(value: string): void {
    this.value = Buffer.from(value);
  }

  private callback(offset: number) {
    if (this.resolveFunc) {
      this.resolveFunc()
    }
  }

  public onReadRequest(offset: number, callback: (result: number, data?: Buffer) => void) {
    this.callback(offset)
    callback(Bleno.Characteristic.RESULT_SUCCESS, this.value!);
  }

  public sendMessage(payload: string): Promise<void> {
    // TODO: Figure out how to wait for a read event
    this.setMessage(payload)
    let timeoutId: NodeJS.Timeout
    const readTimeout = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject('BLE Outbound Timeout')
      }, 10000, 'BLE Device discovery timeout');
    });
    const readPromise = new Promise<void>((resolve, _) => {
      this.resolveFunc = resolve
    });
    return Promise.race([readTimeout, readPromise]);
  }
}
