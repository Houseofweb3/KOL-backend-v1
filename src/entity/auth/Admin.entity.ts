import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class Admin extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index({ unique: true })
    @Column()
    email!: string;

    @Column()
    password!: string;

    @Column({ default: false, name: 'is_deleted' })
    isDeleted!: boolean;
}
