import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  NEW_DATASET_APPROVED_JOB,
  NOTIFICATION_JOB_OPTIONS,
  NOTIFICATIONS_QUEUE,
} from './notifications.constants';

export type NewDatasetApprovedJobData = {
  datasetId: string;
  datasetTitle: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue,
  ) {}

  /**
   * Enqueue a mailing-list notification for a newly approved dataset.
   * Retries are configured here so the processor can focus on send + logging.
   */
  async enqueueNewDatasetNotification(
    datasetId: string,
    datasetTitle: string,
  ): Promise<void> {
    const jobData: NewDatasetApprovedJobData = { datasetId, datasetTitle };
    const job = await this.notificationsQueue.add(
      NEW_DATASET_APPROVED_JOB,
      jobData,
      NOTIFICATION_JOB_OPTIONS,
    );
    this.logger.log(
      `Queued ${NEW_DATASET_APPROVED_JOB} job ${job.id} for dataset ${datasetId}`,
    );
  }
}
