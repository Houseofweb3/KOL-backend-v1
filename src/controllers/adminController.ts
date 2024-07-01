import { Request, Response } from 'express';
import { createAdmin } from '../services/adminService';

export const signup = async (req: Request, res: Response) => {
  try {
    const { id, email, password, fullname } = req.body;
    const admin = await createAdmin(id, email, password, fullname);
    res.status(201).json(admin);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Admin already exists') {
        res.status(409).json({ error: error.message }); // 409 Conflict
      } else {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "An unexpected error occurred" });
    }
  }
};
