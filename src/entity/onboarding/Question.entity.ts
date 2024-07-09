import {
  Entity,
  Column,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';

import { Option } from './Option.entity';
import { OnboardingQuestion } from './OnboardingQuestion';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TEXT = 'text',
}

@Entity()
export class Question extends BaseModel {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    text!: string;

    @Column({
      type: "enum",
      enum: QuestionType,
      default: QuestionType.SINGLE_CHOICE,
    })
    type!: QuestionType;

    @Column({ nullable: true })
    description?: string;

    @OneToMany(() => Option, option => option.question)
    options!: Option[];

    @OneToMany(() => OnboardingQuestion, onboardingQuestion => onboardingQuestion.question)
    onboardingQuestions!: OnboardingQuestion[];
}
