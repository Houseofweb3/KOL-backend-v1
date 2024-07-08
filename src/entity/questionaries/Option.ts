import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Question } from './Question';

@Entity()
export class Option {

  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Question, question => question.options)
  question!: Question;

  @Column()
  text!: string;

  @Column({ nullable: true })
  reference?: string;

  @Column()
  createdBy!: string;

  @Column()
  updatedBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
