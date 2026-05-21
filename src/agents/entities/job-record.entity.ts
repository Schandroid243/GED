import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { QueueName } from '../../common/queues/queue-names.enum';

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

@Entity('job_records')
@Index(['queueName', 'status'])      // pour les requêtes d'administration
@Index(['createdAt'])                // pour le cleanup CRON
export class JobRecord {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  jobId: string;                     // ID BullMQ (string)

  @Column({ type: 'varchar', length: 50 })
  queueName: QueueName;

  @Column({ type: 'varchar', length: 50 })
  jobName: string;

  @Column({ type: 'json' })
  data: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'],
    default: 'waiting',
  })
  status: JobStatus;

  @Column({ type: 'tinyint', default: 0 })
  attemptsMade: number;

  @Column({ type: 'varchar', length: 36, nullable: true })
  correlationId?: string;            // pour le tracing

  @Column({ type: 'text', nullable: true })
  failedReason?: string;

  @Column({ type: 'json', nullable: true })
  returnValue?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
