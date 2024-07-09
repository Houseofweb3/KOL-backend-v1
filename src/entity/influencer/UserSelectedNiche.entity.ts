import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/User.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class UserSelectedNiche extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, user => user.selectedNiches)
  user!: User;

  @Column("simple-array")
  niche_name!: string[];
}
