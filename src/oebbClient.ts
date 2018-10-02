import axios, {AxiosRequestConfig} from "axios";
import {flushTrainInfo, formatDate, logger, prettyPrint} from "./util";

const iconv = require("iconv-lite");

export class OebbClient {
    private static BASE_CONFIG: AxiosRequestConfig = {
        headers: {
            "Accept": "text/javascript, text/html, application/xml, text/xml, */*",
            "Accept-Language": "en-US,en;q=0.5",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Pragma": "no-cache",
            "Referer": "http://zugradar.oebb.at/bin/help.exe/en?tpl=livefahrplan",
            "X-Prototype-Version": "1.5.0",
            "X-Requested-With": "XMLHttpRequest",
        },
        responseType: "arraybuffer",
    };

    private static extractTrainInfo(t: any): ITrain {
        return {
            id: t.i,
            number: t.n.trim(),
        };
    }

    private readonly baseUrl: string = "http://zugradar.oebb.at/bin/query.exe/eny";
    private readonly isCollectHistory: boolean;

    constructor(isCollectHistory: boolean) {
        this.isCollectHistory = isCollectHistory;
    }

    public trainsList(req: ITrainsRequest): Promise<ITrain[]> {

        return axios.post(this.baseUrl, "", {
            ...OebbClient.BASE_CONFIG,
            params: {
                ...req,
                look_json: "yes",
                performLocating: 1,
                tpl: "trains2json2",
            },
        }).then(decode)
            .then((resp) => {
                return resp.data.t.map(OebbClient.extractTrainInfo);
            });
    }

    public getInfo(train: ITrain, date: Date): Promise<ITrainInfo> {
        const formattedDay: string = formatDate(date);
        return axios.post(`http://zugradar.oebb.at/bin/traininfo.exe/eny/${train.id}`, "",
            {
                ...OebbClient.BASE_CONFIG,
                params: {
                    date: formattedDay,
                    tpl: "JourneyDetails",
                },
            }).then(decode)
            .then((resp) => {
                const data = resp.data;
                if (this.isCollectHistory) {
                    flushTrainInfo(data, train.id, date);
                }
                return {
                    id: train.id,
                    locations: data.locations,
                    number: data.name,
                };
            });
    }
}

interface ITrainsRequest {
    look_minx: number;
    look_maxx: number;
    look_miny: number;
    look_maxy: number;
    look_nv: string;
    look_productclass: number;
}

export interface ITrain {
    number: string;
    id: string;
}

export interface ITrainInfo {
    number: string;
    id: string;
    locations: ILocation[];
}

export interface ILocation {
    stationIdx: number;
    name: string;
    depTime: string;
    arrTime: string;
    depTimeProgMinutes: number;
    arrTimeProgMinutes: number;
}

const decode = (response) => {
    const ctype: string = response.headers["content-type"];
    if (ctype.includes("charset=ISO-8859-1")) {
        const output = iconv.decode(response.data, "ISO-8859-1");
        response.data = JSON.parse(output);
    } else {
        response.data = JSON.parse(iconv.decode(response.data, "UTF-8"));
    }
    return response;
};
