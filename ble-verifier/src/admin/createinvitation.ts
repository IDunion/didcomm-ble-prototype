import { AdminRoute } from "./route";
import { TestLogger } from '../utils/logger'
import type { Express, Request, Response } from 'express';
import { Agent, OutOfBandRecord, ConnectionInvitationMessage } from "@aries-framework/core";


export class AdminCreateInvitation implements AdminRoute {
  private agent: Agent
  private logger: TestLogger

  constructor(logger: TestLogger, agent: Agent) {
    this.agent = agent
    this.logger = logger
  }

  register(express: Express) {
    this.logger.debug('registering route for connection invitations')

    express.post('/createconnection', (req: Request, res: Response) => {
      this.logger.debug('Create connection')
      this.agent.oob.createLegacyInvitation({
        autoAcceptConnection: true,
        multiUseInvitation: true,
        label: "",
      }).then(value => {
        res.status(200).send(value.outOfBandRecord.id)
      }).catch(record => {
        this.logger.error('Connection invitation invalid: ', record)
        res.status(400).send('Invalid invitation')
      })
    })
  }
}
