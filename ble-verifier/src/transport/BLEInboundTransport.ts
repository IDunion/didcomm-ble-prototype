import type { Agent, InboundTransport, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'
import { bleServer, getDeviceID } from './ble/bleserver'

export class BLEInboundTransport implements InboundTransport {
    private agent!: Agent
    private logger!: Logger

    private blecharacteristic: string
    private bleservice: string

    public constructor(blecharacteristic: string, bleservice: string) {
        this.blecharacteristic = blecharacteristic
        this.bleservice = bleservice
        let boundcBleWrite = this.cBleWrite.bind(this)
        const ble = new bleServer(this.blecharacteristic, this.bleservice, boundcBleWrite)
    }

    public async start(agent: Agent): Promise<void> {
        const agentConfig = agent.injectionContainer.resolve(AgentConfig)
        this.logger = agentConfig.logger
        this.agent = agent
        agentConfig.logger.debug(`Starting BLE inbound transport`, {
            ServiceUUID: this.bleservice,
            CharacteristicsUUID: this.blecharacteristic,
        })
    }

    // Callback for write request on bleCharacateristic
    private async cBleWrite(data: Buffer) {
        try {
            const encryptedMessage = JSON.parse(data.toString('utf8'))
            await this.agent.receiveMessage(encryptedMessage)
        } catch (error) {
            this.logger.debug('Error processing inbound message:' + error)
        }
    }

    public getdeviceID(): Promise<String>{
        return getDeviceID()
    }

    public async stop(): Promise<void> {

    }
}