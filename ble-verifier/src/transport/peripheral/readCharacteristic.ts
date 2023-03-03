// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import Bleno from '@abandonware/bleno'
import { Characteristic } from '@abandonware/bleno'
import type { Logger } from '@aries-framework/core'

interface Message {
  payload: string,
  timeout: NodeJS.Timeout,
  resolveFunc: any,
}

export class didcommReadCharacteristic extends Characteristic {
  private resolveFunc: any
  private logger!: Logger
  private _updateCB: ((data: Buffer) => void) | null
  private timeoutID: NodeJS.Timeout | undefined
  private previousOffset: number = 0
  private messages: Message[];

  constructor(uuid: string, logger: Logger) {
    super({
      uuid: uuid,
      properties: ['notify', 'read'],
      value: null,
    });
    this.logger = logger;
    this._updateCB = null;
    this.timeoutID = undefined;
    this.messages = [];
    this.resolveFunc = null;
  }

  private setMessage(value: string): void {
    this.value = Buffer.from(value);
    this.logger.debug('Set characteristic value: ' + this.value.toString())
    if (this._updateCB) {
      this.logger.debug('Notifying listener');
      this._updateCB(this.value);
    }
  }

  private resolve() {
    this.logger.debug('Succesfully finished read request')
    this.logger.debug(this.resolveFunc, this.timeoutID);
    if (this.resolveFunc != null) {
      this.resolveFunc();
      this.resolveFunc = null;
    }
    if (this.timeoutID != undefined) {
      clearTimeout(this.timeoutID);
      this.timeoutID = undefined;
    }
    this._sendMessage()
  }

  public onReadRequest(offset: number, callback: (result: number, data?: Buffer) => void) {
    if (this.previousOffset > offset) {
      offset = this.previousOffset
    }

    this.logger.debug('Getting Read Request - offset: ' + offset)
    if (!this.value) {
      callback(Characteristic.RESULT_INVALID_OFFSET, Buffer.from(''));
      return
    }
    if (offset + Bleno.mtu >= this.value!.byteLength) {
      this.resolve()
      this.previousOffset = 0
    }
    else {
      this.previousOffset += Bleno.mtu - 1
    }

    callback(Characteristic.RESULT_SUCCESS, this.value!.slice(offset, Math.min(offset + Bleno.mtu, this.value!.byteLength)));
  }

  public sendMessage(payload: string): Promise<void> {
    this.logger.debug('Setting Message for readCharacteristic: ' + payload)
    let resolveF: any
    let timeoutID: NodeJS.Timeout

    var res: any, rej: any;
    var promise = new Promise<void>((resolve, reject) => {
      res = resolve;
      rej = reject;
    });

    timeoutID = setTimeout(() => {
      this.resolveFunc = null
      this.previousOffset = 0
      rej('BLE Outbound Timeout')
      this._sendMessage()
    }, 20000, 'BLE Device send timeout');

    let message = {
      payload: payload,
      timeout: timeoutID,
      resolveFunc: res,
    };

    this.messages.push(message)
    this._sendMessage()
    return promise;
  }

  // checks stack for message to be sent
  public _sendMessage(): void {
    if (this.resolveFunc == null) {
      let message = this.messages.shift();
      if (message) {
        this.resolveFunc = message.resolveFunc
        this.timeoutID = message.timeout
        this.setMessage(message.payload)
      }
    } else {
      this.logger.debug("Already sending message, queuing")
    }
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