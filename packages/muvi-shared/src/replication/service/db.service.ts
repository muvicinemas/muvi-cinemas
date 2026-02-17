import { Injectable } from '@nestjs/common';
import { Client } from 'pg';
import { ICondition } from '../interface/condition.interface';
import { IConnectConfig } from '../interface/connect-config.interface';

@Injectable()
export class DBService {
  async initializeReplication(connect: Client): Promise<void> {
    const result = await this.runQuery(
      connect,
      `ALTER SYSTEM SET wal_level = logical;`,
    );
  }

  async checkPublicationIsExist(
    connect: Client,
    publicationName: string,
  ): Promise<boolean> {
    const result = await this.runQuery(
      connect,
      `select * from pg_catalog.pg_publication where pubname  = '${publicationName}';`,
    );
    return result.rows.length == 0 ? false : true;
  }

  async checkSubscriptionIsExist(
    connect: Client,
    subscriptionName: string,
  ): Promise<boolean> {
    const result = await this.runQuery(
      connect,
      `select * from pg_catalog.pg_subscription where subname  = '${subscriptionName}';`,
    );
    return result.rows.length == 0 ? false : true;
  }

  async createPublication(
    connect: Client,
    publicationName: string,
    tables: string[],
    publishType: string,
    publishConditions: ICondition[] = [],
  ): Promise<void> {
    await this.runQuery(
      connect,
      `CREATE PUBLICATION ${publicationName} FOR TABLE ${tables.join(',')} with (publish = '${publishType}');`,
    );
  }

  async dropPublication(
    connect: Client,
    publicationName: string,
  ): Promise<void> {
    await this.runQuery(connect, `DROP PUBLICATION ${publicationName}`);
  }

  async dropSubscription(
    connect: Client,
    subscriptionName: string,
    tables: string[],
    isTheSameCluster = false,
    publicationConnect: Client = null,
  ): Promise<void> {
    await this.runQuery(
      connect,
      `ALTER SUBSCRIPTION  ${subscriptionName} DISABLE`,
    );
    await this.runQuery(
      connect,
      `ALTER SUBSCRIPTION ${subscriptionName} SET (slot_name=NONE)`,
    );
    await this.runQuery(connect, `DROP SUBSCRIPTION ${subscriptionName}`);
    await this.runQuery(
      isTheSameCluster ? publicationConnect : connect,
      `select pg_drop_replication_slot('${subscriptionName}');`,
    );
    for (let index = 0; index < tables.length; index++) {
      await this.runQuery(connect, `delete from ${tables[index]}`);
    }
  }

  async runQuery(connect: Client, query: string): Promise<any> {
    console.log(query);
    const result = await connect.query(query);
    console.log(JSON.stringify(result));
    return result;
  }

  async createSubscription(
    subscriptionName: string,
    publicationName: string,
    connect: Client,
    { host, port, password, database, user }: IConnectConfig,
    inTheSameCluster = false,
    publicationConnect: Client = null,
  ): Promise<void> {
    if (inTheSameCluster) {
      await this.runQuery(
        publicationConnect,
        `SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'active' and pid <> pg_backend_pid();SELECT * FROM pg_create_logical_replication_slot('${subscriptionName}', 'pgoutput');`,
      );
    }
    await this.runQuery(
      connect,
      `CREATE SUBSCRIPTION ${subscriptionName} CONNECTION
    'host=${host} port=${port} dbname=${database} user=${user} password=${password}'
    PUBLICATION ${publicationName}  with ( create_slot = ${!inTheSameCluster}, copy_data = true)`,
    );
  }

  async disableCheckForeignKey(connect: Client): Promise<void> {
    await this.runQuery(
      connect,
      `SET session_replication_role = 'replica';`,
    );
  }

  async enableCheckForeignKey(connect: Client): Promise<void> {
    await this.runQuery(
      connect,
      `SET session_replication_role = 'origin';    `,
    );
  }

  async getCount(connect: Client, table: string): Promise<number> {
    const result = await this.runQuery(
      connect,
      `select count(*) as count from ${table}`,
    );
    return result.rows[0]['count'];
  }
}
