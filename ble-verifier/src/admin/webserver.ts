import { Agent } from '@aries-framework/core'
import express from 'express'
import bodyParser, { BodyParser } from  'body-parser'
import { TestLogger } from '../utils/logger'
import type { AdminRoute } from './route'
import { AdminAcceptInvitation } from './connectionInvitation'


export class AdminWebServer {
    private logger: TestLogger
    private app: express.Express
    private agent: Agent

    constructor(logger: TestLogger, agent: Agent) {
        this.logger = logger
        this.agent = agent

        // Create express app
        const app = express()
        app.use(bodyParser.urlencoded({ extended: false }));
        this.app = app

        // Regsiter default routes
        const invitations = new AdminAcceptInvitation(logger, agent)
        this.registerRoute(invitations)
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