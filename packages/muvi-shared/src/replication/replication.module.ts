import { Module } from '@nestjs/common';
import { DBService } from './service/db.service';
import { ReplicationService } from './service/replication.service';

@Module({
  imports: [],
  providers: [ReplicationService, DBService],
  exports: [ReplicationService],
})
export class ReplicationModule {}
