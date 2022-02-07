import type { Agent, InboundTransport, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'
import { BLEServer } from  '../admin/bleserver'

export class BLEInboundTransport implements InboundTransport {
    private agent!: Agent
    private logger!: Logger

    private characteristic: string
    private service: string

    public constructor(characteristic: string, service: string) {
        this.characteristic = characteristic
        this.service = service
    }

    public async start(agent: Agent): Promise<void> {
        const agentConfig = agent.injectionContainer.resolve(AgentConfig)
        this.logger = agentConfig.logger
        this.logger.debug('Starting BLE inbound transport')
        let ble = new BLEServer(["characteristic"], "service")


    }

    public async stop(): Promise<void> {

    }
}