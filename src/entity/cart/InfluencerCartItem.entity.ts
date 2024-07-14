import { Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';

import { Cart } from './cart.entity';
import { Influencer } from '../influencer/influencer.entity';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class InfluencerCartItem extends BaseModel {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Influencer, (influencer) => influencer.influencerCartItems)
    @JoinColumn({ name: 'influencer_id' })
    influencer!: Influencer;

    @ManyToOne(() => Cart, (cart) => cart.influencerCartItems)
    @JoinColumn({ name: 'cart_id' })
    cart!: Cart;
}
