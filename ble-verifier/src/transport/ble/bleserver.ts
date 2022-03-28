import Bleno from '@abandonware/bleno'
import { didcommCharacteristic } from './didcomm-characteristic'

export class bleServer {
  private isAdvertising: boolean;
  private blecharacteristic: string
  private bleservice: string
  private cBleWrite: any

  constructor(blecharacteristic: string, bleservice: string, cBleWrite: any) {
    this.cBleWrite = cBleWrite;
    this.isAdvertising = false;
    this.blecharacteristic = blecharacteristic
    this.bleservice = bleservice
    this.setup(this.blecharacteristic, this.bleservice, this.cBleWrite);
  }

  dispose(callback: () => void) {
    if (this.isAdvertising) {
      Bleno.stopAdvertising(callback);
    } else {
      callback();
    }
  }

  public getDeviceID(){
    return Bleno.address
  }

  private setup(blecharacteristic: string, bleservice: string, cBleWrite: any) {
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
      if (state === 'poweredOn') {
        Bleno.startAdvertising('ble-didcomm', [this.bleservice], () => { });
      } else {
        Bleno.stopAdvertising(() => { });
      }
    });

    const characteristic = new didcommCharacteristic(blecharacteristic, cBleWrite);

    Bleno.on('advertisingStart', (error?: Error | null) => {
      if (!error) {
        Bleno.setServices(
          [new Bleno.PrimaryService({ uuid: 'a422a59a-71fe-11eb-9439-0242ac130003', characteristics: [characteristic] })],
          () => { }
        );
      }
    });
  }
}

