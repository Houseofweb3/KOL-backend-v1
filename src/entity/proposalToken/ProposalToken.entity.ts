import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { Cart } from '../cart';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity('proposal_tokens')
export class ProposalToken extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    token!: string;

    @Column({ type: 'timestamp', nullable: true })
    expiresAt!: Date;

    @Column({ type: 'boolean', default: false })
    isUsed!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    usedAt!: Date | null;

    @OneToOne(() => Cart, { nullable: true })
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;

    @Column({ type: 'text', nullable: true })
    billingInfo!: string; // JSON stringified billing info

    @Column({ type: 'text', nullable: true })
    influencerItems!: string; // JSON stringified influencer items

    @Column({ type: 'varchar', length: 255, nullable: true })
    email!: string;
}

