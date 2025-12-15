import {
    Entity,
    Column,
    ManyToOne,
    PrimaryGeneratedColumn,
    JoinColumn,
    OneToOne
} from 'typeorm';

import { Cart } from '../cart';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity('checkout_pr')
export class CheckoutPr extends BaseModel {
    
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    totalAmount!: number;

    @OneToOne(() => Cart, cart => cart.checkoutPr)
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;

}

