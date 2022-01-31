import type { Agent, InboundTransport, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'

export class BLEInboundTransport implements InboundTransport {
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
        this.logger.debug('Starting BLE inbound transport')

    }

    public async stop(): Promise<void> {

    }
}