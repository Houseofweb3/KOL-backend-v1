import {
  Entity,
  Column,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';

import { PackageItem } from './PackageItem.entity';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class Package extends BaseModel{

  @PrimaryGeneratedColumn("uuid")
  id!: string;
  
  @Column()
  header!: string;

  @Column('float')
  cost!: number;

  @Column('text', { array: true })
  guaranteedFeatures!: string[];

  @OneToMany(() => PackageItem, (packageItem) => packageItem.package)
  packageItems!: PackageItem[];
}
