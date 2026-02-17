"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSignedUrl = void 0;
const crypto_1 = require("crypto");
const moment_1 = require("moment");
const qs_1 = require("qs");
const createPolicy = (url, expiryDateUnix) => {
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
const createPolicySignature = (policy, privateKey) => {
    const sign = (0, crypto_1.createSign)('RSA-SHA1').update(policy);
    return sign.sign(privateKey, 'base64');
};
const normalizeBase64 = (str) => str.replace(/\+/g, '-').replace(/=/g, '_').replace(/\//g, '~');
const getSignedUrl = (url, s3Config, { expiryDateUnix } = {}) => {
    try {
        const { cloudFront } = s3Config;
        if (!url || !(cloudFront === null || cloudFront === void 0 ? void 0 : cloudFront.privateKey)) {
            return url;
        }
        const { privateKey } = cloudFront;
        const expiryDate = expiryDateUnix || (0, moment_1.default)().add(30, 'minute').unix();
        const parsedUrl = new URL(url);
        if (parsedUrl.host !== cloudFront.domain) {
            parsedUrl.host = cloudFront.domain;
        }
        // use the CloudFront Url if it was saved with the S3 link
        const policy = createPolicy(parsedUrl.href, expiryDate);
        const signature = createPolicySignature(policy, privateKey);
        const policyBase64 = Buffer.from(policy).toString('base64');
        parsedUrl.search = qs_1.default.stringify({
            Expires: expiryDate,
            Policy: normalizeBase64(policyBase64),
            Signature: normalizeBase64(signature),
            'Key-Pair-Id': cloudFront.keyPairId,
        });
        return parsedUrl.href;
    }
    catch (error) {
        console.log('could not generate signed url');
        console.log(error);
        return url;
    }
};
exports.getSignedUrl = getSignedUrl;
