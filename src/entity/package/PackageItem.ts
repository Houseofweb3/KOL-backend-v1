import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, JoinColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Package } from './Package';

@Entity()
export class PackageItem {

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Package, pkg => pkg.packageItems)
  @JoinColumn({ name: 'admin_id' })
  package!: Package; 
    packageCartItems: any;
}
