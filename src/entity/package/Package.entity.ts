import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn , CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Admin } from '../auth/Admin.entity';
import { PackageItem } from './PackageItem.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class Package extends BaseModel{

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Admin, (admin) => admin.package)
  @JoinColumn({ name: 'admin_id' })
  admin!: Admin;
  
  @Column()
  header!: string;

  @Column('float')
  cost!: number;

  @Column('text', { array: true })
  text!: string[];

  @Column()
  createdBy!: string;

  @Column()
  updatedBy!: string;

  @OneToMany(() => PackageItem, (packageItem) => packageItem.package)
  packageItems!: PackageItem[];
}
