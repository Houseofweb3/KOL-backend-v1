import jwt from 'jsonwebtoken';
import { Response, Request, NextFunction } from 'express';
import { ENV } from '../config/env';

const jwtSecret = ENV.JWT_SECRET;
const jwtRefreshSecret = ENV.REFRESH_JWT_SECRET; // Optional: Use a different secret for refresh tokens

interface JwtPayload {
    id: string;
    type: any;
}

export const generateAccessToken = ({ id, type }: JwtPayload): string => {
    return jwt.sign({ id, type }, jwtSecret, { expiresIn: '1h' }); // Access token valid for 1 hour
};

export const generateRefreshToken = ({ id, type }: JwtPayload): string => {
    return jwt.sign({ id, type }, jwtRefreshSecret, { expiresIn: '7d' }); // Refresh token valid for 7 days
};

export const verifyAccessToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access token is not provided"
        });
    }
    jwt.verify(token, jwtSecret, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: "Access token has expired"
                });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: "Access token is not valid"
                });
            }
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
        // req.user = user as JwtPayload;
        next();
    });
};

export const refreshToken = (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            message: "Refresh token is required"
        });
    }

    jwt.verify(refreshToken, jwtRefreshSecret, (err: jwt.VerifyErrors | null, decoded: any) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: "Refresh token has expired"
                });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: "Refresh token is not valid"
                });
            }
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }

        // Type assertion to JwtPayload
        const user = decoded as JwtPayload;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        const newAccessToken = generateAccessToken(user);
        res.json({
            success: true,
            accessToken: newAccessToken
        });
    });
};



export const logout = (req: Request, res: Response) => {
    // Optionally, invalidate the refresh token here
    // This might involve removing the refresh token from a database or a blacklist
    res.json({
        success: true,
        message: "Logged out successfully"
    });
};
