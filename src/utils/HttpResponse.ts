/**
 * HttpResponse is a class that represents the structure of an HTTP response.
 * It includes the status code, response data, and any error information.
 */
export class HttpResponse {
    status: number
    data?: any
    error?: any

    /**
     * Constructs a new HttpResponse.
     * @param status - The HTTP status code.
     * @param data - Optional response data.
     * @param error - Optional error information.
     */
    constructor(status: number, data?: any, error?: any) {
        this.status = status
        this.data = data
        this.error = error
    }
}

/**
 * ResponseStatusCode is an enumeration of common HTTP status codes.
 */
export enum ResponseStatusCode {
    Okay = 200,
    BadRequest = 400,
    Unauthorized = 401,
    InternalError = 500,
}
