// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto'); // Generate random id
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Store comments
const commentsByPostId = {};

// Get all comments for a post
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create a new comment
app.post('/posts/:id/comments', async (req, res) => {
  // Generate id for comment
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;

  // Get all comments for the post
  const comments = commentsByPostId[req.params.id] || [];

  // Push new comment to the array
  comments.push({ id: commentId, content, status: 'pending' });

  // Store comments for the post
  commentsByPostId[req.params.id] = comments;

  // Emit event to event bus
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });

  // Send response
  res.status(201).send(comments);
});

// Receive event from event bus
app.post('/events', async (req, res) => {
  console.log('Received event', req.body.type);

  // Get event data
  const { type, data } = req.body;

  // If event type is CommentModerated
  if (type === 'CommentModerated') {
    // Get all comments for the post
    const comments = commentsByPostId[data.postId];

    // Find comment with the same id
    const comment = comments.find((comment) => {
      return comment.id === data.id;
    });

    // Update comment status
    comment.status = data.status;

    // Emit event to event bus
    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data: {
        id: data.id,
        content: data.content,
        postId: data.postId,
        status: data.status,
      }
    });
};