import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType, repositoryMockFactory } from 'src/mocks';
import { Repository } from 'typeorm';
import { NotificationPreferenceType } from '../../commonTypes';
import { EmailRegistry } from './entities/email-registry.entity';
import { RecipientSelectionService } from './recipient-selection.service';

describe('RecipientSelectionService', () => {
  let service: RecipientSelectionService;
  let emailRegistryRepositoryMock: MockType<Repository<EmailRegistry>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipientSelectionService,
        {
          provide: getRepositoryToken(EmailRegistry),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<RecipientSelectionService>(RecipientSelectionService);
    emailRegistryRepositoryMock = module.get(getRepositoryToken(EmailRegistry));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findEligibleRecipients', () => {
    it('queries verified recipients opted in for new dataset notifications', async () => {
      emailRegistryRepositoryMock.find = jest.fn().mockResolvedValue([]);

      await service.findEligibleRecipients(
        NotificationPreferenceType.NEW_DATASET,
      );

      expect(emailRegistryRepositoryMock.find).toHaveBeenCalledWith({
        where: {
          is_verified: true,
          is_new_dataset_notification_enabled: true,
        },
        order: { email: 'ASC' },
      });
    });

    it('queries verified recipients opted in for news notifications', async () => {
      emailRegistryRepositoryMock.find = jest.fn().mockResolvedValue([]);

      await service.findEligibleRecipients(NotificationPreferenceType.NEWS);

      expect(emailRegistryRepositoryMock.find).toHaveBeenCalledWith({
        where: {
          is_verified: true,
          is_news_notification_enabled: true,
        },
        order: { email: 'ASC' },
      });
    });

    it('does not use news preference when selecting new dataset recipients', async () => {
      emailRegistryRepositoryMock.find = jest.fn().mockResolvedValue([]);

      await service.findEligibleRecipients(
        NotificationPreferenceType.NEW_DATASET,
      );

      const [{ where }] = (emailRegistryRepositoryMock.find as jest.Mock).mock
        .calls[0];
      expect(where).not.toHaveProperty('is_news_notification_enabled');
      expect(where).toMatchObject({
        is_verified: true,
        is_new_dataset_notification_enabled: true,
      });
    });

    it('does not use dataset preference when selecting news recipients', async () => {
      emailRegistryRepositoryMock.find = jest.fn().mockResolvedValue([]);

      await service.findEligibleRecipients(NotificationPreferenceType.NEWS);

      const [{ where }] = (emailRegistryRepositoryMock.find as jest.Mock).mock
        .calls[0];
      expect(where).not.toHaveProperty('is_new_dataset_notification_enabled');
      expect(where).toMatchObject({
        is_verified: true,
        is_news_notification_enabled: true,
      });
    });

    it('always requires is_verified true (unverified excluded by query)', async () => {
      emailRegistryRepositoryMock.find = jest.fn().mockResolvedValue([]);

      await service.findEligibleRecipients(
        NotificationPreferenceType.NEW_DATASET,
      );

      expect(
        (emailRegistryRepositoryMock.find as jest.Mock).mock.calls[0][0].where,
      ).toEqual(expect.objectContaining({ is_verified: true }));
    });

    it('returns repository rows unchanged', async () => {
      const rows = [
        { id: '1', email: 'a@example.com' },
        { id: '2', email: 'b@example.com' },
      ] as EmailRegistry[];
      emailRegistryRepositoryMock.find = jest.fn().mockResolvedValue(rows);

      const result = await service.findEligibleRecipients(
        NotificationPreferenceType.NEW_DATASET,
      );

      expect(result).toBe(rows);
    });

    it('returns an empty list when no recipients match', async () => {
      emailRegistryRepositoryMock.find = jest.fn().mockResolvedValue([]);

      const result = await service.findEligibleRecipients(
        NotificationPreferenceType.NEWS,
      );

      expect(result).toEqual([]);
    });

    it('fails closed for an unsupported notification type', async () => {
      emailRegistryRepositoryMock.find = jest.fn();

      await expect(
        service.findEligibleRecipients(
          'UNKNOWN' as NotificationPreferenceType,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(emailRegistryRepositoryMock.find).not.toHaveBeenCalled();
    });
  });
});
