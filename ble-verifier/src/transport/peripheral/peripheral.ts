import Bleno from '@abandonware/bleno'
import type { Logger } from '@aries-framework/core'
import { BLEPeripheralInboundTransport } from './BLEInboundTransport';
import { BLEPeripheralOutboundTransport } from './BLEOutboundTransport';
import { didcommReadCharacteristic } from './readCharacteristic'
import { didcommWriteCharacteristic } from './writeCharacteristic'

export class DIDCommPeripheral {
  private isAdvertising: boolean;

  private readCharacteristicUUID: string
  private writeCharacteristicUUID: string
  private serviceUUID: string

  private readChacateristic: didcommReadCharacteristic
  private writeCharacteristic: didcommWriteCharacteristic

  public inboundTransport: BLEPeripheralInboundTransport
  public outboundTransport: BLEPeripheralOutboundTransport
  private logger!: Logger


  constructor(serviceUUID: string, readCharacteristic: string, writeCharacteristic: string, logger: Logger) {
    this.isAdvertising = false;
    this.readCharacteristicUUID = readCharacteristic
    this.writeCharacteristicUUID = writeCharacteristic
    this.serviceUUID = serviceUUID

    this.logger = logger

    this.inboundTransport = new BLEPeripheralInboundTransport();
    this.outboundTransport = new BLEPeripheralOutboundTransport(this);
    this.readChacateristic = new didcommReadCharacteristic(this.readCharacteristicUUID, this.outboundTransport.callback);
    this.writeCharacteristic = new didcommWriteCharacteristic(this.writeCharacteristicUUID, this.inboundTransport.callback);

    this.setup();
  }

  dispose(callback: () => void) {
    if (this.isAdvertising) {
      Bleno.stopAdvertising(callback);
    } else {
      callback();
    }
  }

  private setup() {
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
          [new Bleno.PrimaryService({ uuid: this.serviceUUID, characteristics: [this.readChacateristic, this.writeCharacteristic] })],
          () => { }
        );
      }
    });
  }
  public getDeviceID(): Promise<String> {
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
}
