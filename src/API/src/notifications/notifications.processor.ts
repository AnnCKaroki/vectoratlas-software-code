import { Injectable, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { ArrayContains, Repository } from 'typeorm';
import {
  CommunicationChannelType,
  CommunicationSentStatus,
  NotificationPreferenceType,
} from '../commonTypes';
import { CommunicationLog } from '../db/communication-log/entities/communication-log.entity';
import { CommunicationLogService } from '../db/communication-log/communication-log.service';
import { RecipientSelectionService } from '../db/email-registry/recipient-selection.service';
import { EmailService } from '../email/email.service';
import {
  NEW_DATASET_APPROVED_JOB,
  NOTIFICATIONS_QUEUE,
} from './notifications.constants';
import { NewDatasetApprovedJobData } from './notifications.service';

@Injectable()
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly recipientSelectionService: RecipientSelectionService,
    private readonly emailService: EmailService,
    private readonly communicationLogService: CommunicationLogService,
    @InjectRepository(CommunicationLog)
    private readonly communicationLogRepository: Repository<CommunicationLog>,
  ) {
    super();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    this.logger.error(
      `Notifications job failed: ${job?.id} — ${err.message}`,
    );
  }

  async process(job: Job<NewDatasetApprovedJobData>): Promise<void> {
    if (job.name !== NEW_DATASET_APPROVED_JOB) {
      this.logger.warn(`Ignoring unknown notifications job: ${job.name}`);
      return;
    }

    const { datasetId, datasetTitle } = job.data;
    this.logger.log(
      `Processing ${NEW_DATASET_APPROVED_JOB} for dataset ${datasetId}`,
    );

    const recipients =
      await this.recipientSelectionService.findEligibleRecipients(
        NotificationPreferenceType.NEW_DATASET,
      );

    if (recipients.length === 0) {
      this.logger.log(
        `No eligible recipients for new-dataset notification (${datasetId})`,
      );
      return;
    }

    const subject = `New Dataset Available - ${datasetTitle}`;
    const message = this.buildNewDatasetMessage(datasetTitle);
    const failures: string[] = [];

    for (const recipient of recipients) {
      try {
        await this.sendAndLog({
          email: recipient.email,
          datasetId,
          subject,
          message,
        });
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to notify ${recipient.email} about dataset ${datasetId}: ${reason}`,
        );
        failures.push(recipient.email);
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `Failed to send new-dataset notification to ${failures.length} recipient(s): ${failures.join(', ')}`,
      );
    }
  }

  private buildNewDatasetMessage(datasetTitle: string): string {
    return `<div>
      <h2>New Dataset Available</h2>
      <p>A new dataset <b>${datasetTitle}</b> has been approved and is now available on Vector Atlas.</p>
      <p>Thanks,</p>
      <p>Vector Atlas</p>
      <p>Do not reply to this email. This is a system generated email</p>
    </div>`;
  }

  private async sendAndLog(params: {
    email: string;
    datasetId: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const { email, datasetId, subject, message } = params;

    const alreadySent = await this.communicationLogRepository.findOne({
      where: {
        message_type: NotificationPreferenceType.NEW_DATASET,
        reference_entity_name: datasetId,
        sent_status: CommunicationSentStatus.SENT,
        recipients: ArrayContains([email]),
      },
    });
    if (alreadySent) {
      this.logger.log(
        `Skipping ${email} for dataset ${datasetId} — already sent`,
      );
      return;
    }

    const comm = new CommunicationLog();
    comm.channel_type = CommunicationChannelType.EMAIL;
    comm.recipients = [email];
    comm.subject = subject;
    comm.message_type = NotificationPreferenceType.NEW_DATASET;
    comm.message = message;
    comm.sent_status = CommunicationSentStatus.PENDING;
    comm.sent_date = null;
    comm.reference_entity_type = 'UploadedDataset';
    comm.reference_entity_name = datasetId;

    try {
      await this.emailService.sendEmail(
        [email],
        [],
        subject,
        message,
        undefined,
        comm,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (comm.id) {
        await this.communicationLogService.updateSentStatus(
          comm.id,
          CommunicationSentStatus.FAILED,
          reason,
        );
      } else {
        comm.sent_status = CommunicationSentStatus.FAILED;
        comm.error_description = reason;
        await this.communicationLogService.upsert(comm);
      }
      throw error;
    }
  }
}
