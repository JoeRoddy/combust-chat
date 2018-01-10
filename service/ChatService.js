import firebase from "firebase";

class ChatService {
  sendMessage(convoId, message) {
    if (!convoId || !message) {
      return;
    }
    message.createdAt = new Date().getTime();
    let db = firebase.database();
    let msgRef = db.ref("chat/messages").push();
    let msgId = msgRef.key;
    msgRef.set(message);
    db.ref("chat/conversations/" + convoId + "/messages/" + msgId).set(true);
  }

  addParticipantToConversation(userId, conversationId) {
    if (!userId || !conversationId) {
      return new Error("Bad call to addParticipantToConversation");
    }
    const db = firebase.database();
    db
      .ref("chat/conversations")
      .child(conversationId)
      .child("participants")
      .update({
        [userId]: {
          isTyping: false
        }
      });
    db
      .ref("chat/conversationsByUser")
      .child(userId)
      .update({ [conversationId]: true });
  }

  listenForNewMessages(convoId, callback) {
    if (!convoId) {
      return;
    }
    let db = firebase.database();
    db
      .ref("chat/conversations/" + convoId + "/messages")
      .on("child_added", snapshot => {
        let msgId = snapshot.key;
        this.getMessage(msgId, callback);
      });
  }

  getMessage(msgId, callback) {
    firebase
      .database()
      .ref("chat/messages")
      .child(msgId)
      .once("value", snap => {
        let msg = snap.val();
        if (!msg) {
          return;
        }
        msg.id = msgId;
        callback(null, msg);
      });
  }

  toggleUserTyping(convoId, userId, isTyping) {
    if (!convoId || !userId) {
      return;
    }
    let ref = firebase
      .database()
      .ref("chat/conversations/" + convoId + "/participants/" + userId)
      .child("isTyping");
    ref.set(isTyping);
  }

  listenToConversation(convoId, callback) {
    if (!convoId) {
      return;
    }
    let db = firebase.database();
    db.ref("chat/conversations/" + convoId).on("value", snapshot => {
      let convo = snapshot.val();
      // if (!convo) {
      //   return callback(null);
      // }
      convo.id = convoId;
      callback(convo);
    });
  }

  createConversation(users, callback) {
    let db = firebase.database();
    let cRef = db.ref("chat/conversations").push();
    let convoId = cRef.key;
    let participants = {};
    users.forEach(u => {
      participants[u] = {
        isTyping: false
      };
    });
    cRef.set({
      participants: participants,
      type: "dm"
    });
    users.forEach(u => {
      db.ref("chat/conversationsByUser/" + u + "/" + convoId).set(true);
    });
    callback(null, convoId);
    //TODO: notify
  }

  listenToUsersConversationIds(userId, callback) {
    firebase
      .database()
      .ref("chat/conversationsByUser")
      .child(userId)
      .on("child_added", snap => {
        let convoId = snap.key;
        callback(null, convoId);
      });
  }
}

const chatService = new ChatService();

export default chatService;
