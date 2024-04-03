import { getClient, HttpVerb } from '@tauri-apps/api/http';
import { AxiosError, AxiosPromise } from 'axios';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { Body, ResponseType as TauriResponseType } from '@tauri-apps/api/http';
import { ResponseType as AxiosResponseType } from 'axios';

export const base64Decode = (str: string): string =>
    Buffer.from(str, 'base64').toString('binary');
export const base64Encode = (str: string): string =>
    Buffer.from(str, 'binary').toString('base64');

export function getTauriResponseType(
    type?: AxiosResponseType
): TauriResponseType {
    let responseType = TauriResponseType.Text;

    if (type !== undefined && type !== null) {
        switch (type.toLowerCase()) {
            case 'json': {
                responseType = TauriResponseType.JSON;
                break;
            }
            case 'text': {
                responseType = TauriResponseType.Text;
                break;
            }
            default: {
                responseType = TauriResponseType.Binary;
            }
        }
    }
    return responseType;
}

export function buildTauriRequestData(data?: any): Body | undefined {
    if (data === undefined || data === null) {
        return undefined;
    }
    if (typeof data === 'string') {
        return Body.text(data);
    } else if (typeof data === 'object') {
        return Body.json(data);
    } else if (data instanceof FormData) {
        // @ts-ignore
        return Body.form(data);
    }
    return Body.bytes(data);
}

export const buildRequestUrl = (config: Omit<any, 'headers'>): string => {
    return `${config.baseURL}${config.url}`;
};

export const axiosTauriApiAdapter = (config): AxiosPromise =>
    new Promise(async (resolve, reject) => {
        const client = await getClient({
            maxRedirections: config.maxRedirects
        });
        let timeout = 5;
        if (config.timeout !== undefined && config.timeout > 0) {
            timeout = Math.round(config.timeout / 1000);
        }

        client
            .request({
                body: buildTauriRequestData(config.data),
                headers: config.headers,
                responseType: getTauriResponseType(config.responseType),
                timeout: timeout,
                url: buildRequestUrl(config),
                query: config.params,
                method: <HttpVerb>config.method?.toUpperCase()
            })
            .then((response) => {
                // @ts-ignore
                const statusText = ReasonPhrases[StatusCodes[response.status]];
                if (response.ok) {
                    return resolve({
                        data: response.data,
                        status: response.status,
                        statusText: statusText,
                        headers: {
                            ...response.headers,
                            'set-cookie': response.rawHeaders['set-cookie']
                        },
                        config: config
                    });
                } else {
                    reject(
                        new AxiosError(
                            'Request failed with status code ' +
                                response.status,
                            [
                                AxiosError.ERR_BAD_REQUEST,
                                AxiosError.ERR_BAD_RESPONSE
                            ][Math.floor(response.status / 100) - 4],
                            config,
                            client,
                            {
                                data: response.data,
                                status: response.status,
                                statusText: statusText,
                                headers: response.headers,
                                config: config
                            }
                        )
                    );
                }
            })
            .catch((error) => {
                return reject(error);
            });
    });

export default axiosTauriApiAdapter;
