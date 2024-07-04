// src/routes/index.ts
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/data-source';
import User  from '../routes';

const router = Router();
const userRepository = AppDataSource.getRepository(User);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retrieve a list of users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get('/users', async (req: Request, res: Response) => {
  const users = await userRepository.find();
  res.json(users);
});

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: The created user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/users', async (req: Request, res: Response) => {
  const user = userRepository.create(req.body);
  await userRepository.save(user);
  res.status(201).json(user);
});

export default router;
