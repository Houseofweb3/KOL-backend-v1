import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseModel } from './baseEntities/BaseModel';
import { Client } from './client.entity';
import { CartItem } from './cart-item.entity';
import { CartStatus, CART_STATUS_DEFAULT, CartCurrency, CART_CURRENCY_DEFAULT } from '../constants/cart';

/**
 * Cart (proposal) for a client. A client can have multiple carts (e.g. one per proposal).
 * status: generate (default) → send → approved.
 */
@Entity('carts')
export class Cart extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid', name: 'client_id' })
    clientId!: string;

    @Column({ type: 'varchar', enum: CartStatus, default: CART_STATUS_DEFAULT })
    status!: CartStatus;

    /** Proposal / line-item amounts are interpreted in this currency (USD, INR, AED). */
    @Column({ type: 'varchar', length: 3, default: CART_CURRENCY_DEFAULT })
    currency!: CartCurrency;

    /**
     * Multiplier applied to each influencer's sell price to produce line `CartItem.price` (proposal unit amount).
     * Null when the cart was built from explicit line prices only (admin, no ratio in payload).
     */
    @Column({ type: 'decimal', precision: 12, scale: 4, name: 'price_ratio', nullable: true })
    priceRatio!: string | null;

    @ManyToOne(() => Client, (client) => client.carts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client!: Client;

    @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
    items!: CartItem[];

    /** Subtotal (sum of item line totals before discount/fee). */
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    subtotal!: string;

    /** Discount percentage (e.g. 0 for 0%). */
    @Column({ type: 'decimal', precision: 5, scale: 2, name: 'discount_percent', default: 0 })
    discountPercent!: string;

    /** Discount amount in currency (e.g. 0.00). */
    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'discount_amount', default: 0 })
    discountAmount!: string;

    /** Management fee percentage (e.g. 15 for 15%). */
    @Column({ type: 'decimal', precision: 5, scale: 2, name: 'management_fee_percent', default: 15 })
    managementFeePercent!: string;

    /** Management fee amount in currency. */
    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'management_fee_amount', default: 0 })
    managementFeeAmount!: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total!: string;
}
