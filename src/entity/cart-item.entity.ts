import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { Cart } from './cart.entity';
import { Influencer } from './influencer.entity';

/**
 * Cart line item: one influencer (service) in a client's cart.
 * priceAtAdd = snapshot of influencer price when added (for checkout).
 */
@Entity('cart_items')
export class CartItem extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'cart_id' })
    cartId!: string;

    @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;

    @Column({ type: 'uuid', name: 'influencer_id' })
    influencerId!: string;

    @ManyToOne(() => Influencer, (influencer) => influencer.cartItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'influencer_id' })
    influencer!: Influencer;

    @Column({ type: 'int', default: 1 })
    quantity!: number;

    /** Price per unit when added to cart (snapshot). */
    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'price' })
    price!: string;
}
