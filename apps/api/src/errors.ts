/** The requested record does not exist; reported as HTTP 404. */
export class NotFoundError extends Error {}

/** The request does not fit the record's current state; reported as HTTP 409. */
export class ConflictError extends Error {}
