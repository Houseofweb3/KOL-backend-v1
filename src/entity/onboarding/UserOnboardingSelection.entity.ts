import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Question } from './Question.entity';
import { Option } from './Option.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class UserOnboardingSelection extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // TODO: Add foreign key to User module.

  @ManyToOne(() => Question)
  question!: Question;

  @ManyToOne(() => Option)
  selectedOption!: Option;
}
