import {
  Entity,
  Column,
  OneToMany,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

import { PackageItem } from './PackageItem.entity';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

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

  @OneToMany(() => PackageItem, (packageItem) => packageItem.package)
  packageItems!: PackageItem[];
}
