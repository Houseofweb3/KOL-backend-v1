import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/User';

@Entity()
export class InfluencerCart {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column()
  uuid!: string;

  @Column('int', { array: true })
  influencerPRId!: number[];

  @ManyToOne(() => User, user => user.influencerCarts)
  @Column()
  userId!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  user!: User;
}
