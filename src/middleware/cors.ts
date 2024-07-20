import cors from 'cors';

const corsOptions = {
    origin: '*', // Allow all origins (for development)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
