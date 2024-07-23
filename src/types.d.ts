import { Request, Response } from "express";

// src/types.ts
export interface ExtendedRequest extends Request {
    user?: any;  
  }
  
export interface ExtendedResponse extends Response {
    user?: any; 
}
