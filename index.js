const { ApolloServer } = require("apollo-server");
const {
  HttpQueryError,
  ApolloError,
  AuthenticationError,
} = require("apollo-server-core");
const mongoose = require("mongoose");

const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");
const { MONGODB } = require("./config.js");

const PORT = process.env.PORT || 5000;

const server = new ApolloServer({
  formatResponse(body) {
    if (
      body.errors &&
      body.errors.find(
        (err) => err.extensions && err.extensions.code === "UNAUTHENTICATED"
      )
    ) {
      return {
        ...body,
        data: undefined,
      };
    }

    return body;
  },

  typeDefs,
  resolvers,
  context: ({ req }) => ({ req }),
  plugins: [
    {
      requestDidStart() {
        return {
          didEncounterErrors({ response, errors }) {
            if (
              errors.find(
                (err) =>
                  err instanceof AuthenticationError ||
                  err.originalError instanceof AuthenticationError
              )
            ) {
              response.data = undefined;
              response.http.status = 401;
            }
          },
        };
      },
    },
  ],
});

mongoose
  .connect(MONGODB, { useNewUrlParser: true })
  .then(() => {
    console.log("MongoDB Connected");
    return server.listen({ port: PORT });
  })
  .then((res) => {
    console.log(`Server running at ${res.url}`);
  })
  .catch((err) => {
    console.error(err);
  });
