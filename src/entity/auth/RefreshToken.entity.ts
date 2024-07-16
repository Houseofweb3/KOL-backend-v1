import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity('')
export class RefreshToken extends BaseModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'text', unique: true })
    token!: string;

    @Column({ type: 'timestamp' })
    expiresAt!: Date;
}
