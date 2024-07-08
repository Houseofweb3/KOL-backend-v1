import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn , CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Admin } from '../auth/Admin';
import { PackageItem } from './PackageItem';

@Entity()
export class Package {

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => PackageItem, (packageItem) => packageItem.package)
  packageItems!: PackageItem[];
}
