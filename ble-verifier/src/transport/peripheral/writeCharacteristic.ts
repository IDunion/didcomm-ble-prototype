import Bleno from '@abandonware/bleno'

export class didcommWriteCharacteristic extends Bleno.Characteristic {
  cBleWrite: any;

  constructor(uuid: string, cBleWrite: any) {
    super({
      uuid: uuid,
      properties: ['write'],
      value: null
    });
    this.cBleWrite = cBleWrite;
  }

  onWriteRequest(data: any, offset: number, withoutResponse: boolean, callback: any) {
    this.cBleWrite(data)
    callback(Bleno.Characteristic.RESULT_SUCCESS);
  }
}
