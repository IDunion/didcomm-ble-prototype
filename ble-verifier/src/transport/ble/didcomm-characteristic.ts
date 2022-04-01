import bleno from '@abandonware/bleno'

export class didcommCharacteristic extends bleno.Characteristic {
  _value: any;
  cBleWrite: any;

  constructor(blecharacteristic: string, cBleWrite: any) {
    super({
      uuid: blecharacteristic,
      properties: ['read', 'write', 'notify'],
      value: null
    });
    this.cBleWrite = cBleWrite;
    this._value = Buffer.from("Silence is Golden!");
  }

  onReadRequest(offset: number, callback: any) {
    console.log("Reading")
    callback(bleno.Characteristic.RESULT_SUCCESS, this._value);
  }

  onWriteRequest(data: any, offset: number, withoutResponse: boolean, callback: any) {
    this._value = data;
    // console.log(data.toString('hex'));
    // console.log(data);
    this.cBleWrite(data)
    callback(bleno.Characteristic.RESULT_SUCCESS);
  }
}