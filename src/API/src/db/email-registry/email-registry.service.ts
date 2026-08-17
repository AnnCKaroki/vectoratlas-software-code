import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Repository } from 'typeorm';
import {
  RestPaginatedResult,
  toPaginatedResult,
} from '../../pagination/rest-pagination';
import { EmailService } from '../../email/email.service';
import { EmailRegistry } from './entities/email-registry.entity';
import { SubscribeDto } from './dto/subscribe.dto';

const VERIFICATION_CODE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class EmailRegistryService {
  constructor(
    @InjectRepository(EmailRegistry)
    private readonly emailRegistryRepository: Repository<EmailRegistry>,
    private readonly emailService: EmailService,
  ) {}

  async findAllPaginated(
    skip: number,
    take: number,
  ): Promise<RestPaginatedResult<EmailRegistry>> {
    const [items, total] = await this.emailRegistryRepository.findAndCount({
      order: { email: 'ASC' },
      skip,
      take,
    });
    return toPaginatedResult(items, total, skip, take);
  }

  async findOne(id: string): Promise<EmailRegistry | null> {
    return this.emailRegistryRepository.findOne({ where: { id } });
  }

  /**
   * Create or update by unique email. Preference timestamps are refreshed
   * when the corresponding opt-in flag is present on the payload.
   */
  async upsert(payload: Partial<EmailRegistry>): Promise<EmailRegistry> {
    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('email is required');
    }

    let entry = await this.emailRegistryRepository.findOne({
      where: { email },
    });

    if (!entry) {
      entry = this.emailRegistryRepository.create({
        ...payload,
        email,
      });
    } else {
      Object.assign(entry, { ...payload, email });
    }

    if (payload.is_news_notification_enabled !== undefined) {
      entry.news_last_modified_at = new Date();
    }
    if (payload.is_new_dataset_notification_enabled !== undefined) {
      entry.new_dataset_last_modified_at = new Date();
    }

    return this.emailRegistryRepository.save(entry);
  }

  async subscribe(
    payload: SubscribeDto,
  ): Promise<{ success: boolean; message: string }> {
    const email = payload.email.trim().toLowerCase();
    const verificationCode = uuidv4();
    const codeExpiresAt = new Date(Date.now() + VERIFICATION_CODE_TTL_MS);

    let entry = await this.emailRegistryRepository.findOne({
      where: { email },
    });

    if (!entry) {
      entry = this.emailRegistryRepository.create({
        email,
        is_news_notification_enabled: payload.isNewsEnabled,
        is_new_dataset_notification_enabled: payload.isNewDatasetEnabled,
      });
    } else {
      Object.assign(entry, {
        email,
        is_news_notification_enabled: payload.isNewsEnabled,
        is_new_dataset_notification_enabled: payload.isNewDatasetEnabled,
      });
    }

    entry.is_verified = false;
    entry.verification_code = verificationCode;
    entry.code_expires_at = codeExpiresAt;

    const savedEntry = await this.emailRegistryRepository.save(entry);
    const verificationBaseUrl =
      process.env.EMAIL_VERIFICATION_BASE_URL ??
      process.env.API_BASE_URL ??
      'http://localhost:3001';
    const verificationLink = new URL(
      '/email-registry/verify',
      verificationBaseUrl,
    );
    verificationLink.searchParams.set('code', verificationCode);

    await this.emailService.sendEmail(
      [savedEntry.email],
      [],
      'Verify your email subscription',
      `
        <p>Thanks for subscribing to Vector Atlas updates.</p>
        <p>Please verify your email address by clicking this link:</p>
        <p><a href="${verificationLink.toString()}">${verificationLink.toString()}</a></p>
        <p>This link expires in 24 hours.</p>
      `,
    );

    return {
      success: true,
      message: 'Verification email sent',
    };
  }

  async verify(code: string): Promise<{ success: boolean; message: string }> {
    const trimmedCode = code?.trim();
    if (!trimmedCode) {
      throw new BadRequestException('verification code is required');
    }

    const entry = await this.emailRegistryRepository.findOne({
      where: { verification_code: trimmedCode },
    });

    if (!entry) {
      throw new NotFoundException('Invalid or already-used verification code');
    }

    if (entry.code_expires_at && entry.code_expires_at.getTime() < Date.now()) {
      throw new GoneException('Verification code has expired');
    }

    entry.is_verified = true;
    entry.verification_code = null;
    entry.code_expires_at = null;

    await this.emailRegistryRepository.save(entry);

    return {
      success: true,
      message: 'Email address verified',
    };
  }

  async remove(id: string): Promise<EmailRegistry> {
    const entry = await this.findOne(id);
    if (!entry) {
      throw new NotFoundException(`Email registry entry not found: ${id}`);
    }
    return this.emailRegistryRepository.remove(entry);
  }
}
