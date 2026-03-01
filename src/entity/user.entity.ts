import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { UserRole, USER_ROLE_DEFAULT } from '../constants/roles';

@Entity('users')
export class User extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index({ unique: true })
    @Column()
    email!: string;

    @Column()
    password!: string;

    @Column({ type: 'varchar', default: USER_ROLE_DEFAULT, length: 50 })
    role!: UserRole;

    @Column({ default: true, name: 'is_verified' })
    isVerified!: boolean;

    @Column({ default: false, name: 'is_deleted' })
    isDeleted!: boolean;
}
