import { ICondition } from '../interface/condition.interface';
import { IConnectConfig } from '../interface/connect-config.interface';
import { IPublicationType } from '../interface/publication-type.interface';
import { DBService } from './db.service';
export declare class ReplicationService {
    private dbService;
    constructor(dbService: DBService);
    initializeReplication(connectConfig: IConnectConfig): Promise<void>;
    dropPublication(connectConfig: IConnectConfig, publicationName: string): Promise<void>;
    dropSubscription(publicationConnectConfig: IConnectConfig, subscriptionConnectConfig: IConnectConfig, subscriptionName: string, tables: string[]): Promise<void>;
    createPublication(connectConfig: IConnectConfig, publicationName: string, tables: string[], isRebuild: boolean, publicationType: IPublicationType, publishConditions: ICondition[]): Promise<void>;
    createSubscription(publicationConnectConfig: IConnectConfig, subscriptionConnectConfig: IConnectConfig, publicationName: string, subscriptionName: string, isRebuild: boolean, tables: string[], checkForeignKey: boolean): Promise<void>;
    checkReplication(publicationConnectConfig: IConnectConfig, subscriptionConnectConfig: IConnectConfig, tables: string[]): Promise<void>;
    preparePublicationType(data: IPublicationType): string;
}
