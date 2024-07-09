import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/User.entity';

import { TimestampedEntity } from '../../utils/baseEntities/TimestampedEntity';

@Entity()
export class UserSelectedNiche extends TimestampedEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, user => user.selectedNiches)
  user!: User;

  @Column("simple-array")
  niche_name!: string[];
}
