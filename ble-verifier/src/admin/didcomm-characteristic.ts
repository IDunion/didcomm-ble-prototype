import bleno from '@abandonware/bleno'

export class didcommCharacteristic extends bleno.Characteristic {
  _value: any;
  _updateValueCallback: any;

  constructor(blecharacteristic: string) {
    super({
      uuid: blecharacteristic,
      properties: ['read', 'write', 'notify'],
      value: null
    });
    this._value = new ArrayBuffer(0);
    this._value = [74, 65, 73, 74]
    this._updateValueCallback = null;
  }

  onReadRequest(offset: number, callback: any) {
    callback(bleno.Characteristic.RESULT_SUCCESS, this._value);
  }

  onWriteRequest(data: any, offset: number, withoutResponse: boolean, callback: any) {
    this._value = data;
    console.log(data.toString('hex'));
    console.log(data);
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