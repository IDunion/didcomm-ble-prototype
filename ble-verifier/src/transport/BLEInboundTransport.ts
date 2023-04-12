// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import { Agent, Logger, InboundTransport, AriesFrameworkError } from '@aries-framework/core'

export class BLEInboundTransport implements InboundTransport {
  private agent!: Agent
  private logger!: Logger
  private message = ""

  public async start(agent: Agent): Promise<void> {
    const agentConfig = agent.config
    this.logger = agentConfig.logger
    this.agent = agent
    this.logger.debug('Starting BLE peripheral inbound transport agent')
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, ) => { resolve() })
  }

  // Callback for write request on bleCharacateristic
  public async receiveMessage(data: Buffer) {
    try {
      this.message += data.toString('utf8');
      const encryptedMessage = JSON.parse(this.message)
      await this.agent.receiveMessage(encryptedMessage)
      this.logger.debug("MESSAGE PROCESSED")
      this.message = ""
    } catch (error) {
      if (error instanceof AriesFrameworkError) {
        this.message = ""
      }

      this.logger.debug('Error processing inbound message: ' + error)
      this.logger.debug(data.toString('utf8'))
    }
  }
}