import { Request, Response } from 'express';

//TODO: This function is middleware but is imported repeatedly in each API.
// This is leading to code repeatation. Add it at a single point.
export const setCorsHeaders = (req: Request, res: Response): void => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Content-Type', 'application/json');
};
