import type { Agent, OutboundTransport, OutboundPackage, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'
import noble = require('@abandonware/noble')

export class BLEOutboundTransport implements OutboundTransport {
    private logger!: Logger

    private characteristic: string
    private service: string
    private timeoutDiscoveryMs: number

    public supportedSchemes: string[] = ['blue', 'ble']

    public constructor(characteristic: string, service: string) {
        this.characteristic = this.parseUUID(characteristic)
        this.service = this.parseUUID(service)
        this.timeoutDiscoveryMs = 20000
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
            return new Promise(function (resolve, reject) {
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
        const timeoutDiscovery = this.timeoutDiscoveryMs

        let timeoutId: NodeJS.Timeout
        let discoveredPeripheral: noble.Peripheral
        let cancel = () => {
            logger.debug('Disconnecting from device')
            discoveredPeripheral.disconnectAsync()
            noble.stopScanningAsync()
            noble.removeAllListeners()
            noble.cancelConnect(deviceUUID)
        }
        const discoveryTimeout = new Promise<void>((_, reject) => {
            timeoutId = setTimeout(() => {
                logger.error("BLE Outbound Timeout")
                cancel()
                reject('BLE Outbound Timeout')
            }, timeoutDiscovery, 'BLE Device discovery timeout');
        });

        const discovery = new Promise<void>(function (resolve, reject) {
            noble.on('discover', async (peripheral: noble.Peripheral) => {
                discoveredPeripheral = peripheral
                logger.debug('Found BLE device ' + peripheral.uuid)
                if (discoveredPeripheral.uuid === deviceUUID) {
                    let cancel = () => {
                        clearTimeout(timeoutId)
                        cancel()
                    }
                    // device UUID and service UUID match
                    logger.debug('BLE device matches expected endpoint')
                    await noble.stopScanningAsync().catch((error): void => {
                        logger.error('Could not stop scanning: ' + error)
                        reject()
                    })
                    logger.debug('Connecting to BLE device')
                    discoveredPeripheral.connectAsync().catch((error): void => {
                        logger.error('Could not connect to BLE device: ' + error)
                        cancel()
                        reject()
                    }).then(async() => {
                        logger.debug('Getting Characteristics')
                        discoveredPeripheral.discoverSomeServicesAndCharacteristicsAsync([service], [characteristic]).then((serviceAndChars) => {
                            logger.debug('Successfuly found expected Services/Characteristics')
                            let characteristics = serviceAndChars.characteristics
                            if (characteristics.length > 0) {
                                const data = Buffer.from(JSON.stringify(outboundPackage.payload))
                                logger.debug('Sending ' + JSON.stringify(outboundPackage.payload))
                                characteristics[0].writeAsync(data, false).catch((error): void => {
                                    logger.error("Error writing to characteristic: " + error)
                                    cancel()
                                    reject()
                                }).then(() => {
                                    cancel()
                                    resolve()
                                })
                            } else {
                                logger.debug('Error while searching for expected characteristic')
                                cancel()
                                reject()
                            }
                        }).catch((error): void => {
                            logger.error("BLE endpoint does not expose expected service/characteristic: " + error)
                            cancel()
                            reject()
                        })
                    })
                }
            })
            noble.startScanningAsync([service], false).catch((error): void => {
                logger.error('Could not start scanning: ' + error)
                reject()
            })
        })
        return Promise.race([discovery, discoveryTimeout]);
    }
}

