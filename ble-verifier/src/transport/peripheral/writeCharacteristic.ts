import { Characteristic } from '@abandonware/bleno'
import type { Logger } from '@aries-framework/core'

export class didcommWriteCharacteristic extends Characteristic {
  private callback!: (data?: Buffer) => void;
  private logger!: Logger
  
  constructor(uuid: string, callback: (data?: Buffer) => void, logger: Logger) {
    super({
      uuid: uuid,
      properties: ['notify', 'write', 'writeWithoutResponse'],
      value: null,
    });
    this.callback = callback;
    this.logger = logger;
  }

  onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: any) {
    this.logger.debug('Received Write Request for BLE peripheral')
    this.callback(data)
    callback(Characteristic.RESULT_SUCCESS);
  }
}
