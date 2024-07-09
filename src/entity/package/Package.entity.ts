import {
  Entity,
  Column,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';

// import { User } from '../auth/User.entity';
import { PackageItem } from './PackageItem.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class Package extends BaseModel{

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  // @ManyToOne(() => User, (admin) => admin.package)
  // admin!: User;
  
  @Column()
  header!: string;

  @Column('float')
  cost!: number;

  @Column('text', { array: true })
  text!: string[];

  @OneToMany(() => PackageItem, (packageItem) => packageItem.package)
  packageItems!: PackageItem[];
}
