import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/user_role/roles.decorator';
import { Role } from 'src/auth/user_role/role.enum';
import { RolesGuard } from 'src/auth/user_role/roles.guard';
import { NotificationPreferenceType } from '../../commonTypes';
import { parsePaginationQuery } from '../../pagination/rest-pagination';
import { EmailRegistry } from './entities/email-registry.entity';
import { EmailRegistryService } from './email-registry.service';
import { RecipientSelectionService } from './recipient-selection.service';
import { SubscribeDto } from './dto/subscribe.dto';

@Controller('email-registry')
export class EmailRegistryController {
  constructor(
    private readonly emailRegistryService: EmailRegistryService,
    private readonly recipientSelectionService: RecipientSelectionService,
  ) {}

  @Post('subscribe')
  subscribe(@Body() body: SubscribeDto) {
    return this.emailRegistryService.subscribe(body);
  }

  @Get('verify')
  verify(@Query('code') code: string) {
    return this.emailRegistryService.verify(code);
  }

  /**
   * Admin: paginated list of all registry entries.
   */
  @UseGuards(AuthGuard('va'), RolesGuard)
  @Roles(Role.Admin)
  @Get()
  findAll(@Query('skip') skip?: string, @Query('take') take?: string) {
    const pagination = parsePaginationQuery(skip, take);
    return this.emailRegistryService.findAllPaginated(
      pagination.skip,
      pagination.take,
    );
  }

  /**
   * Eligible recipients for a notification type (verified + opted in).
   * Used for admin preview; notification jobs call RecipientSelectionService directly.
   */
  @UseGuards(AuthGuard('va'), RolesGuard)
  @Roles(Role.Admin)
  @Get('eligible')
  findEligible(
    @Query('notificationType') notificationType: NotificationPreferenceType,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const pagination = parsePaginationQuery(skip, take);
    return this.recipientSelectionService.findEligibleRecipientsPaginated(
      notificationType,
      pagination.skip,
      pagination.take,
    );
  }

  @UseGuards(AuthGuard('va'), RolesGuard)
  @Roles(Role.Admin)
  @Post()
  upsert(@Body() body: Partial<EmailRegistry>) {
    return this.emailRegistryService.upsert(body);
  }

  @UseGuards(AuthGuard('va'), RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.emailRegistryService.remove(id);
  }
}
