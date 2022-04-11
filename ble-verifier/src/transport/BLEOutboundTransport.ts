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
        noble.on('discover', async(peripheral: noble.Peripheral) => {
            this.logger.debug('Found BLE device ' + peripheral.uuid)
            if (peripheral.uuid === deviceUUID) {
                // device UUID and service UUID match
                this.logger.debug('BLE device matches expected endpoint')
                await peripheral.connectAsync();
                const {characteristics} = await peripheral.discoverSomeServicesAndCharacteristicsAsync([this.service], [this.characteristic]);
                if(characteristics.length > 0) {
                    const data = Buffer.from(JSON.stringify(outboundPackage.payload))
                    this.logger.debug('Sending ' + JSON.stringify(outboundPackage.payload))
                    await characteristics[0].writeAsync(data, true)
                    await noble.stopScanningAsync()
                }
            }
        })

        // noble.startScanningAsync()
        return noble.startScanningAsync([this.service], true)
    }

}

