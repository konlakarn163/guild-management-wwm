import { HttpError } from "../utils/http-error.js";
export const notFoundHandler = (_req, res) => {
    res.status(404).json({ message: "Route not found" });
};
export const errorHandler = (error, _req, res, next) => {
    void next;
    if (error instanceof HttpError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
    }
    res.status(500).json({
        message: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
};
