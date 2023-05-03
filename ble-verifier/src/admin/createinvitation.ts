// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import { AdminRoute } from "./route";
import { TestLogger } from '../utils/logger'
import type { Express, Request, Response } from 'express';
import { Agent } from "@aries-framework/core";


export class AdminCreateInvitation implements AdminRoute {
  private agent: Agent
  private logger: TestLogger

  constructor(logger: TestLogger, agent: Agent) {
    this.agent = agent
    this.logger = logger
  }

  register(express: Express) {
    this.logger.debug('registering route for the creation of connection invitations')

    express.post('/createconnection', (req: Request, res: Response) => {
      this.logger.debug('Create connection')
      this.agent.oob.createLegacyInvitation({
        autoAcceptConnection: true,
        multiUseInvitation: true,
        alias: "pireader"
      }).then(value => {
        res.status(200).send(value.invitation.toJSON())
      }).catch(record => {
        this.logger.error('Connection invitation invalid: ', record)
        res.status(400).send('Invalid invitation')
      })
    })

    express.post('/createconnectionurl', (req: Request, res: Response) => {
      this.logger.debug('Create connection')
      this.agent.oob.createLegacyInvitation({
        autoAcceptConnection: true,
        multiUseInvitation: true,
        alias: "pireader"
      }).then(value => {
        res.status(200).send(value.invitation.toUrl({
          domain: "didcomm://aries_connection_invitation",
          useLegacyDidSovPrefix: true
        }))
      }).catch(record => {
        this.logger.error('Connection invitation invalid: ', record)
        res.status(400).send('Invalid invitation')
      })
    })
  }
}
