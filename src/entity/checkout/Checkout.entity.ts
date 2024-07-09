import {
    Entity,
    Column,
    ManyToOne,
    PrimaryGeneratedColumn
} from 'typeorm';

import { Cart } from '../cart';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class Checkout extends BaseModel {
    
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    totalAmount!: number;

    @ManyToOne(() => Cart, cart => cart.checkout)
    cart!: Cart;

    // Add other checkout-related fields as needed

    // If you have a one-to-one relationship with an order or invoice entity, you can define it here
    // @OneToOne(() => Order)
    // @JoinColumn()
    // order?: Order;

    // @OneToOne(() => Invoice)
    // @JoinColumn()
    // invoice?: Invoice;
}
