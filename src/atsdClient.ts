import axios, {AxiosRequestConfig} from "axios";

export interface ICredentials {
    username: string;
    password: string;
}

export interface IAtsdClientConfig {
    server: string;
    scheme: string;
    port: number;
    credentials: ICredentials;
}

export interface IBatchResult {
    fail: number;
    success: number;
    total: number;
}

export class AtsdClient {
    private readonly config: AxiosRequestConfig;

    constructor(config: IAtsdClientConfig) {
        this.config = {
            auth: {
                ...config.credentials,
            },
            baseURL: `${config.scheme}://${config.server}:${config.port}`,
        };
    }

    public sendCommands(batch: string[]): Promise<IBatchResult> {
        const text = batch.join("\n");
        return axios.post("/api/v1/command", text, {
            ...this.config,
            headers: {"Content-Type": "text/plain"},
        }).then((resp) => resp.data);
    }
}
