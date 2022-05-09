import Bleno from '@abandonware/bleno'

export class didcommWriteCharacteristic extends Bleno.Characteristic {
  private callback!: (data?: Buffer) => void;
  
  constructor(uuid: string, callback: (data?: Buffer) => void) {
    super({
      uuid: uuid,
      properties: ['write'],
      value: null
    });
    this.callback = callback;
  }

  onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: any) {
    this.callback(data)
    callback(Bleno.Characteristic.RESULT_SUCCESS);
  }
}
