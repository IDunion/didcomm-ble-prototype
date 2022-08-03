// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import { Logger } from "@aries-framework/core";
import { BLEInboundTransport } from "./BLEInboundTransport";
import { BLEOutboundTransport } from "./BLEOutboundTransport";
import { TransportCentral } from "./central/central";
import { TransportPeripheral } from "./peripheral/peripheral";

enum BLEMode {
  Central,
  Peripheral,
  Both
}

export class BleTransport {
  private logger!: Logger
  private mode: BLEMode
  private central?: TransportCentral
  private peripheral?: TransportPeripheral

  private serviceUUID: string
  private readCharacteristic: string
  private writeCharacteristic: string

  public Inbound: BLEInboundTransport
  public Outbound: BLEOutboundTransport


  constructor(mode: string, serviceUUID: string, readCharacteristic: string, writeCharacteristic: string, logger: Logger) {
    this.logger = logger
    this.serviceUUID = serviceUUID
    this.readCharacteristic = readCharacteristic
    this.writeCharacteristic = writeCharacteristic

    this.Inbound = new BLEInboundTransport()
    this.Outbound = new BLEOutboundTransport(this)


    switch (mode) {
      case 'central':
        this.mode = BLEMode.Central
        break;
      case 'peripheral':
        this.mode = BLEMode.Peripheral
        break;
      case 'both':
        this.mode = BLEMode.Both
        break;
      default:
        this.mode = BLEMode.Peripheral
    }

    switch (this.mode) {
      case BLEMode.Central:
        this.startCentral()
        break;
      case BLEMode.Peripheral:
        this.startPeripheral();
        break;
      case BLEMode.Both:
        this.startCentral();
        this.startPeripheral();
        break;
    }
  }

  private startCentral() {
    if (!this.central) {
      this.central = new TransportCentral(this.serviceUUID, this.readCharacteristic, this.writeCharacteristic, this.logger, this.receiveMessage.bind(this));
    }
  }

  private stopCentral() {
    if (this.central) {
      this.central.stop()
      this.central = undefined
    }
  }

  private startPeripheral() {
    if (!this.peripheral) {
      this.peripheral = new TransportPeripheral(this.serviceUUID, this.readCharacteristic, this.writeCharacteristic, this.logger, this.receiveMessage.bind(this));
    }
  }

  private stopPeripheral() {
    if (this.peripheral) {
      this.peripheral.stop()
      this.peripheral = undefined
    }
  }

  public getDeviceID(): Promise<string> {
    switch (this.mode) {
      case BLEMode.Central:
        return new Promise((resolve, ) => {
          // TODO: can we get a device UUID from central mode?
          resolve('central')
        })
      default:
        return this.peripheral?.getDeviceID() ?? new Promise((_, reject) => { reject('no peripheral device configured') });
    }
  }

  // Called by Aries Transport Implementation and forwards to correct BLE HW implementation
  public sendMessage(uuid: string, payload: string): Promise<void> {
    switch (this.mode) {
      case BLEMode.Peripheral:
        return this.peripheral?.sendMessage(uuid, payload) ?? new Promise((_, reject) => { reject('no peripheral device configured') })
      case BLEMode.Central:
        return this.central?.sendMessage(uuid, payload) ?? new Promise((_, reject) => { reject('no central device configured') })
      case BLEMode.Both:
        // TODO: This needs some switching logic, looking up for active connections on peripheral
        if (uuid == "ble://central") {
          return this.peripheral?.sendMessage(uuid, payload) ?? new Promise((_, reject) => { reject('no central device configured') })
        }
        return this.central?.sendMessage(uuid, payload) ?? new Promise((_, reject) => { reject('no central device configured') })
      default:
        this.logger.error('Unexpected BLE Mode while sending: ', this.mode)
        return new Promise<void>((_, reject) => {
          reject('Unexpected BLE Mode while sending')
        })
    }
  }

  // Used to forward message from BLE HW implementation to Aries Transport
  public receiveMessage(data?: Buffer): void {
    if(data) {
      this.Inbound.receiveMessage(data)
    }
  }

  public getInboundTransport(): BLEInboundTransport {
    return this.Inbound
  }
  public getOutboundTransport(): BLEOutboundTransport {
    return this.Outbound
  }

}
