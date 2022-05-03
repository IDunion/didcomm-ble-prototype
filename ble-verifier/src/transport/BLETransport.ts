import { Logger, OutboundPackage } from "@aries-framework/core";
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
      this.central = new TransportCentral(this.serviceUUID, this.readCharacteristic, this.writeCharacteristic, this.logger);
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

  public getDeviceID(): Promise<String> {
    return this.peripheral!.getDeviceID()
  }

  public sendMessage(uuid: string, payload: string) {
    switch (this.mode) {
      case BLEMode.Peripheral:
        this.peripheral?.sendMessage(uuid, payload)
        break;
      case BLEMode.Central:
        this.central?.sendMessage(uuid, payload)
        break;
    }
  }

  public receiveMessage(data?: Buffer): void {
    this.Inbound.receiveMessage(data!)
  }

}
