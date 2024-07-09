import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { InfluencerCart } from './InfluencerCart.entity';
import { InfluencerPR } from '../influencer/Influencer.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class InfluencerCartItem extends BaseModel {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => InfluencerCart, (cart) => cart.influencerCartItems)
    @JoinColumn({ name: 'influencer_cart_id' })
    influencerCart!: InfluencerCart;

    @ManyToOne(() => InfluencerPR, (influencer) => influencer.influencerCartItems)
    @JoinColumn({ name: 'influencer_id' })
    influencer!: InfluencerPR;

    @Column()
    quantity!: number;
}
