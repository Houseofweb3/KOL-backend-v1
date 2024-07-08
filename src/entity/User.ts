import "reflect-metadata";
import bcrypt from 'bcryptjs';
import { 
    Index,
    Entity,
    Column,
    BeforeInsert,
    BeforeUpdate,
    PrimaryGeneratedColumn
} from 'typeorm';

import { TimestampedEntity } from '../utils/baseEntities/TimestampedEntity';

enum UserType {
    Company = 'COMPANY',
    Admin = 'ADMIN',
}

@Entity()
export class User extends TimestampedEntity {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Index()
    @Column({ unique: true })
    email!: string;

    @Column({ select: false })
    password?: string;

    @Column({ nullable: true })
    firstname?: string;

    @Column({ nullable: true })
    lastname?: string;

    @Column({ type: 'enum', enum: UserType, default: UserType.Company })
    userType!: UserType;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword(): Promise<void> {
        if (this.password) {
          this.password = await bcrypt.hash(this.password, 10);
        }
    }
}
