import { createSign } from 'crypto';
import moment from 'moment';
import qs from 'qs';

export interface IS3 {
  cloudFront?: {
    privateKey: string;
    domain: string;
    keyPairId: string;
  };
}

const createPolicy = (url: string, expiryDateUnix: number): string => {
  const policy = {
    Statement: [
      {
        Resource: url,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime': expiryDateUnix,
          },
        },
      },
    ],
  };
  return JSON.stringify(policy);
};

const createPolicySignature = (
  policy: string,
  privateKey: string,
): string => {
  const sign = createSign('RSA-SHA1').update(policy);
  return sign.sign(privateKey, 'base64');
};

const normalizeBase64 = (str: string): string =>
  str.replace(/\+/g, '-').replace(/=/g, '_').replace(/\//g, '~');

export const getSignedUrl = (
  url: string,
  s3Config: IS3,
  { expiryDateUnix }: { expiryDateUnix?: number } = {},
): string => {
  try {
    const { cloudFront } = s3Config;
    if (!url || !cloudFront?.privateKey) {
      return url;
    }

    const { privateKey } = cloudFront;
    const expiryDate = expiryDateUnix || moment().add(30, 'minute').unix();

    const parsedUrl = new URL(url);
    if (parsedUrl.host !== cloudFront.domain) {
      parsedUrl.host = cloudFront.domain;
    }

    // use the CloudFront Url if it was saved with the S3 link
    const policy = createPolicy(parsedUrl.href, expiryDate);
    const signature = createPolicySignature(policy, privateKey);
    const policyBase64 = Buffer.from(policy).toString('base64');

    parsedUrl.search = qs.stringify({
      Expires: expiryDate,
      Policy: normalizeBase64(policyBase64),
      Signature: normalizeBase64(signature),
      'Key-Pair-Id': cloudFront.keyPairId,
    });

    return parsedUrl.href;
  } catch (error) {
    console.log('could not generate signed url');
    console.log(error);
    return url;
  }
};
