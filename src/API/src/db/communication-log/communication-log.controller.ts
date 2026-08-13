import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommunicationSentStatus } from '../../../src/commonTypes';
import { parsePaginationQuery } from '../../pagination/rest-pagination';
import { CommunicationLogService } from './communication-log.service';
import { CommunicationLog } from './entities/communication-log.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/user_role/roles.guard';
import { Roles } from 'src/auth/user_role/roles.decorator';
import { Role } from 'src/auth/user_role/role.enum';

@Controller('communication-log')
export class CommunicationLogController {
  constructor(
    private readonly communicationLogService: CommunicationLogService,
  ) {}

  @Post()
  create(@Body() communicationLog: CommunicationLog) {
    return this.communicationLogService.upsert(communicationLog);
  }

  @Get()
  findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    const pagination = parsePaginationQuery(skip, take);
    return this.communicationLogService.getCommunicationsPaginated(
      pagination.skip,
      pagination.take,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.communicationLogService.getCommunication(id);
  }

  @UseGuards(AuthGuard('va'), RolesGuard)
  @Roles(Role.Admin)
  @Patch(':id/sent-status')
  updateSentStatus(
    @Param('id') id: string,
    @Body()
    body: {
      sentStatus: CommunicationSentStatus;
      errorDescription?: string;
    },
  ) {
    return this.communicationLogService.updateSentStatus(
      id,
      body.sentStatus,
      body.errorDescription ?? null,
    );
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() communicationLog: CommunicationLog) {
    return this.communicationLogService.update(id, communicationLog);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.communicationLogService.remove(id);
  }
}
