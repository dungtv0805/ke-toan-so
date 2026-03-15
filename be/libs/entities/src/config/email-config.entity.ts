import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('email_config')
export class EmailConfig extends BaseEntity {
  @Column()
  smtpHost: string;

  @Column()
  smtpPort: number;

  @Column({ default: false })
  smtpSecure: boolean;

  @Column()
  smtpUser: string;

  @Column()
  smtpPass: string;

  @Column({ nullable: true })
  smtpFrom: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface EmailConfigEntities {
  EmailConfig: typeof EmailConfig;
}

declare module '../entities' {
  interface Entities extends EmailConfigEntities {}
}
