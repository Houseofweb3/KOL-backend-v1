import { Entity, Column, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

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

  @ManyToOne(() => Package, pkg => pkg.packageItems)
  package!: Package; 
    packageCartItems: any;
}
