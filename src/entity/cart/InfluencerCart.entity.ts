import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, OneToMany, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/User.entity';
import { InfluencerCartItem } from './InfluencerCartItem.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class InfluencerCart extends BaseModel {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, user => user.influencerCarts)
  user!: User;

  @OneToMany(() => InfluencerCartItem, (item) => item.influencerCart, { cascade: true, onDelete: 'CASCADE' })
  influencerCartItems!: InfluencerCartItem[];

}
