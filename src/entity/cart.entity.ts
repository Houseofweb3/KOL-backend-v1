import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { Client } from './client.entity';
import { CartItem } from './cart-item.entity';

/**
 * One cart per client. Holds influencer (service) line items.
 */
@Entity('carts')
export class Cart extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', unique: true, name: 'client_id' })
    clientId!: string;

    @OneToOne(() => Client, (client) => client.cart, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client!: Client;

    @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
    items!: CartItem[];
}
