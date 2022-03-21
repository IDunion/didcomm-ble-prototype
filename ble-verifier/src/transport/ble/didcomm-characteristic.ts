import bleno from '@abandonware/bleno'


export class didcommCharacteristic extends bleno.Characteristic {
  _value: any;
  _updateValueCallback: any;
  cBleWrite: any;

  constructor(blecharacteristic: string, cBleWrite: any) {
    super({
      uuid: blecharacteristic,
      properties: ['read', 'write', 'notify'],
      value: null
    });
    this.cBleWrite = cBleWrite;
    this._value = Buffer.from("Test");
    this._updateValueCallback = null;

  }

  onReadRequest(offset: number, callback: any) {
    callback(bleno.Characteristic.RESULT_SUCCESS, this._value);
  }

  callbackBleServer(message: Buffer) {
    this.cBleWrite(message)
  }

  onWriteRequest(data: any, offset: number, withoutResponse: boolean, callback: any) {
    this._value = data;
    // console.log(data.toString('hex'));
    // console.log(data);
    this.callbackBleServer(data)
    if (this._updateValueCallback) {
      this._updateValueCallback(this._value);
    }

    callback(bleno.Characteristic.RESULT_SUCCESS);
  }

  onSubscribe(maxValueSize: number, updateValueCallback: any) {
    this._updateValueCallback = updateValueCallback;
  }

  onUnsubscribefunction() {
    this._updateValueCallback = null;
  }
}