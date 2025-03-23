require("dotenv").config();
const express = require("express");
const { PubSub } = require("graphql-subscriptions");
const { createServer } = require("http");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { execute, subscribe } = require("graphql");
const pgp = require("pg-promise")();
const cors = require("cors");
const { ApolloServer, gql } = require("apollo-server-express");

const pubsub = new PubSub();
const POST_ADDED = "POST_ADDED";
const db = pgp(process.env.POSTGRES_URI);

// Define GraphQL Schema
const typeDefs = gql`
  type Post {
    id: ID!
    title: String!
    body: String!
    username: String!
  }

  type Query {
    posts: [Post]
  }

  type Mutation {
    createPost(title: String!, body: String!, username: String!): Post
  }

  type Subscription {
    postAdded: Post
  }
`;

// Define Resolvers
const resolvers = {
  Query: {
    posts: async () => await db.any("SELECT * FROM posts"),
  },
  Mutation: {
    createPost: async (_, { title, body, username }) => {
      const newPost = await db.one(
        "INSERT INTO posts (title, body, username) VALUES ($1, $2, $3) RETURNING *",
        [title, body, username]
      );
      pubsub.publish(POST_ADDED, { postAdded: newPost });
      return newPost;
    },
  },
  Subscription: {
    postAdded: {
      subscribe: () => pubsub.asyncIterator([POST_ADDED]),
    },
  },
};

// Initialize Express
const app = express();
app.use(cors());

const httpServer = createServer(app);
const schema = makeExecutableSchema({ typeDefs, resolvers });

const apolloServer = new ApolloServer({ schema });

async function startServer() {
  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  // Start WebSocket Server
  new SubscriptionServer(
    {
      schema,
      execute,
      subscribe,
    },
    {
      server: httpServer,
      path: apolloServer.graphqlPath,
    }
  );

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 GraphQL API running at http://localhost:${PORT}/graphql`);
    console.log(`📡 WebSocket Subscriptions at ws://localhost:${PORT}/graphql`);
  });
}

startServer();
