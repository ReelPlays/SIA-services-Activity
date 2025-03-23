import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useSubscription, gql } from "@apollo/client";
import "./App.css";

/* GraphQL Queries, Mutations, and Subscriptions */
const GET_POSTS = gql`
  query GetPosts {
    posts {
      id
      title
      body
      username
    }
  }
`;

const CREATE_POST = gql`
  mutation CreatePost($title: String!, $body: String!, $username: String!) {
    createPost(title: $title, body: $body, username: $username) {
      id
      title
      body
      username
    }
  }
`;

const POST_SUBSCRIPTION = gql`
  subscription {
    postAdded {
      id
      title
      body
      username
    }
  }
`;

const App = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [username, setUsername] = useState("");
  const [posts, setPosts] = useState([]);

  /* Fetch Posts */
  const { loading, error, data } = useQuery(GET_POSTS);

  /* Mutation Hook for Adding Posts */
  const [createPost, { loading: mutationLoading }] = useMutation(CREATE_POST, {
    onCompleted: () => {
      setTitle("");
      setBody("");
      setUsername("");
    },
  });

  /* Subscribe to New Posts */
  useSubscription(POST_SUBSCRIPTION, {
    onData: ({ data: subscriptionData }) => {
      if (subscriptionData.data) {
        setPosts((prevPosts) => [subscriptionData.data.postAdded, ...prevPosts]);
      }
    },
  });

  /* Update Posts State When Initial Data Loads */
  useEffect(() => {
    if (data?.posts) {
      setPosts(data.posts);
    }
  }, [data]);

  /* Submit Form */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !body || !username) {
      alert("All fields are required!");
      return;
    }
    createPost({ variables: { title, body, username } });
  };

  return (
    <div className="container">
      <h1>Facebook Alpha</h1>
      <div className="form-container">
        <h2>Add a New Post</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Post Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Post Content"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button type="submit" disabled={mutationLoading}>
            {mutationLoading ? "Adding..." : "Add Post"}
          </button>
        </form>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="error">Error: {error.message}</p>}

      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Title</th>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id}>
              <td>{post.username}</td>
              <td>{post.title}</td>
              <td>{post.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default App;
