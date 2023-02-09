// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import Bleno from '@abandonware/bleno'
import { Characteristic } from '@abandonware/bleno'
import type { Logger } from '@aries-framework/core'

export class didcommReadCharacteristic extends Characteristic {
  private resolveFunc: any
  private logger!: Logger
  private _updateCB: ((data: Buffer) => void) | null
  private previousOffset: number = 0

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
    this.logger.debug('Set value: ' + this.value.toString())
    if(this._updateCB) {
      this.logger.debug('Notifying listener')
      this._updateCB(this.value)
    }
  }

  private resolve() {
    if (this.resolveFunc) {
      this.resolveFunc()
      this.resolveFunc = null
      return
    }
  }

  public onReadRequest(offset: number, callback: (result: number, data?: Buffer) => void) {
    let isResolved = false
    
    if (this.previousOffset > offset) {
      offset = this.previousOffset
    }
    
    this.logger.debug('Getting Read Request - offset: ' + offset)
    if(!this.value) {
      callback(Characteristic.RESULT_SUCCESS, Buffer.from(''));
      return
    }
    if(offset + Bleno.mtu >= this.value!.byteLength) {
      isResolved = true
      this.resolve()
    }
    
    if (isResolved) {
      this.previousOffset = 0
    } 
    else {
      this.previousOffset += Bleno.mtu -1
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
        this.previousOffset = 0
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