import { HttpError } from "../utils/http-error.js";
export const requireRole = (...roles) => {
    return (req, _res, next) => {
        if (!req.authUser) {
            throw new HttpError(401, "Unauthorized");
        }
        if (!roles.includes(req.authUser.role)) {
            throw new HttpError(403, "Forbidden");
        }
        next();
    };
};
