import HttpStatus from 'http-status-codes';
import { validate as validateUuid } from 'uuid';

import {
    TASK_STATUSES,
    type TaskPriority,
    type TaskStatus,
    isTaskPriority,
    isTaskStatus,
} from '../../../constants/task';
import { Task } from '../../../entity/task.entity';
import { User } from '../../../entity/user.entity';
import { AppDataSource } from '../../../config/data-source';

export type TasksByStatus = Record<TaskStatus, Task[]>;

const emptyBoard = (): TasksByStatus => ({
    todo: [],
    in_progress: [],
    review: [],
    completed: [],
});

const groupTasksByStatus = (tasks: Task[]): TasksByStatus => {
    const board = emptyBoard();
    for (const task of tasks) {
        board[task.status].push(task);
    }
    return board;
};

function badRequest(message: string): Error {
    const err = new Error(message);
    (err as Error & { status: number }).status = HttpStatus.BAD_REQUEST;
    return err;
}

function notFound(message: string): Error {
    const err = new Error(message);
    (err as Error & { status: number }).status = HttpStatus.NOT_FOUND;
    return err;
}

async function assertAssignableUserIds(assignedUserIds: string[]): Promise<void> {
    const ids = [...new Set(assignedUserIds)];
    if (ids.length !== assignedUserIds.length) {
        throw badRequest('assignedUserIds must not contain duplicates');
    }
    for (const id of ids) {
        if (!validateUuid(id)) {
            throw badRequest(`Invalid assigned user id: ${id}`);
        }
    }
    if (ids.length === 0) {
        return;
    }
    const userRepo = AppDataSource.getRepository(User);
    const count = await userRepo
        .createQueryBuilder('u')
        .where('u.id IN (:...ids)', { ids })
        .andWhere('u.isDeleted = false')
        .getCount();
    if (count !== ids.length) {
        throw badRequest('One or more assigned users do not exist or are deleted');
    }
}

/** Tasks created by the given admin user id, grouped for Kanban columns. */
export const getTasksBoardCreatedByUser = async (creatorUserId: string): Promise<TasksByStatus> => {
    const repo = AppDataSource.getRepository(Task);
    const tasks = await repo.find({
        where: { createdByUserId: creatorUserId, isDeleted: false },
        order: { updatedAt: 'DESC' },
    });
    return groupTasksByStatus(tasks);
};

/** Tasks assigned to this user id (excluding soft-deleted), grouped by status. */
export const getTasksBoardAssignedToUser = async (userId: string): Promise<TasksByStatus> => {
    const repo = AppDataSource.getRepository(Task);
    const tasks = await repo
        .createQueryBuilder('t')
        .where('t.isDeleted = false')
        .andWhere('t.assignedUserIds @> ARRAY[CAST(:uid AS uuid)]', { uid: userId })
        .orderBy('t.updatedAt', 'DESC')
        .getMany();
    return groupTasksByStatus(tasks);
};

export interface CreateTaskInput {
    title: string;
    status?: TaskStatus;
    label?: string | null;
    priority?: TaskPriority;
    description?: string | null;
    assignedUserIds?: string[];
}

export const createTask = async (creatorUserId: string, input: CreateTaskInput): Promise<Task> => {
    const title = input.title?.trim();
    if (!title) {
        throw badRequest('title is required');
    }
    const status = input.status ?? 'todo';
    if (!isTaskStatus(status)) {
        throw badRequest(`Invalid status; allowed: ${TASK_STATUSES.join(', ')}`);
    }
    const priority = input.priority ?? 'medium';
    if (!isTaskPriority(priority)) {
        throw badRequest('Invalid priority');
    }
    const assignedUserIds = input.assignedUserIds ?? [];
    await assertAssignableUserIds(assignedUserIds);

    const repo = AppDataSource.getRepository(Task);
    const task = repo.create({
        title,
        status,
        label: input.label ?? null,
        priority,
        description: input.description ?? null,
        assignedUserIds,
        createdByUserId: creatorUserId,
        isDeleted: false,
    });
    await repo.save(task);
    return task;
};

export const getTaskById = async (id: string): Promise<Task> => {
    if (!validateUuid(id)) {
        throw badRequest('Invalid task id');
    }
    const repo = AppDataSource.getRepository(Task);
    const task = await repo.findOne({ where: { id, isDeleted: false } });
    if (!task) {
        throw notFound('Task not found');
    }
    return task;
};

export interface UpdateTaskContentInput {
    title?: string;
    label?: string | null;
    priority?: TaskPriority;
    description?: string | null;
    assignedUserIds?: string[];
}

/** Updates metadata and assignees; does not change `status`. */
export const updateTaskContent = async (id: string, input: UpdateTaskContentInput): Promise<Task> => {
    const task = await getTaskById(id);

    if (input.title !== undefined) {
        const next = input.title.trim();
        if (!next) {
            throw badRequest('title cannot be empty');
        }
        task.title = next;
    }
    if (input.label !== undefined) {
        task.label = input.label;
    }
    if (input.priority !== undefined) {
        if (!isTaskPriority(input.priority)) {
            throw badRequest('Invalid priority');
        }
        task.priority = input.priority;
    }
    if (input.description !== undefined) {
        task.description = input.description;
    }
    if (input.assignedUserIds !== undefined) {
        await assertAssignableUserIds(input.assignedUserIds);
        task.assignedUserIds = input.assignedUserIds;
    }

    const repo = AppDataSource.getRepository(Task);
    await repo.save(task);
    return task;
};

export const updateTaskStatus = async (id: string, status: TaskStatus): Promise<Task> => {
    if (!isTaskStatus(status)) {
        throw badRequest(`Invalid status; allowed: ${TASK_STATUSES.join(', ')}`);
    }
    const task = await getTaskById(id);
    task.status = status;
    const repo = AppDataSource.getRepository(Task);
    await repo.save(task);
    return task;
};

export const softDeleteTask = async (id: string): Promise<Task> => {
    const task = await getTaskById(id);
    task.isDeleted = true;
    if (task.deletedAt == null) {
        task.deletedAt = new Date();
    }
    const repo = AppDataSource.getRepository(Task);
    await repo.save(task);
    return task;
};
