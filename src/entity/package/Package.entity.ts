import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn
} from 'typeorm';

import { User } from '../auth/User.entity';
import { PackageItem } from './PackageItem.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class Package extends BaseModel{

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // @ManyToOne(() => User, (admin) => admin.package)
  @JoinColumn({ name: 'admin_id' })
  admin!: User;
  
  @Column()
  header!: string;

  @Column('float')
  cost!: number;

  @Column('text', { array: true })
  text!: string[];

  @OneToMany(() => PackageItem, (packageItem) => packageItem.package)
  packageItems!: PackageItem[];
}
