import type { Agent, OutboundTransport, OutboundPackage, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'
import { DIDCommPeripheral } from './peripheral'

export class BLEPeripheralOutboundTransport implements OutboundTransport {
    private logger!: Logger
    private peripheral: DIDCommPeripheral

    public supportedSchemes: string[] = ['blue', 'ble']

    public constructor(peripheral: DIDCommPeripheral) {
        this.peripheral = peripheral
    }

    public async start(agent: Agent): Promise<void> {
        const agentConfig = agent.injectionContainer.resolve(AgentConfig)
        this.logger = agentConfig.logger
        this.logger.debug('Starting BLE peripheral outbound transport')
    }

    public async stop(): Promise<void> {

    }

    // Callback for read request on bleCharacateristic
    public async callback(offset: number) {
    }

    public async sendMessage(outboundPackage: OutboundPackage): Promise<void> {
        const data = Buffer.from(JSON.stringify(outboundPackage.payload))
        this.peripheral
    }
}
