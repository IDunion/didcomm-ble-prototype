// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

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
    this.logger.debug('Chunk read: ' + data)
    this.callback(data)
    callback(Characteristic.RESULT_SUCCESS);
  }
}
