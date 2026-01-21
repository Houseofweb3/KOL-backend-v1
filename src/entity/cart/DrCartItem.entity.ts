import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Column } from 'typeorm';

import { Cart } from './Cart.entity';
import { Dr } from '../dr';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class DrCartItem extends BaseModel {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Dr, { onDelete: "CASCADE" })
    @JoinColumn({ name: 'dr_id' })
    dr!: Dr;

    // price is the price of the DR for a particular cart item
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    price!: number;

    // add a note field
    @Column({ type: 'text', nullable: true })
    note?: string;

    // add a profOfWork field
    @Column({ type: 'text', nullable: true })
    profOfWork?: string;

    @Column({ type: 'numeric', nullable: true, default: 1 })
    quantity!: number;

    // add a isClientApproved field
    @Column({ type: 'boolean', nullable: true, default: false })
    isClientApproved!: boolean;

    @ManyToOne(() => Cart, (cart) => cart.drCartItems)
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;
}

