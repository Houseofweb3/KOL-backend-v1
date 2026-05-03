import HttpStatus from 'http-status-codes';
import { Request, Response } from 'express';

import logger from '../../../config/logger';
import { JwtRequest } from '../../../middleware/auth';
import {
    createTask,
    getTaskById,
    getTasksBoardAssignedToUser,
    getTasksBoardCreatedByUser,
    softDeleteTask,
    updateTaskContent,
    updateTaskStatus,
} from '../../../services/v1/admin/task.service';
import { isTaskPriority, isTaskStatus } from '../../../constants/task';

/** GET /admin/task/board/created — Kanban columns for tasks created by the authenticated admin. */
export const getTasksBoardCreatedController = async (req: Request, res: Response) => {
    try {
        const adminId = (req as JwtRequest).user?.id;
        if (!adminId) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Unauthorized' });
        }
        const board = await getTasksBoardCreatedByUser(adminId);
        return res.status(HttpStatus.OK).json(board);
    } catch (error: unknown) {
        const err = error as Error & { status?: number };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Get created task board error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

/** GET /admin/task/board/assigned — Kanban columns for tasks assigned to the authenticated admin. */
export const getTasksBoardAssignedController = async (req: Request, res: Response) => {
    try {
        const adminId = (req as JwtRequest).user?.id;
        if (!adminId) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Unauthorized' });
        }
        const board = await getTasksBoardAssignedToUser(adminId);
        return res.status(HttpStatus.OK).json(board);
    } catch (error: unknown) {
        const err = error as Error & { status?: number };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Get assigned task board error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

/** POST /admin/task — body: title, optional status, label, priority, description, assignedUserIds */
export const createTaskController = async (req: Request, res: Response) => {
    try {
        const adminId = (req as JwtRequest).user?.id;
        if (!adminId) {
            return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Unauthorized' });
        }
        const { title, status, label, priority, description, assignedUserIds } = req.body as {
            title?: string;
            status?: unknown;
            label?: unknown;
            priority?: unknown;
            description?: unknown;
            assignedUserIds?: unknown;
        };
        if (priority !== undefined && priority !== null && !isTaskPriority(priority)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid priority' });
        }
        if (status !== undefined && status !== null && !isTaskStatus(status)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid status' });
        }
        const task = await createTask(adminId, {
            title: title ?? '',
            status: isTaskStatus(status) ? status : undefined,
            label: typeof label === 'string' || label === null ? (label as string | null) : undefined,
            priority: isTaskPriority(priority) ? priority : undefined,
            description:
                typeof description === 'string' || description === null
                    ? (description as string | null)
                    : undefined,
            assignedUserIds: Array.isArray(assignedUserIds)
                ? assignedUserIds.filter((x): x is string => typeof x === 'string')
                : undefined,
        });
        return res.status(HttpStatus.CREATED).json(task);
    } catch (error: unknown) {
        const err = error as Error & { status?: number };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Create task error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

/** GET /admin/task/:id */
export const getTaskByIdController = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Task id is required' });
        }
        const task = await getTaskById(id);
        return res.status(HttpStatus.OK).json(task);
    } catch (error: unknown) {
        const err = error as Error & { status?: number };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Get task error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

/** PATCH /admin/task/:id — update title, label, priority, description, assignedUserIds (not status). */
export const updateTaskContentController = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Task id is required' });
        }
        const { title, label, priority, description, assignedUserIds } = req.body as {
            title?: string;
            label?: unknown;
            priority?: unknown;
            description?: unknown;
            assignedUserIds?: unknown;
        };
        if (priority !== undefined && priority !== null && !isTaskPriority(priority)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid priority' });
        }
        const task = await updateTaskContent(id, {
            title,
            label: typeof label === 'string' || label === null ? (label as string | null) : undefined,
            priority: isTaskPriority(priority) ? priority : undefined,
            description:
                typeof description === 'string' || description === null
                    ? (description as string | null)
                    : undefined,
            assignedUserIds: Array.isArray(assignedUserIds)
                ? assignedUserIds.filter((x): x is string => typeof x === 'string')
                : undefined,
        });
        return res.status(HttpStatus.OK).json(task);
    } catch (error: unknown) {
        const err = error as Error & { status?: number };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Update task content error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

/** PATCH /admin/task/:id/status — body: { status } */
export const updateTaskStatusController = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Task id is required' });
        }
        const { status } = req.body as { status?: unknown };
        if (!isTaskStatus(status)) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Valid status is required' });
        }
        const task = await updateTaskStatus(id, status);
        return res.status(HttpStatus.OK).json(task);
    } catch (error: unknown) {
        const err = error as Error & { status?: number };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Update task status error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};

/** DELETE /admin/task/:id — soft delete */
export const deleteTaskController = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Task id is required' });
        }
        const task = await softDeleteTask(id);
        return res.status(HttpStatus.OK).json({ message: 'Task deleted', task });
    } catch (error: unknown) {
        const err = error as Error & { status?: number };
        const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
        logger.error(`Delete task error (${status}): ${err.message}`);
        return res.status(status).json({ error: err.message });
    }
};
