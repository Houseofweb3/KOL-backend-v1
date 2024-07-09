import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, JoinColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Package } from './Package.entity';

import { TimestampedEntity } from '../../utils/baseEntities/TimestampedEntity';

@Entity()
export class PackageItem extends TimestampedEntity {

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
  @JoinColumn({ name: 'admin_id' })
  package!: Package; 
    packageCartItems: any;
}
