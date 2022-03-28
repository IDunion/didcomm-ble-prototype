import type { Agent, OutboundTransport, OutboundPackage, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'
import { Peripheral, startScanningAsync, on } from '@abandonware/noble'

export class BLEOutboundTransport implements OutboundTransport {
    private logger!: Logger

    private characteristic: string
    private service: string

    public supportedSchemes: string[] = ['blue', 'ble']

    public constructor(characteristic: string, service: string) {
        this.characteristic = characteristic
        this.service = service
    }

    public async start(agent: Agent): Promise<void> {
        const agentConfig = agent.injectionContainer.resolve(AgentConfig)
        this.logger = agentConfig.logger
        this.logger.debug('Starting BLE outbound transport')
    }

    public async stop(): Promise<void> {
        
    }

    private errorCallback(error?: Error): void {
        this.logger.error('Error during ble scan: ', error)
    }

    public async sendMessage(outboundPackage: OutboundPackage): Promise<void> {
        let deviceUUID = outboundPackage.endpoint
        this.supportedSchemes.forEach(element => {
            deviceUUID?.replace(element + '://', '')
        })
        on('discover', async(peripheral: Peripheral) => {
            this.logger.debug('Found BLE device ' + peripheral.uuid)
            if (peripheral.uuid == deviceUUID) {
                // device UUID and service UUID match
                this.logger.debug('BLE device matches expected endpoint')
                await peripheral.connectAsync();
                const {characteristics} = await peripheral.discoverSomeServicesAndCharacteristicsAsync([this.service], [this.characteristic]);
                if(characteristics.length > 0) {
                    const data = Buffer.from(JSON.stringify(outboundPackage.payload))
                    this.logger.debug('Sending ' + JSON.stringify(outboundPackage.payload))
                    await characteristics[0].writeAsync(data, true)
                }
            }
        })

        await startScanningAsync([this.service], true)
    }

}

