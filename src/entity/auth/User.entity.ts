import { Entity, Column, PrimaryColumn } from 'typeorm';

import { BaseModel } from '../../utils/baseEntities/BaseModel';

@Entity()
export class User extends BaseModel {
  @PrimaryColumn()
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: false })
  password?: string;

  @Column({ nullable: true })
  fullname?: string;

  // TODO: Add type of user
}
