import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Column } from 'typeorm';

import { Cart } from './Cart.entity';
import { Influencer } from '../influencer';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class InfluencerCartItem extends BaseModel {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Influencer, (influencer) => influencer.influencerCartItems, { onDelete: "CASCADE" })
    @JoinColumn({ name: 'influencer_id' })
    influencer!: Influencer;
    // price is the price of the influencer for a particular content type

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    price!: number;

    // add a note field
    @Column({ type: 'text', nullable: true })
    note?: string;

    @ManyToOne(() => Cart, (cart) => cart.influencerCartItems)
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;
}
