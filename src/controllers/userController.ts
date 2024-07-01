import { Request, Response } from 'express';
import { createUser } from '../services/userService';

export const signup = async (req: Request, res: Response) => {
  try {
    const { id, email, password, fullname } = req.body;
    const user = await createUser(id, email, password, fullname);
    res.status(201).json(user);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'User already exists') {
        res.status(409).json({ error: error.message }); // 409 Conflict
      } else {
        res.status(400).json({ error: error.message });
      }
    } else {
      res.status(400).json({ error: "An unexpected error occurred" });
    }
  }
};
