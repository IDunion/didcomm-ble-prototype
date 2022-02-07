import bleno from '@abandonware/bleno'
import { didcommCharacteristic } from './didcomm-characteristic'

export const didcommService = new bleno.PrimaryService({
    uuid: '13333333333333333333333333333337',
    characteristics: [
        didcommCharacteristic
    ]
});