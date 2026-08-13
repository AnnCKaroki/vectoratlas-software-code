import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunicationLog } from './entities/communication-log.entity';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { CommunicationSentStatus } from '../../../src/commonTypes';
import {
  RestPaginatedResult,
  toPaginatedResult,
} from '../../pagination/rest-pagination';

@Injectable()
export class CommunicationLogService {
  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(CommunicationLog)
    private communicationLogRepository: Repository<CommunicationLog>,
  ) {}

  async create(communicationLog: CommunicationLog) {
    const res = await this.communicationLogRepository.save(communicationLog);
    return res;
  }

  async upsert(communicationLog: CommunicationLog) {
    const res = await this.communicationLogRepository.save(communicationLog);
    return res;
  }

  async getCommunications() {
    return await this.communicationLogRepository.find({
      order: {
        modified: 'DESC',
      },
    });
  }

  async getCommunicationsPaginated(
    skip: number,
    take: number,
  ): Promise<RestPaginatedResult<CommunicationLog>> {
    const [items, total] = await this.communicationLogRepository.findAndCount({
      order: {
        modified: 'DESC',
      },
      skip,
      take,
    });
    return toPaginatedResult(items, total, skip, take);
  }

  async getCommunicationsBySentStatus(sentStatus: CommunicationSentStatus) {
    return await this.communicationLogRepository.find({
      where: { sent_status: sentStatus },
      order: {
        modified: 'DESC',
      },
    });
  }

  async getCommunication(id: string) {
    return await this.communicationLogRepository.findOne({ where: { id } });
  }

  async update(id: string, communicationLog: CommunicationLog) {
    const exists = await this.getCommunication(id);
    if (exists) {
      return await this.communicationLogRepository.save(communicationLog);
    }
    return null;
  }

  async updateSentStatus(
    id: string,
    sentStatus: CommunicationSentStatus,
    errorDescription: string = null,
  ) {
    const log = await this.getCommunication(id);
    if (!log) {
      throw new NotFoundException(`Communication log not found: ${id}`);
    }

    // Only allow updating sent status when current status is PENDING
    if (log.sent_status !== CommunicationSentStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update sent status for log ${id} because it is not in PENDING state`,
      );
    }

    let res = null;
    switch (sentStatus) {
      case CommunicationSentStatus.SENT:
        log.sent_status = CommunicationSentStatus.SENT;
        log.sent_date = new Date();
        res = await this.communicationLogRepository.save(log);
        break;

      case CommunicationSentStatus.FAILED:
        log.sent_status = CommunicationSentStatus.FAILED;
        log.error_description = errorDescription;
        res = await this.communicationLogRepository.save(log);
        break;

      default:
        break;
    }
    return await res;
  }

  async remove(id: string) {
    const log = await this.getCommunication(id);
    if (log) {
      return await this.communicationLogRepository.remove(log);
    }
    return null;
  }
}
