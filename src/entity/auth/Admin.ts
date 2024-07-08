import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Question } from '../questionaries/Question';
import { Package } from '../package/Package';

@Entity()
export class Admin {
  @PrimaryColumn()
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  password?: string;

  @Column({ nullable: true })
  fullname?: string;

  @Column({ default: 'active' })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => Question, question => question.admin)
  questions!: Question[];

  @OneToMany(() => Package, pkg => pkg.admin)
  package!: Package[];
}
