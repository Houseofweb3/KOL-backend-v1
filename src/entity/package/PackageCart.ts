import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany,UpdateDateColumn } from 'typeorm';
import { User } from '../auth/User';
import { PackageCartItem } from './PackageCartItem';

@Entity()
export class PackageCart {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, user => user.packageCart)
  user!: User;

  @OneToMany(() => PackageCartItem, (item) => item.packageCart, { cascade: true, onDelete: 'CASCADE' })
  packageCartItem!: PackageCartItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
    items: any;
  
}
