export interface IS3 {
    cloudFront?: {
        privateKey: string;
        domain: string;
        keyPairId: string;
    };
}
export declare const getSignedUrl: (url: string, s3Config: IS3, { expiryDateUnix }?: {
    expiryDateUnix?: number;
}) => string;
