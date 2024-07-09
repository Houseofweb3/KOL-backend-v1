import { Entity, Column, OneToMany, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from 'typeorm';

// import { Question } from '../questionaries/Question.entity';
// import { Package } from '../package/Package.entity';
// import { InfluencerPR } from '../influencer/InfluencerPR.entity'

import { TimestampedEntity } from '../../utils/baseEntities/TimestampedEntity';

@Entity()
export class Admin extends TimestampedEntity {
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





  // @OneToMany(() => Question, question => question.admin)
  // questions!: Question[];

  // @OneToMany(() => Package, pkg => pkg.admin)
  // package!: Package[];

  // @OneToMany(() => InfluencerPR, influencerPR => influencerPR.admin)
  // influencerPRs!: InfluencerPR[];
}
