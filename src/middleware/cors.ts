import cors from 'cors';

const corsOptions = {
    origin: '*', // Allow all origins (for development)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;
