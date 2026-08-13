import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/user_role/roles.guard';
import { Roles } from 'src/auth/user_role/roles.decorator';
import { Role } from 'src/auth/user_role/role.enum';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';

@Controller('notifications')
export class NotificationsController {
  constructor(@InjectQueue(NOTIFICATIONS_QUEUE) private readonly notificationsQueue: Queue) {}

  @UseGuards(AuthGuard('va'), RolesGuard)
  @Roles(Role.Admin)
  @Get('jobs')
  async listJobs() {
    const types = ['waiting', 'active', 'delayed', 'failed', 'completed'];
    const jobs = await this.notificationsQueue.getJobs(types as any);
    return jobs.map((j) => ({
      id: j.id,
      name: j.name,
      data: j.data,
      timestamp: j.timestamp,
      processedOn: j.processedOn,
      finishedOn: j.finishedOn,
      attemptsMade: j.attemptsMade,
      failedReason: (j as any).failedReason,
      progress: (j as any).progress,
    }));
  }
}
