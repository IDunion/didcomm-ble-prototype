// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import { AdminRoute } from "./route";
import { TestLogger } from '../utils/logger'
import type { Express, Request, Response } from 'express';
import { Agent, HandshakeProtocol } from "@aries-framework/core";


export class AdminReceiveInvitation implements AdminRoute {
  private agent: Agent
  private logger: TestLogger

  constructor(logger: TestLogger, agent: Agent) {
    this.agent = agent
    this.logger = logger
  }

  register(express: Express) {
    this.logger.debug('registering route for the reception connection invitations')

    express.post('/invitation', (req: Request, res: Response) => {
      this.logger.debug('Got connection invitation')
      const invitation = req.body
      const connectionRecord = this.agent.oob.receiveInvitation(invitation, {
        autoAcceptConnection: true,
        reuseConnection: false,
      })
      connectionRecord.then(record => {
        this.logger.debug('Connection invitation accepted: ' + record.outOfBandRecord.id)
        res.status(200).send('Invitation accepted')
      }).catch(record => {
        this.logger.error('Connection invitation invalid: ', record)
        res.status(400).send('Invalid invitation')
      })
    })

    express.post('/invitationurl', (req: Request, res: Response) => {
      this.logger.debug('Got connection invitation url: ', req.body)
      const invitation = this.agent.oob.receiveInvitationFromUrl(req.url, {
        autoAcceptConnection: true,
        autoAcceptInvitation: true,
        reuseConnection: false,
      })
      invitation.then(record => {
        this.logger.debug('Connection invitation accepted: ' + record.connectionRecord?.id ?? '')
        res.status(200).send('Invitation accepted')
      }).catch(record => {
        this.logger.error('Connection invitation invalid: ', record)
        res.status(400).send('Invalid invitation')
      })  
    })
  }
}
