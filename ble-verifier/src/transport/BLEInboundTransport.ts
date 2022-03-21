import type { Agent, InboundTransport, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'
import { bleServer } from './ble/bleserver'

export class BLEInboundTransport implements InboundTransport {
    private agent!: Agent
    private logger!: Logger
    private writeMessage: string;

    private blecharacteristic: string
    private bleservice: string

    public constructor(blecharacteristic: string, bleservice: string) {
        this.blecharacteristic = blecharacteristic
        this.bleservice = bleservice
        this.writeMessage = ""
    }

    public async start(agent: Agent): Promise<void> {
        const agentConfig = agent.injectionContainer.resolve(AgentConfig)
        this.logger = agentConfig.logger
        this.logger.debug('Starting BLE inbound transport')
        const ble = new bleServer(this.blecharacteristic, this.bleservice, this.cBleWrite)
    }

    onBleWrite(message: Buffer) {
        let sMessage = this.cBleWrite(message)
        this.logger.debug('bleInbound WriteMessage: ' + sMessage)

    }

    // Callback for write request on bleCharacateristic
    private cBleWrite(data: Buffer) {
        this.writeMessage = data.toString('utf8')
        console.log(this.writeMessage);
    }

    public async stop(): Promise<void> {

    }
}