import { Entity, PrimaryGeneratedColumn, ManyToOne,  OneToMany} from 'typeorm';
import { User } from '../auth/User.entity';
import { PackageCartItem } from './PackageCartItem.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class PackageCart extends BaseModel {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, user => user.packageCarts)
  user!: User;

  @OneToMany(() => PackageCartItem, (item) => item.packageCart, { cascade: true, onDelete: 'CASCADE' })
  packageCartItem!: PackageCartItem[];

  items: any;
}
