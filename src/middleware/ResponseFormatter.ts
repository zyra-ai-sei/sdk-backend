import { NextFunction, Request, Response } from 'express'
import { HttpResponse } from '../utils/HttpResponse'
// @ts-ignore: Unreachable code error
BigInt.prototype['toJSON'] = function () {
    return this.toString()
}

/**
 * Response Interceptor Middleware
 * The responseFormatter middleware intercepts the response and restructures the response body
 * into a standardized format using the HttpResponse class.
 * @param request - The incoming request object.
 * @param response - The response object.
 * @param next - The next middleware function in the stack.
 */
export const responseFormatter = (
    request: Request,
    response: Response,
    next: NextFunction,
) => {
    const oldJson = response.json
    response.json = body => {
        let restructuredData: HttpResponse
        if (body instanceof HttpResponse) {
            // If the body is already an instance of HttpResponse, use it directly
            restructuredData = body
        } else if (Array.isArray(body)) {
            // If the body is an array, wrap it in an HttpResponse with items
            restructuredData = new HttpResponse(response.statusCode, {
                items: body,
            })
        } else {
            // Otherwise, wrap the body in an HttpResponse
            restructuredData = new HttpResponse(response.statusCode, body)
        }
        response.locals.body = restructuredData
        return oldJson.call(response, restructuredData)
    }
    next()
}
