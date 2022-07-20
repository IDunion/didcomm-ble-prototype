import Bleno from '@abandonware/bleno'
import { Characteristic } from '@abandonware/bleno'
import type { Logger } from '@aries-framework/core'

export class didcommReadCharacteristic extends Characteristic {
  private resolveFunc: any
  private logger!: Logger
  private _updateCB: ((data: Buffer) => void) | null

  constructor(uuid: string, logger: Logger) {
    super({
      uuid: uuid,
      properties: ['notify', 'read'],
      value: null,

    });
    this.logger = logger;
    this._updateCB = null
  }

  private setMessage(value: string): void {
    this.value = Buffer.from(value);
    if(this._updateCB) {
      this._updateCB(this.value)
    }
    this.logger.debug('Set value: ' + this.value.toString())
  }

  private callback() {
    if (this.resolveFunc) {
      this.resolveFunc()
      this.resolveFunc = null
    }
  }

  public onReadRequest(offset: number, callback: (result: number, data?: Buffer) => void) {
    this.logger.debug('Getting Read Request - offset: ' + offset)
    if(offset + Bleno.mtu >= this.value!.byteLength) {
      this.callback()
    }
    callback(Characteristic.RESULT_SUCCESS, this.value!.slice(offset, Math.min(offset + Bleno.mtu, this.value!.byteLength)));
  }

  public sendMessage(payload: string): Promise<void> {
    this.logger.debug('Setting Message for readCharacteristic: ' + payload)
    this.setMessage(payload)
    let timeoutId: NodeJS.Timeout
    const readTimeout = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        this.resolveFunc = null
        this.setMessage('')
        reject('BLE Outbound Timeout')
      }, 10000, 'BLE Device discovery timeout');
    });
    const readPromise = new Promise<void>((resolve, _) => {
      this.resolveFunc = resolve
    });
    return Promise.race([readTimeout, readPromise]);
  }

  onSubscribe(maxValueSize: number, updateCB: (data: Buffer) => void) {
    this.logger.debug('ReadCharacteristic - onSubscribe');
    this._updateCB = updateCB;
  };
  
  onUnsubscribe() {
    this.logger.debug('ReadCharacteristic - onUnsubscribe');
    this._updateCB = null;
    this.value = null;
  };
}
