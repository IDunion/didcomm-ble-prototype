import bleno from '@abandonware/bleno'
import { didcommCharacteristic } from './didcomm-characteristic'

export const didcommService = new bleno.PrimaryService({
    uuid: 'a422a59a-71fe-11eb-9439-0242ac130002',
    characteristics: [
        didcommCharacteristic
    ]
});