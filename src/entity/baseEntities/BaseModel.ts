import {
    Column,
    BaseEntity,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
  
export abstract class BaseModel extends BaseEntity {
    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ type: 'timestamp', nullable: true })
    deletedAt?: Date;
}
