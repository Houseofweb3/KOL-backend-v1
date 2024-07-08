import { Entity, PrimaryGeneratedColumn, JoinColumn, ManyToOne, CreateDateColumn, OneToMany, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/User.entity';
import { InfluencerCartItem } from './InfluencerCartItem.entity';

@Entity()
export class InfluencerCart {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, user => user.influencerCarts)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => InfluencerCartItem, (item) => item.influencerCart, { cascade: true, onDelete: 'CASCADE' })
  influencerCartItems!: InfluencerCartItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
