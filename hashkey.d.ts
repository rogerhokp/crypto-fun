export interface TradePayload {
    symbol: string;
    symbolName: string;
    topic: string;
    params: {
        realtimeInterval: string;
        binary: string;
    };
    data: {
        v: string;
        t: number;
        p: string;
        q: string;
        m: boolean;
    }[];
    f: boolean;
    sendTime: number;
    shared: boolean;
    id: string;
}


export interface LastTrade {
    time: number;
    price: number;
    symbol: string;
}