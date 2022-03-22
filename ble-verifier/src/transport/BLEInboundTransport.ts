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
        let boundCallback = this.cBleWrite.bind(this)
        const ble = new bleServer(this.blecharacteristic, this.bleservice, boundCallback)
    }

    // Callback for write request on bleCharacateristic
    private async cBleWrite(data: Buffer) {
        try {
            const encryptedMessage = data.toString('utf8')
            await this.agent.receiveMessage(encryptedMessage)
        } catch (error) {
            this.logger.debug('Error processing inbound message:' + error)
            // console.log(data.toString('utf8'));
            // console.log(this)
        }
    }

    public async stop(): Promise<void> {

    }
}