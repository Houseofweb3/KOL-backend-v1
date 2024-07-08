import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../auth/User.entity';
import { Option } from '../questionaries/Option.entity';

@Entity()
export class UserReferencePriority {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, user => user.userReferencePriorities)
  user!: User;

  @Column()
  referenceName!: string;

  @Column('int')
  referenceCount!: number;

  @ManyToOne(() => Option)
  selectedOption!: Option;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
