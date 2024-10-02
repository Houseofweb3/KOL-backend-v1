import { Entity, PrimaryGeneratedColumn, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { Question } from './Question.entity';
import { Option } from './Option.entity';
import { User } from '../auth/User.entity';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class UserOnboardingSelection extends BaseModel {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => User, (user) => user.userSelections)
    user!: User;

    @ManyToOne(() => Question)
    question!: Question;

    @ManyToMany(() => Option)
    @JoinTable()
    selectedOption!: Option[];
}
