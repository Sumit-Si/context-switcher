type ApiResponseProps<T> = {
    statusCode: number;
    data: T | null;
    message?: string;
}

class ApiResponse<T = unknown> {
    public readonly statusCode: number;
    public readonly message: string;
    public readonly data: T | null;
    public readonly success: boolean;

    constructor({ statusCode, data, message = "Success" }: ApiResponseProps<T>) {
        this.statusCode = statusCode
        this.message = message
        this.data = data
        this.success = statusCode < 400
    }
}

export {
    ApiResponse,
}