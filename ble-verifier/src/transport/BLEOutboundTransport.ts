import type { Agent, OutboundTransport, OutboundPackage, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'

export class BLEOutboundTransport implements OutboundTransport {
    private agent!: Agent
    private logger!: Logger

    private characteristic: string
    public supportedSchemes: string[] = ['blue', 'ble']


    public constructor(characteristic: string) {
        this.characteristic = characteristic
    }

    public async start(agent: Agent): Promise<void> {
        const agentConfig = agent.injectionContainer.resolve(AgentConfig)
        this.logger = agentConfig.logger
        this.logger.debug('Starting BLE outbound transport')
    }

    public async stop(): Promise<void> {
        
    }

    public async sendMessage(outboundPackage: OutboundPackage): Promise<void> {

    }

}

