import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/User.entity';
import { Question } from '../questionaries/Question.entity';
import { Option } from '../questionaries/Option.entity';

@Entity()
export class UserSelections {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, user => user.userSelections)
  user!: User;

  @ManyToOne(() => Question)
  question!: Question;

  @ManyToOne(() => Option)
  selectedOption!: Option;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
