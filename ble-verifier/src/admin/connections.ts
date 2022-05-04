import { AdminRoute } from "./route";
import { TestLogger } from '../utils/logger'
import type { Express, Request, Response } from 'express';
import { Agent } from "@aries-framework/core";


export class AdminConnections implements AdminRoute {
  private agent: Agent
  private logger: TestLogger

  constructor(logger: TestLogger, agent: Agent) {
    this.agent = agent
    this.logger = logger
  }

  register(express: Express) {
    this.logger.debug('registering route for connection invitations')
    express.get('/connections', (req: Request, res: Response) => {
      this.logger.debug('Got connections list request')
      const connectionRecords = this.agent.connections.getAll()
      connectionRecords.then(connectionRecords => {
        res.status(200).send(connectionRecords)
      }).catch(record => {
        res.status(400).send('Connections')
      })
    })
  }
}
