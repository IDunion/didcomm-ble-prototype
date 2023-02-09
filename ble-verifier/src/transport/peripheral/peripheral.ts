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
  private buffer: Buffer
  private startTimestamp: number
  private inboundCB: (data?: Buffer) => void


  constructor(serviceUUID: string, readCharacteristic: string, writeCharacteristic: string, logger: Logger, inboundCB: (data?: Buffer) => void) {
    this.isAdvertising = false;
    this.readCharacteristicUUID = readCharacteristic
    this.writeCharacteristicUUID = writeCharacteristic
    this.serviceUUID = serviceUUID
    this.buffer = Buffer.from("") //16kb Size
    this.startTimestamp = 0


    this.logger = logger

    this.readCharacteristic = new didcommReadCharacteristic(this.readCharacteristicUUID, logger);
    this.inboundCB = inboundCB;
    this.writeCharacteristic = new didcommWriteCharacteristic(this.writeCharacteristicUUID, this.bufferedCallback, logger);

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
  // In case the client does not correctly use raw junked data as L2CAP defined protocol
  public bufferedCallback(data?: Buffer){
    if(!this.startTimestamp){
      this.startTimestamp = new Date().getTime();
    }
    if(new Date().valueOf() - this.startTimestamp.valueOf() > 10000){
      this.buffer = Buffer.from("");
      this.startTimestamp = new Date().getTime();
    }

    if(data){
      console.log("Data: " + data)
      console.log("Buffer: " + this.buffer)
      if(this.buffer){

        this.buffer = Buffer.concat([this.buffer, data]);
      } else {
        this.buffer = data
      }
      try{
        JSON.parse(this.buffer.toString())
        this.inboundCB(this.buffer);
        this.buffer = Buffer.from("")  // Reset
      } catch(e) {

      }
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
