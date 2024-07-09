import {
    Index,
    Entity,
    Column,
    PrimaryGeneratedColumn
} from 'typeorm';

@Entity()
export class OnboardingQuestion {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ default: true })
    isRequired!: boolean;

    @Index({ unique: true })
    @Column({ type: 'int', default: 0 })
    order!: number;
}
