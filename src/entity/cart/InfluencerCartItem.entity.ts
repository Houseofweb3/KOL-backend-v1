import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { InfluencerCart } from './InfluencerCart.entity';
import { InfluencerPR } from '../influencer/InfluencerPR.entity';

import { TimestampedEntity } from '../../utils/baseEntities/TimestampedEntity';

@Entity()
export class InfluencerCartItem extends TimestampedEntity {
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
