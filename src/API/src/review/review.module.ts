import { HttpModule } from '@nestjs/axios';
import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Dataset } from 'src/db/shared/entities/dataset.entity';
import { UploadedDatasetModule } from 'src/db/uploaded-dataset/uploaded-dataset.module';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { SharedModule } from 'src/db/shared/shared.module';

@Module({
  controllers: [ReviewController],
  providers: [
    ReviewService,
    Logger,
  ],
  imports: [
    HttpModule,
    SharedModule,
    TypeOrmModule.forFeature([Dataset]),
    AuthModule,
    UploadedDatasetModule,
  ],
  exports: [ReviewService],
})
export class ReviewModule {}
