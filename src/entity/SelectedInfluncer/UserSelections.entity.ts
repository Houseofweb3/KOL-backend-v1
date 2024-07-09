import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/User.entity';
import { Question } from '../questionaries/Question.entity';
import { Option } from '../questionaries/Option.entity';

import { TimestampedEntity } from '../../utils/baseEntities/TimestampedEntity';

@Entity()
export class UserSelections extends TimestampedEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, user => user.userSelections)
  user!: User;

  @ManyToOne(() => Question)
  question!: Question;

  @ManyToOne(() => Option)
  selectedOption!: Option;
}
