interface RequestsOptions {
    page?: string;
    limit?: string;
    project?: string;
    provider?: string;
    model?: string;
}
export declare function requestsCommand(options: RequestsOptions): Promise<void>;
export declare function requestCommand(id: string): Promise<void>;
export {};
