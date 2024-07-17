import {
  Entity,
  Column,
  OneToMany,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

import { PackageCartItem } from '../cart/PackageCartItem.entity';
import { BaseModel } from '../../utils/baseEntities/BaseModel';
import { PackageItem } from './PackageItem.entity';

@Entity()
export class Package extends BaseModel {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  @Index()  // Add an index to speed up searches
  header!: string;

  @Column('float')
  @Index()  // Add an index for sorting
  cost!: number;

  @Column('text', { array: true })
  guaranteedFeatures!: string[];

  @OneToMany(() => PackageCartItem, (packageCartItem) => packageCartItem.package)
  packageCartItems!: PackageCartItem[];

  @OneToMany(() => PackageItem, (packageItem) => packageItem.package)
  packageItems!: PackageItem[];
}
