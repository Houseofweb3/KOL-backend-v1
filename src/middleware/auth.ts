import jwt from 'jsonwebtoken';
import HttpStatus from 'http-status-codes';

import { Response, Request, NextFunction } from 'express';

import { ENV } from '../config/env';
import { UserRole } from '../constants/roles';
import { AppDataSource } from '../config/data-source';
import { Client } from '../entity/client.entity';

const jwtSecret = ENV.JWT_SECRET;

export interface JwtPayload {
    id: string;
    type: UserRole;
    email?: string;
}

/** Single JWT token, expires in 3 days. Used for admin/auth. */
export const generateToken3Days = (payload: JwtPayload): string => {
    return jwt.sign(payload, jwtSecret, { expiresIn: '3d' });
};

export const verifyAccessToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
            success: false,
            message: 'Access token is not provided',
        });
    }
    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    success: false,
                    message: 'Access token has expired',
                });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    success: false,
                    message: 'Access token is not valid',
                });
            }
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Internal server error',
            });
        }
        (req as any).user = decoded as JwtPayload;
        next();
    });
};

/** Client token: id = clientId, type = CLIENT, email. 3 days expiry. Separate from admin. */
export const generateClientToken3Days = (clientId: string, email: string): string => {
    return jwt.sign(
        { id: clientId, type: UserRole.CLIENT, email } as JwtPayload,
        jwtSecret,
        { expiresIn: '3d' }
    );
};

/** Verify client JWT and confirm client exists in clients table (not deleted). Attaches req.client = { id, email } and req.clientEntity = Client. */
export const verifyClientAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
            success: false,
            message: 'Access token is not provided',
        });
    }
    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    success: false,
                    message: 'Access token has expired',
                });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    success: false,
                    message: 'Access token is not valid',
                });
            }
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Internal server error',
            });
        }
        const payload = decoded as JwtPayload;
        if (payload.type !== UserRole.CLIENT) {
            return res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                message: 'Invalid token type',
            });
        }
        const clientRepo = AppDataSource.getRepository(Client);
        clientRepo.findOne({ where: { id: payload.id } }).then((client) => {
                if (!client || client.isDeleted) {
                    return res.status(HttpStatus.UNAUTHORIZED).json({
                        success: false,
                        message: 'Client not found or deactivated',
                    });
                }
            (req as any).client = { id: payload.id, email: payload.email };
            (req as any).clientEntity = client;
            next();
        }).catch(() => {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Internal server error',
            });
        });
    });
};

/** Verify JWT and require type === UserRole.ADMIN. Use for admin-only routes. */
export const verifyAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
            success: false,
            message: 'Access token is not provided',
        });
    }
    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    success: false,
                    message: 'Access token has expired',
                });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    success: false,
                    message: 'Access token is not valid',
                });
            }
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Internal server error',
            });
        }
        const payload = decoded as JwtPayload;
        if (payload.type !== UserRole.ADMIN) {
            return res.status(HttpStatus.FORBIDDEN).json({
                success: false,
                message: 'Admin access required',
            });
        }
        (req as any).user = payload;
        next();
    });
};
