import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Question } from './question.entity';
import { Option } from './option.entity';
import { User } from '../auth/user.entity'

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class UserOnboardingSelection extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // TODO: Add foreign key to User module. (Completed)
  @ManyToOne(() => User, user => user.userSelections)
  user!: User;

  @ManyToOne(() => Question)
  question!: Question;

  @ManyToOne(() => Option)
  selectedOption!: Option;
}
