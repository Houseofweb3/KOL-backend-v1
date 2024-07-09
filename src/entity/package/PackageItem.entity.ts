import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, JoinColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Package } from './Package.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class PackageItem extends BaseModel {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  media!: string;

  @Column()
  format!: string;

  @Column()
  monthlyTraffic!: string;

  @Column()
  turnAroundTime!: string;

  @Column()
  createdBy!: string;

  @Column()
  updatedBy!: string;

  @ManyToOne(() => Package, pkg => pkg.packageItems)
  package!: Package; 
    packageCartItems: any;
}
