import {
    Index,
    Entity,
    Column,
    ManyToOne,
    PrimaryGeneratedColumn
} from 'typeorm';

import { Question } from './Question.entity';

@Entity()
export class OnboardingQuestion {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ default: true })
    isRequired!: boolean;

    @Index({ unique: true })
    @Column({ type: 'int', default: 0 })
    order!: number;

    @ManyToOne(() => Question, question => question.onboardingQuestions, { eager: true })
    question!: Question;
}
