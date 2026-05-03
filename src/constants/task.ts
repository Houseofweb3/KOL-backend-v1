export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'completed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUS_SET = new Set<string>(TASK_STATUSES);
export const TASK_PRIORITY_SET = new Set<string>(TASK_PRIORITIES);

export function isTaskStatus(value: unknown): value is TaskStatus {
    return typeof value === 'string' && TASK_STATUS_SET.has(value);
}

export function isTaskPriority(value: unknown): value is TaskPriority {
    return typeof value === 'string' && TASK_PRIORITY_SET.has(value);
}
