import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('user_credentials')
export class UserCredential extends BaseEntity {
  @Column()
  userId: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  refreshToken?: string;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ default: true })
  isActive: boolean;
}

export interface UserCredentialEntities {
  UserCredential: typeof UserCredential;
}

declare module '../entities' {
  interface Entities extends UserCredentialEntities {}
}
