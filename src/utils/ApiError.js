class ApiError extends Error{
    constructor(
        statusCode,
        message = "Something went wrong",
        error=[],
        stack = ""
    ){
        super(message);
        this.statusCode = statusCode;
        this.data = nullthis,
        this.error = error;
        this.succes = false;
        message = message;


        if(stack){
            this.stack = stack;
        } else {
            Error.captureStackTrace(this,this.constructor);
        }



    }
}

export {ApiError};