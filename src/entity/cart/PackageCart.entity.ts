import { Entity, PrimaryGeneratedColumn, JoinColumn, ManyToOne, CreateDateColumn, OneToMany,UpdateDateColumn } from 'typeorm';
import { User } from '../auth/User.entity';
import { PackageCartItem } from './PackageCartItem.entity';

import { TimestampedEntity } from '../../utils/baseEntities/TimestampedEntity';

@Entity()
export class PackageCart extends TimestampedEntity {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, user => user.packageCarts)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => PackageCartItem, (item) => item.packageCart, { cascade: true, onDelete: 'CASCADE' })
  packageCartItem!: PackageCartItem[];

  items: any;
}
