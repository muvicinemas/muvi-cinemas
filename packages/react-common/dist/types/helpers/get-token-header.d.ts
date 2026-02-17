import { AxiosRequestHeaders } from 'axios';
/**
 * It returns an object with a key of 'Authorization' and a value of the access token passed in
 * @param {string} accessToken - string
 * @returns An object with a key of 'Authorization' and a value of the access token parameter.
 */
export declare const getTokenHeader: (accessToken: string) => AxiosRequestHeaders;
//# sourceMappingURL=get-token-header.d.ts.map