import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { InfluencerCart } from './InfluencerCart.entity';
// import { InfluencerPR } from '../influencer/Influencer.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class InfluencerCartItem extends BaseModel {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => InfluencerCart, (cart) => cart.influencerCartItems)
    influencerCart!: InfluencerCart;

    // @ManyToOne(() => InfluencerPR, (influencer) => influencer.influencerCartItems)
    // influencer!: InfluencerPR;

    @Column()
    quantity!: number;
}
