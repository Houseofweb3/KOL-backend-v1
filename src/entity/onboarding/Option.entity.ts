import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';

import { Question } from './Question.entity';
import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class Option extends BaseModel {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column()
    text!: string;

    @ManyToOne(() => Question, question => question.options)
    question!: Question;
}
