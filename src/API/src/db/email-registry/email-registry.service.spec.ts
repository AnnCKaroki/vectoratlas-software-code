import {
  BadRequestException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailService } from 'src/email/email.service';
import { MockType, repositoryMockFactory } from 'src/mocks';
import { Repository } from 'typeorm';
import { EmailRegistry } from './entities/email-registry.entity';
import { EmailRegistryService } from './email-registry.service';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'verification-code-123'),
}));

describe('EmailRegistryService', () => {
  let service: EmailRegistryService;
  let emailRegistryRepositoryMock: MockType<Repository<EmailRegistry>>;
  let emailServiceMock: {
    sendEmail: jest.Mock;
  };

  beforeEach(async () => {
    emailServiceMock = {
      sendEmail: jest.fn().mockResolvedValue(true),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailRegistryService,
        { provide: EmailService, useValue: emailServiceMock },
        {
          provide: getRepositoryToken(EmailRegistry),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    service = module.get<EmailRegistryService>(EmailRegistryService);
    emailRegistryRepositoryMock = module.get(getRepositoryToken(EmailRegistry));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('returns items, total, and hasMore using skip/take', async () => {
      const rows = [{ email: 'a@example.com' }] as EmailRegistry[];
      emailRegistryRepositoryMock.findAndCount = jest
        .fn()
        .mockResolvedValue([rows, 25]);

      const result = await service.findAllPaginated(0, 20);

      expect(emailRegistryRepositoryMock.findAndCount).toHaveBeenCalledWith({
        order: { email: 'ASC' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({
        items: rows,
        total: 25,
        hasMore: true,
      });
    });

    it('sets hasMore false when page covers remaining items', async () => {
      emailRegistryRepositoryMock.findAndCount = jest
        .fn()
        .mockResolvedValue([[], 10]);

      const result = await service.findAllPaginated(0, 20);

      expect(result.hasMore).toBe(false);
    });
  });

  describe('upsert', () => {
    it('rejects missing email', async () => {
      await expect(service.upsert({})).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('creates a new entry when email is unknown', async () => {
      emailRegistryRepositoryMock.findOne = jest.fn().mockResolvedValue(null);
      emailRegistryRepositoryMock.create = jest
        .fn()
        .mockImplementation((entity) => entity);
      emailRegistryRepositoryMock.save = jest
        .fn()
        .mockImplementation((entity) => entity);

      const result = await service.upsert({
        email: 'User@Example.com',
        is_verified: true,
      });

      expect(emailRegistryRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(emailRegistryRepositoryMock.create).toHaveBeenCalled();
      expect(result.email).toBe('user@example.com');
    });

    it('updates an existing entry by email', async () => {
      const existing = {
        id: '1',
        email: 'user@example.com',
        is_news_notification_enabled: false,
      } as EmailRegistry;
      emailRegistryRepositoryMock.findOne = jest
        .fn()
        .mockResolvedValue(existing);
      emailRegistryRepositoryMock.save = jest
        .fn()
        .mockImplementation((entity) => entity);

      const result = await service.upsert({
        email: 'user@example.com',
        is_news_notification_enabled: true,
      });

      expect(result.is_news_notification_enabled).toBe(true);
      expect(result.news_last_modified_at).toBeInstanceOf(Date);
      expect(emailRegistryRepositoryMock.create).not.toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('creates a new entry, generates a code, sets expiry, and sends a verification email', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      emailRegistryRepositoryMock.findOne = jest.fn().mockResolvedValue(null);
      emailRegistryRepositoryMock.create = jest
        .fn()
        .mockImplementation((entity) => entity);
      emailRegistryRepositoryMock.save = jest
        .fn()
        .mockImplementation((entity) => entity);

      const result = await service.subscribe({
        email: 'User@Example.com',
        isNewsEnabled: true,
        isNewDatasetEnabled: false,
      });

      expect(emailRegistryRepositoryMock.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(emailServiceMock.sendEmail).toHaveBeenCalledWith(
        ['user@example.com'],
        [],
        'Verify your email subscription',
        expect.stringContaining('/email-registry/verify?code='),
      );
      expect(emailRegistryRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
          is_news_notification_enabled: true,
          is_new_dataset_notification_enabled: false,
          is_verified: false,
          verification_code: 'verification-code-123',
          code_expires_at: new Date(1_000_000 + 24 * 60 * 60 * 1000),
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Verification email sent',
      });

      nowSpy.mockRestore();
    });

    it('updates an existing entry when the email already exists', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(2_000_000);
      const existing = {
        id: '1',
        email: 'user@example.com',
        is_verified: true,
        is_news_notification_enabled: false,
        is_new_dataset_notification_enabled: false,
      } as EmailRegistry;
      emailRegistryRepositoryMock.findOne = jest
        .fn()
        .mockResolvedValue(existing);
      emailRegistryRepositoryMock.save = jest
        .fn()
        .mockImplementation((entity) => entity);

      await service.subscribe({
        email: 'User@Example.com',
        isNewsEnabled: false,
        isNewDatasetEnabled: true,
      });

      expect(existing.email).toBe('user@example.com');
      expect(existing.is_verified).toBe(false);
      expect(existing.verification_code).toBe('verification-code-123');
      expect(existing.code_expires_at).toEqual(
        new Date(2_000_000 + 24 * 60 * 60 * 1000),
      );
      expect(existing.is_new_dataset_notification_enabled).toBe(true);

      nowSpy.mockRestore();
    });
  });

  describe('verify', () => {
    it('throws when the code is missing', async () => {
      await expect(service.verify(' ')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws when the code is unknown', async () => {
      emailRegistryRepositoryMock.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.verify('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('clears the verification code and marks the entry verified', async () => {
      const existing = {
        id: '1',
        email: 'user@example.com',
        verification_code: 'abc123',
        code_expires_at: new Date(Date.now() + 60 * 1000),
        is_verified: false,
      } as EmailRegistry;
      emailRegistryRepositoryMock.findOne = jest
        .fn()
        .mockResolvedValue(existing);
      emailRegistryRepositoryMock.save = jest
        .fn()
        .mockImplementation((entity) => entity);

      const result = await service.verify('abc123');

      expect(result).toEqual({
        success: true,
        message: 'Email address verified',
      });
      expect(existing.is_verified).toBe(true);
      expect(existing.verification_code).toBeNull();
      expect(existing.code_expires_at).toBeNull();
    });

    it('throws when the code is expired', async () => {
      const expired = {
        id: '1',
        email: 'user@example.com',
        verification_code: 'expired-code',
        code_expires_at: new Date(Date.now() - 60 * 1000),
        is_verified: false,
      } as EmailRegistry;
      emailRegistryRepositoryMock.findOne = jest
        .fn()
        .mockResolvedValue(expired);

      await expect(service.verify('expired-code')).rejects.toBeInstanceOf(
        GoneException,
      );
    });
  });

  describe('remove', () => {
    it('throws when entry is missing', async () => {
      emailRegistryRepositoryMock.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes an existing entry', async () => {
      const existing = { id: '1', email: 'a@b.com' } as EmailRegistry;
      emailRegistryRepositoryMock.findOne = jest
        .fn()
        .mockResolvedValue(existing);
      emailRegistryRepositoryMock.remove = jest
        .fn()
        .mockResolvedValue(existing);

      await expect(service.remove('1')).resolves.toEqual(existing);
      expect(emailRegistryRepositoryMock.remove).toHaveBeenCalledWith(existing);
    });
  });
});
