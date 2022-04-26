import type { Agent, InboundTransport, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'

export class BLEPeripheralInboundTransport implements InboundTransport {
    private agent!: Agent
    private logger!: Logger

    public constructor() {
    }

    public async start(agent: Agent): Promise<void> {
        const agentConfig = agent.injectionContainer.resolve(AgentConfig)
        this.logger = agentConfig.logger
        this.agent = agent
        this.logger.debug('Starting BLE peripheral inbound transport agent')
    }

    public async stop(): Promise<void> {
    }

    // Callback for write request on bleCharacateristic
    public async callback(data: Buffer) {
        try {
            const encryptedMessage = JSON.parse(data.toString('utf8'))
            await this.agent.receiveMessage(encryptedMessage)
        } catch (error) {
            this.logger.debug('Error processing inbound message:' + error)
        }
    }
}