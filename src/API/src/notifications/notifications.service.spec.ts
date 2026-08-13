import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import {
  NEW_DATASET_APPROVED_JOB,
  NOTIFICATION_JOB_OPTIONS,
  NOTIFICATIONS_QUEUE,
} from './notifications.constants';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const queueMock = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    queueMock.add.mockReset();
    queueMock.add.mockResolvedValue({ id: 'job-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getQueueToken(NOTIFICATIONS_QUEUE),
          useValue: queueMock,
        },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('enqueues a new-dataset job with retry options', async () => {
    await service.enqueueNewDatasetNotification('ds-1', 'Malaria survey');

    expect(queueMock.add).toHaveBeenCalledWith(
      NEW_DATASET_APPROVED_JOB,
      { datasetId: 'ds-1', datasetTitle: 'Malaria survey' },
      NOTIFICATION_JOB_OPTIONS,
    );
    expect(NOTIFICATION_JOB_OPTIONS.attempts).toBeGreaterThan(1);
  });
});
