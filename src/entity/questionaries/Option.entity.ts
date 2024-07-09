import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Question } from './Question.entity';

import { TimestampedEntity } from '../../utils/baseEntities/TimestampedEntity';

@Entity()
export class Option extends TimestampedEntity {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Question, question => question.options)
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column()
  text!: string;

  @Column({ nullable: true })
  reference?: string;

  @Column()
  createdBy!: string;

  @Column()
  updatedBy!: string;
}
