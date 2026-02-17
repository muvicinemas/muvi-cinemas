import { Injectable } from '@nestjs/common';
import { Client } from 'pg';
import { ICondition } from '../interface/condition.interface';
import { IConnectConfig } from '../interface/connect-config.interface';
import { IPublicationType } from '../interface/publication-type.interface';
import { DBService } from './db.service';

@Injectable()
export class ReplicationService {
  constructor(private dbService: DBService) {}

  async initializeReplication(connectConfig: IConnectConfig): Promise<void> {
    const connect = new Client(connectConfig);
    await connect.connect();
    await this.dbService.initializeReplication(connect);
  }

  async dropPublication(
    connectConfig: IConnectConfig,
    publicationName: string,
  ): Promise<void> {
    const connect = new Client(connectConfig);
    await connect.connect();
    const publicationIsExist =
      await this.dbService.checkPublicationIsExist(connect, publicationName);
    if (publicationIsExist) {
      await this.dbService.dropPublication(connect, publicationName);
    }
  }

  async dropSubscription(
    publicationConnectConfig: IConnectConfig,
    subscriptionConnectConfig: IConnectConfig,
    subscriptionName: string,
    tables: string[],
  ): Promise<void> {
    const subscriptionConnect = new Client(subscriptionConnectConfig);
    await subscriptionConnect.connect();
    let isTheSameCluster = false;
    let publicationConnect: Client = null;
    if (
      publicationConnectConfig.host == subscriptionConnectConfig.host &&
      publicationConnectConfig.port == subscriptionConnectConfig.port
    ) {
      isTheSameCluster = true;
      publicationConnect = new Client(publicationConnectConfig);
      await publicationConnect.connect();
    }
    const subscriptionIsExist =
      await this.dbService.checkSubscriptionIsExist(
        subscriptionConnect,
        subscriptionName,
      );
    if (subscriptionIsExist) {
      await this.dbService.dropSubscription(
        subscriptionConnect,
        subscriptionName,
        tables,
        isTheSameCluster,
        publicationConnect,
      );
    }
  }

  async createPublication(
    connectConfig: IConnectConfig,
    publicationName: string,
    tables: string[],
    isRebuild: boolean,
    publicationType: IPublicationType,
    publishConditions: ICondition[],
  ): Promise<void> {
    const connect = new Client(connectConfig);
    await connect.connect();
    const publicationIsExist =
      await this.dbService.checkPublicationIsExist(connect, publicationName);
    if (!publicationIsExist) {
      await this.dbService.createPublication(
        connect,
        publicationName,
        tables,
        this.preparePublicationType(publicationType),
        publishConditions,
      );
    } else if (isRebuild) {
      await this.dbService.dropPublication(connect, publicationName);
      await this.dbService.createPublication(
        connect,
        publicationName,
        tables,
        this.preparePublicationType(publicationType),
        publishConditions,
      );
    }
  }

  async createSubscription(
    publicationConnectConfig: IConnectConfig,
    subscriptionConnectConfig: IConnectConfig,
    publicationName: string,
    subscriptionName: string,
    isRebuild: boolean,
    tables: string[],
    checkForeignKey: boolean,
  ): Promise<void> {
    const publicationConnect = new Client(publicationConnectConfig);
    await publicationConnect.connect();
    const publicationIsExist =
      await this.dbService.checkPublicationIsExist(
        publicationConnect,
        publicationName,
      );

    let isTheSameCluster = false;
    if (
      publicationConnectConfig.host == subscriptionConnectConfig.host &&
      publicationConnectConfig.port == subscriptionConnectConfig.port
    ) {
      isTheSameCluster = true;
    }

    if (publicationIsExist) {
      const subscriptionConnect = new Client(subscriptionConnectConfig);
      await subscriptionConnect.connect();
      const subscriptionIsExist =
        await this.dbService.checkSubscriptionIsExist(
          subscriptionConnect,
          subscriptionName,
        );
      if (!subscriptionIsExist) {
        await this.dbService.createSubscription(
          subscriptionName,
          publicationName,
          subscriptionConnect,
          publicationConnectConfig,
          isTheSameCluster,
          publicationConnect,
        );
      } else if (isRebuild) {
        if (checkForeignKey) {
          await this.dbService.disableCheckForeignKey(subscriptionConnect);
        }
        await this.dbService.dropSubscription(
          subscriptionConnect,
          subscriptionName,
          tables,
          isTheSameCluster,
          publicationConnect,
        );
        await this.dbService.createSubscription(
          subscriptionName,
          publicationName,
          subscriptionConnect,
          publicationConnectConfig,
          isTheSameCluster,
          publicationConnect,
        );
        if (checkForeignKey) {
          await this.dbService.enableCheckForeignKey(subscriptionConnect);
        }
      }
    } else {
      console.log(`${publicationName} is not exist`);
    }
  }

  async checkReplication(
    publicationConnectConfig: IConnectConfig,
    subscriptionConnectConfig: IConnectConfig,
    tables: string[],
  ): Promise<void> {
    const publicationConnect = new Client(publicationConnectConfig);
    await publicationConnect.connect();
    const subscriptionConnect = new Client(subscriptionConnectConfig);
    await subscriptionConnect.connect();

    for (let index = 0; index < tables.length; index++) {
      const element = tables[index];
      let publicationDBCount: number;
      let subscriptionDBCount: number;
      await Promise.all([
        (publicationDBCount = await this.dbService.getCount(
          publicationConnect,
          element,
        )),
        (subscriptionDBCount = await this.dbService.getCount(
          subscriptionConnect,
          element,
        )),
      ]);
      console.log(
        `table '${element}' in publication DB is ${publicationDBCount} and in subscription DB is ${subscriptionDBCount}`,
      );
    }
  }

  preparePublicationType(data: IPublicationType): string {
    const publicationTypeArray: string[] = [];
    if (data.isWithDelete) {
      publicationTypeArray.push('delete');
    }
    if (data.isWithInsert) {
      publicationTypeArray.push('insert');
    }
    if (data.isWithTruncate) {
      publicationTypeArray.push('truncate');
    }
    if (data.isWithUpdate) {
      publicationTypeArray.push('update');
    }
    return publicationTypeArray.join();
  }
}
