import type { Express } from 'express';

export interface AdminRoute {
    register(express: Express): any
}