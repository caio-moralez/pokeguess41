const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PokeGuess API",
      version: "1.0.0",
      description: "API for the PokeGuess game with AWS Cognito authentication",
    },
    servers: [
      {
        url: "https://pokeguess41.onrender.com",
        description: "Production (Render)",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./server.js"], 
};

module.exports = swaggerJSDoc(options);
