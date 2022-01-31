import type { Agent, InboundTransport, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'

export class BLEOutboundTransport implements InboundTransport {
    private agent!: Agent
    private logger!: Logger

    public async start(agent: Agent): Promise<void> {
        const agentConfig = agent.injectionContainer.resolve(AgentConfig)
        this.logger = agentConfig.logger
        this.logger.debug('Starting BLE outbound transport')

    }

    public async stop(): Promise<void> {

    }
}