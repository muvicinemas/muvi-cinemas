import { Client } from 'pg';
import { ICondition } from '../interface/condition.interface';
import { IConnectConfig } from '../interface/connect-config.interface';
export declare class DBService {
    initializeReplication(connect: Client): Promise<void>;
    checkPublicationIsExist(connect: Client, publicationName: string): Promise<boolean>;
    checkSubscriptionIsExist(connect: Client, subscriptionName: string): Promise<boolean>;
    createPublication(connect: Client, publicationName: string, tables: string[], publishType: string, publishConditions?: ICondition[]): Promise<void>;
    dropPublication(connect: Client, publicationName: string): Promise<void>;
    dropSubscription(connect: Client, subscriptionName: string, tables: string[], isTheSameCluster?: boolean, publicationConnect?: Client): Promise<void>;
    runQuery(connect: Client, query: string): Promise<any>;
    createSubscription(subscriptionName: string, publicationName: string, connect: Client, { host, port, password, database, user }: IConnectConfig, inTheSameCluster?: boolean, publicationConnect?: Client): Promise<void>;
    disableCheckForeignKey(connect: Client): Promise<void>;
    enableCheckForeignKey(connect: Client): Promise<void>;
    getCount(connect: Client, table: string): Promise<number>;
}
