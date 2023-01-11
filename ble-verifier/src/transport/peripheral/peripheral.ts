// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import Bleno from '@abandonware/bleno'
import type { Logger, OutboundPackage } from '@aries-framework/core'
import { didcommReadCharacteristic } from './readCharacteristic'
import { didcommWriteCharacteristic } from './writeCharacteristic'

export class TransportPeripheral {
  private isAdvertising: boolean;

  private readCharacteristicUUID: string
  private writeCharacteristicUUID: string
  private serviceUUID: string

  private readCharacteristic: didcommReadCharacteristic
  private writeCharacteristic: didcommWriteCharacteristic

  private logger!: Logger


  constructor(serviceUUID: string, readCharacteristic: string, writeCharacteristic: string, logger: Logger, inboundCB: (data?: Buffer) => void) {
    this.isAdvertising = false;
    this.readCharacteristicUUID = readCharacteristic
    this.writeCharacteristicUUID = writeCharacteristic
    this.serviceUUID = serviceUUID

    this.logger = logger

    this.readCharacteristic = new didcommReadCharacteristic(this.readCharacteristicUUID, logger);
    this.writeCharacteristic = new didcommWriteCharacteristic(this.writeCharacteristicUUID, inboundCB, logger);

    this.start();
  }

  public stop() {
    Bleno.stopAdvertising()
    Bleno.setServices([])
    Bleno.removeAllListeners()
  }

  dispose(callback: () => void) {
    if (this.isAdvertising) {
      Bleno.stopAdvertising(callback);
    } else {
      callback();
    }
  }

  public start() {
    Bleno.on('accept', (clientAddress: string) => {
      console.log('bluetooth', `accept, client: ${clientAddress}`);
      Bleno.updateRssi();
    });

    Bleno.on('disconnect', (clientAddress: string) => {
      console.log('bluetooth', `disconnect, client: ${clientAddress}`);
    });

    Bleno.on('advertisingStop', () => {
      this.isAdvertising = false;
      console.log('bluetooth', 'advertisingStop');
    });

    Bleno.on('servicesSet', (error?: Error | null) => {
      console.log('bluetooth', `servicesSet: ${error ? error : 'success'}`);
    });

    Bleno.on('stateChange', (state: string) => {
      console.log("statechange: " + state)
      if (state === 'poweredOn') {
        Bleno.startAdvertising('ble-didcomm', [this.serviceUUID], () => {
          this.isAdvertising = true
        });
      } else {
        Bleno.stopAdvertising(() => { });
      }
    });

    Bleno.on('advertisingStart', (error?: Error | null) => {
      if (!error) {
        Bleno.setServices(
          [new Bleno.PrimaryService({ uuid: this.serviceUUID, characteristics: [this.readCharacteristic, this.writeCharacteristic] })],
          () => { }
        );
      }
    });
  }

  public getDeviceID(): Promise<string> {
    if (Bleno.address === 'unknown') {
      return new Promise(function (resolve, reject) {
        // We are waiting here until the advertisement has started -> we make sure everything is started before getting the device address
        Bleno.on('advertisingStart', (error?: Error | null) => {
          resolve(Bleno.address)

        })
      })
    }
    // In case we already have a valid address we can just return
    return new Promise(function (resolve) {
      resolve(Bleno.address)
    })
  }

  public sendMessage(uuid: string, payload: string): Promise<void> {
    return this.readCharacteristic.sendMessage(payload)
  }
}
