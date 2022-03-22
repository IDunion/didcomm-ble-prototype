import type { Agent, InboundTransport, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'
import { bleServer } from './ble/bleserver'

export class BLEInboundTransport implements InboundTransport {
    private agent!: Agent
    private logger!: Logger

    private blecharacteristic: string
    private bleservice: string

    public constructor(blecharacteristic: string, bleservice: string) {
        this.blecharacteristic = blecharacteristic
        this.bleservice = bleservice
    }

    public async start(agent: Agent): Promise<void> {
        const agentConfig = agent.injectionContainer.resolve(AgentConfig)
        this.logger = agentConfig.logger
        this.agent = agent
        this.logger.debug('Starting BLE inbound transport')
        const ble = new bleServer(this.blecharacteristic, this.bleservice, this.cBleWrite)
    }


    // Callback for write request on bleCharacateristic
    private cBleWrite(data: Buffer) {
        // this.writeMessage = data.toString('utf8')
        console.log(data.toString('utf8'));
    }

    public async stop(): Promise<void> {

    }
}