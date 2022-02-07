import bleno from '@abandonware/bleno'
import { BLEOutboundTransport } from '../transport/BLEOutboundTransport'
import { didcommCharacteristic } from './didcomm-characteristic'


export class BLEServer {
    private characteristics: string[]
    private service: string
    private BlenoPrimaryService: any //bleno.PrimaryService

    // private name: string

    constructor(characteristics: string[], service: string) {
        this.characteristics = characteristics
        this.service = service
        this.BlenoPrimaryService = bleno.PrimaryService

        console.log('bleno - echo');

        bleno.on('stateChange', function(state) {
          console.log('on -> stateChange: ' + state);
        
          if (state === 'poweredOn') {
            bleno.startAdvertising('echo', ['ec00']);
          } else {
            bleno.stopAdvertising();
          }
        });

        bleno.on('advertisingStart', (error) => {
            console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));
          
            if (!error) {
              bleno.setServices([
                new this.BlenoPrimaryService({
                  uuid: 'ec00',
                  characteristics: [
                    didcommCharacteristic
                  ]
                })
              ]);
            }
          });
        
        // Create express app
        // Register default routes
    }



}