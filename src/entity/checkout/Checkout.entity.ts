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

@Entity()
export class Checkout extends BaseModel {
    
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    totalAmount!: number;

    @OneToOne(() => Cart, cart => cart.checkout)
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;

}
