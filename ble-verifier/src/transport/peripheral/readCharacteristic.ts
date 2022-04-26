import Bleno from '@abandonware/bleno'

export class didcommReadCharacteristic extends Bleno.Characteristic {
  cBleRead: any;

  constructor(uuid: string, cBleRead: any) {
    super({
      uuid: uuid,
      properties: ['read', 'notify'],
      value: Buffer.from('')
    });
    this.cBleRead = cBleRead;
  }

  setMessage(value: string): void {
    this.value = Buffer.from(value);
  }

  onReadRequest(offset: number, callback: any) {
    this.cBleRead(offset)
    callback(Bleno.Characteristic.RESULT_SUCCESS, this.value);
  }
}