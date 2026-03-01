import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { Cart } from './cart.entity';
import { Client } from './client.entity';

/**
 * One-time proposal link. Admin creates it; client opens link, views cart, submits form; then link is marked used.
 * JWT in URL contains proposalLinkId, cartId, clientId; we validate against this entity (exists + not used).
 */
@Entity('proposal_links')
export class ProposalLink extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'cart_id' })
    cartId!: string;

    @ManyToOne(() => Cart, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;

    @Column({ type: 'uuid', name: 'client_id' })
    clientId!: string;

    @ManyToOne(() => Client, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client!: Client;

    /** When the client submitted the form (link consumed). Null = still valid. */
    @Column({ type: 'timestamp', nullable: true, name: 'used_at' })
    usedAt!: Date | null;
}
