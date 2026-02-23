import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';

/** OTP for admin/auth flows: send to email, verify before login or 2FA. */
@Entity('otps')
export class Otp extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Index()
    @Column()
    email!: string;

    @Column({ length: 10 })
    code!: string;

    @Column({ type: 'timestamp', name: 'expires_at' })
    expiresAt!: Date;

    @Column({ default: false, name: 'is_used' })
    isUsed!: boolean;
}
