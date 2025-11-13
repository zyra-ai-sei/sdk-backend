import {type Request} from 'express'

export enum Sort {
    ASC = 'asc',
    DESC = 'desc'
}

export type AuthenticatedRequest = Request & {
    userAddress: string
    userId:string
}
