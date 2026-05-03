import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import type { TaskPriority, TaskStatus } from '../constants/task';

@Entity('tasks')
export class Task extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 500 })
    title!: string;

    @Index()
    @Column({ type: 'varchar', length: 32 })
    status!: TaskStatus;

    @Column({ type: 'varchar', length: 255, nullable: true })
    label!: string | null;

    @Index()
    @Column({ type: 'varchar', length: 16 })
    priority!: TaskPriority;

    /** Rich text / HTML from the client; stored as-is. */
    @Column({ type: 'text', nullable: true })
    description!: string | null;

    @Column('uuid', {
        array: true,
        name: 'assigned_user_ids',
        default: () => 'ARRAY[]::uuid[]',
    })
    assignedUserIds!: string[];

    @Index()
    @Column('uuid', { name: 'created_by_user_id' })
    createdByUserId!: string;

    @Column({ default: false, name: 'is_deleted' })
    isDeleted!: boolean;
}
