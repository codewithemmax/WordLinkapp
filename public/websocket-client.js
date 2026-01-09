// WebSocket client functions for real-time updates
function updateCommentCount(postId, comments) {
  const postCard = document.querySelector(`[data-id="${postId}"]`);
  if (postCard) {
    const commentsSpan = postCard.querySelector('.comments');
    if (commentsSpan) {
      commentsSpan.textContent = comments;
    }
  }
}


const socket = io('https://wordlinkapp.onrender.com');

function showNotification(message) {
  alert(message);
}

// Add socket event listeners
socket.on('comment-added', (data) => {
  updateCommentCount(data.postId, data.comments);
});

socket.on('new-follower', (data) => {
  showNotification(data.message);
});