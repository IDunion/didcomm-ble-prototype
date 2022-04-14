import type { Agent, OutboundTransport, OutboundPackage, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'
import noble = require('@abandonware/noble')

export class BLEOutboundTransport implements OutboundTransport {
    private logger!: Logger

    private characteristic: string
    private service: string

    public supportedSchemes: string[] = ['blue', 'ble']

    public constructor(characteristic: string, service: string) {
        this.characteristic = this.parseUUID(characteristic)
        this.service = this.parseUUID(service)
    }

    public async start(agent: Agent): Promise<void> {
        const agentConfig = agent.injectionContainer.resolve(AgentConfig)
        this.logger = agentConfig.logger
        this.logger.debug(`Starting BLE outbound transport`, {
            CharacteristicUUID: this.characteristic,
            ServiceUUID: this.service,
        })
    }

    public async stop(): Promise<void> {
        
    }

    private errorCallback(error?: Error): void {
        this.logger.error('Error during ble scan: ', error)
    }

    private parseUUID(input: string): string {
        let output: string = input?.toLocaleLowerCase()
        output = output.replace(/:/g, '')
        output = output.replace(/-/g, '')
        return output
    }

    public async sendMessage(outboundPackage: OutboundPackage): Promise<void> {
        let deviceUUID: string;
        if (outboundPackage.endpoint) {
            deviceUUID = outboundPackage.endpoint
        } else {
            return new Promise(function(resolve, reject) {
                reject()
              });
        }
        this.supportedSchemes.forEach(prefix => {
            deviceUUID = deviceUUID.replace(prefix + '://', '')
        })
        // Convert to noble UUID format
        deviceUUID = this.parseUUID(deviceUUID)
        this.logger.debug('Searching for BLE device with UUID: ' + deviceUUID)
        const logger = this.logger
        const service = this.service
        const characteristic = this.characteristic
        const returnPromise = new Promise<void>(function (resolve, reject) {
            noble.on('discover', async(peripheral: noble.Peripheral) => {
                logger.debug('Found BLE device ' + peripheral.uuid)
                if (peripheral.uuid === deviceUUID) {
                    // device UUID and service UUID match
                    logger.debug('BLE device matches expected endpoint')
                    noble.stopScanningAsync().catch( (error): void => {
                        logger.error('Could not stop scanning: ' + error)
                        reject()
                    }).then( () =>{
                        logger.error('Succefully stopScanningAsync')
                    })
                    await peripheral.connectAsync().catch( (error): void => {
                        logger.error('Could not connect to BLE device: ' + error)
                        reject()
                    })
                    logger.debug('Connected to peripheral, discovering services/characteristics')
                    await peripheral.discoverSomeServicesAndCharacteristicsAsync([service], [characteristic]).then((serviceAndChars) => {
                        let characteristics = serviceAndChars.characteristics
                        if(characteristics.length > 0) {
                            const data = Buffer.from(JSON.stringify(outboundPackage.payload))
                            logger.debug('Sending ' + JSON.stringify(outboundPackage.payload))
                            characteristics[0].writeAsync(data, false).catch( (error): void => {
                                logger.error("Error writing to characteristic: " + error)
                                peripheral.disconnectAsync()
                                reject()
                            }).then( () =>{
                                peripheral.disconnectAsync().catch( (error): void => {
                                    logger.error('Could not disconnect from device: ' + error)
                                    reject()
                                })
                                logger.debug('Resolving at end')
                                noble.removeAllListeners()
                                resolve()

                            })
                            logger.debug('Writing Done')
                        } else {
                            logger.debug('Error while searching char')
                            peripheral.disconnectAsync()
                            reject()
                        }
                    }).catch((error): void => {
                        logger.error("BLE endpoint does not expose expected service/characteristic: " + error)
                        peripheral.disconnectAsync()
                        reject()
                    })
                }
            })
            noble.startScanningAsync([service], false).catch( (error): void => {
                logger.error('Could not start scanning: ' + error)
                reject()
            })
        })
        return returnPromise
    }
}

