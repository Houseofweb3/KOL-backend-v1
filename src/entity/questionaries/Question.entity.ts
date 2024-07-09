import { Entity, PrimaryGeneratedColumn, Column, OneToMany, JoinColumn, CreateDateColumn, ManyToOne, UpdateDateColumn } from 'typeorm';
import { Admin } from '../auth/Admin.entity';
import { Option } from './Option.entity';

import { TimestampedEntity } from '../../utils/baseEntities/TimestampedEntity';

@Entity()
export class Question extends TimestampedEntity {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  adminId!: string;

  @Column()
  text!: string;

  @Column()
  createdBy!: string;

  @Column()
  updatedBy!: string;

  @ManyToOne(() => Admin, admin => admin.questions)
  @JoinColumn({ name: 'admin_id' })
  admin!: Admin;

  @OneToMany(() => Option, option => option.question)
  options!: Option[];
}
