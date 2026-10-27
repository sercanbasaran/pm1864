// Shared transport-safe errors. Domain services must not depend on one another
// simply to construct an API error.
export class ApiError extends Error {
  constructor(status, message, code = "REQUEST_ERROR") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
