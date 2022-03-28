import { Agent } from '@aries-framework/core'
import express from 'express'
import bodyParser, { BodyParser } from  'body-parser'
import { TestLogger } from '../utils/logger'
import type { AdminRoute } from './route'
import { AdminReceiveInvitation } from './receiveinvitation'
import { AdminConnections } from './connections'
import { AdminCreateInvitation } from './createinvitation'


export class AdminWebServer {
    private logger: TestLogger
    private app: express.Express
    private agent: Agent

    constructor(logger: TestLogger, agent: Agent) {
        this.logger = logger
        this.agent = agent

        // Create express app
        const app = express()
        app.use(bodyParser.json());
        this.app = app

        // Regsiter default routes
        const receiveInvitation = new AdminReceiveInvitation(logger, agent)
        this.registerRoute(receiveInvitation)
        const createInvitation = new AdminCreateInvitation(logger, agent)
        this.registerRoute(createInvitation)
        const connections = new AdminConnections(logger, agent)
        this.registerRoute(connections)
    }

    public registerRoute(route: AdminRoute) {
        route.register(this.app)
    }

    public async listen(port: number) {
        return this.app.listen(port, () => {
            this.logger.info('Admin Server is running at port ' + port)
        })
    }
}