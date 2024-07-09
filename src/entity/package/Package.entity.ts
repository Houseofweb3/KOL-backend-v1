import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn , CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Admin } from '../auth/Admin.entity';
import { PackageItem } from './PackageItem.entity';

import { TimestampedEntity } from '../../utils/baseEntities/TimestampedEntity';

@Entity()
export class Package extends TimestampedEntity{

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
