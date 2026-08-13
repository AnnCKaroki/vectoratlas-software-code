import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import {
  CommunicationSentStatus,
  NotificationPreferenceType,
} from '../commonTypes';
import { CommunicationLog } from '../db/communication-log/entities/communication-log.entity';
import { CommunicationLogService } from '../db/communication-log/communication-log.service';
import { RecipientSelectionService } from '../db/email-registry/recipient-selection.service';
import { EmailService } from '../email/email.service';
import { NEW_DATASET_APPROVED_JOB } from './notifications.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NewDatasetApprovedJobData } from './notifications.service';

describe('NotificationsProcessor', () => {
  let processor: NotificationsProcessor;
  let recipientSelectionService: { findEligibleRecipients: jest.Mock };
  let emailService: { sendEmail: jest.Mock };
  let communicationLogService: {
    updateSentStatus: jest.Mock;
    upsert: jest.Mock;
  };
  let communicationLogRepository: { findOne: jest.Mock };

  const makeJob = (
    data: NewDatasetApprovedJobData,
    name = NEW_DATASET_APPROVED_JOB,
  ): Job<NewDatasetApprovedJobData> =>
    ({ id: '1', name, data } as Job<NewDatasetApprovedJobData>);

  beforeEach(async () => {
    recipientSelectionService = {
      findEligibleRecipients: jest.fn(),
    };
    emailService = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };
    communicationLogService = {
      updateSentStatus: jest.fn(),
      upsert: jest.fn(),
    };
    communicationLogRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        {
          provide: RecipientSelectionService,
          useValue: recipientSelectionService,
        },
        { provide: EmailService, useValue: emailService },
        {
          provide: CommunicationLogService,
          useValue: communicationLogService,
        },
        {
          provide: getRepositoryToken(CommunicationLog),
          useValue: communicationLogRepository,
        },
      ],
    }).compile();

    processor = module.get(NotificationsProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('selects NEW_DATASET recipients and sends one email per recipient', async () => {
    recipientSelectionService.findEligibleRecipients.mockResolvedValue([
      { email: 'a@example.com' },
      { email: 'b@example.com' },
    ]);

    await processor.process(
      makeJob({ datasetId: 'ds-1', datasetTitle: 'Survey A' }),
    );

    expect(
      recipientSelectionService.findEligibleRecipients,
    ).toHaveBeenCalledWith(NotificationPreferenceType.NEW_DATASET);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      ['a@example.com'],
      [],
      'New Dataset Available - Survey A',
      expect.stringContaining('Survey A'),
      undefined,
      expect.objectContaining({
        message_type: NotificationPreferenceType.NEW_DATASET,
        reference_entity_name: 'ds-1',
        recipients: ['a@example.com'],
        sent_status: CommunicationSentStatus.PENDING,
      }),
    );
  });

  it('skips recipients that already have a SENT communication log', async () => {
    recipientSelectionService.findEligibleRecipients.mockResolvedValue([
      { email: 'a@example.com' },
    ]);
    communicationLogRepository.findOne.mockResolvedValue({ id: 'log-1' });

    await processor.process(
      makeJob({ datasetId: 'ds-1', datasetTitle: 'Survey A' }),
    );

    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  it('records FAILED status and throws when a send fails so Bull can retry', async () => {
    recipientSelectionService.findEligibleRecipients.mockResolvedValue([
      { email: 'a@example.com' },
    ]);
    emailService.sendEmail.mockImplementation(async (_e, _c, _t, _b, _f, log) => {
      log.id = 'log-fail';
      throw new Error('SMTP down');
    });

    await expect(
      processor.process(
        makeJob({ datasetId: 'ds-1', datasetTitle: 'Survey A' }),
      ),
    ).rejects.toThrow(/Failed to send new-dataset notification/);

    expect(communicationLogService.updateSentStatus).toHaveBeenCalledWith(
      'log-fail',
      CommunicationSentStatus.FAILED,
      'SMTP down',
    );
  });

  it('no-ops when there are no eligible recipients', async () => {
    recipientSelectionService.findEligibleRecipients.mockResolvedValue([]);

    await processor.process(
      makeJob({ datasetId: 'ds-1', datasetTitle: 'Survey A' }),
    );

    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
});
