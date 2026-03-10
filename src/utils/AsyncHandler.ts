import { Request, Response, NextFunction } from "express";

type AsyncHandlerFunction<T = void> = (
    req: Request,
    res: Response,
    next: NextFunction,
) => Promise<T>

const asyncHandler = <T = void>(requestHandler: AsyncHandlerFunction<T>) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(requestHandler(req, res, next))
            .catch((error) => next(error));
    }
}

export {
    asyncHandler,
}