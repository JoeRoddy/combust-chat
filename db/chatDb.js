import firebase from "firebase/app";
import "firebase/database";

class ChatDb {
  sendMessage(convoId, message) {
    if (!convoId || !message) {
      return;
    }
    message.createdAt = new Date().getTime();
    const db = firebase.database();
    const msgRef = db.ref("chat/messages").push();
    const msgId = msgRef.key;
    msgRef.set(message);
    message.usersWhoveRead = { [message.sentBy]: true };
    db.ref("chat/conversations/" + convoId).update({ lastMessage: message });
    db.ref("chat/conversations/" + convoId + "/messages/" + msgId).set(true);
  }

  addParticipantToConversation(userId, conversationId) {
    if (!userId || !conversationId) {
      return new Error("Bad call to addParticipantToConversation");
    }
    const db = firebase.database();
    db.ref("chat/conversations")
      .child(conversationId)
      .child("participants")
      .update({
        [userId]: {
          isTyping: false
        }
      });
    db.ref("chat/conversationsByUser")
      .child(userId)
      .update({ [conversationId]: true });
  }

  listenForNewMessages(convoId, callback) {
    if (!convoId) {
      return;
    }
    firebase
      .database()
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
        const msg = snap.val();
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
    const ref = firebase
      .database()
      .ref("chat/conversations/" + convoId + "/participants/" + userId)
      .child("isTyping");
    ref.set(isTyping);
  }

  listenToConversation(convoId, callback) {
    if (!convoId) {
      return;
    }
    firebase
      .database()
      .ref("chat/conversations/" + convoId)
      .on("value", snapshot => {
        let convo = snapshot.val();
        convo.id = convoId;
        callback(convo);
      });
  }

  createConversation(users, callback) {
    const db = firebase.database();
    const cRef = db.ref("chat/conversations").push();
    const convoId = cRef.key;
    let participants = {};
    users.forEach(u => {
      participants[u] = {
        isTyping: false
      };
    });
    cRef.set({
      participants,
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
        const convoId = snap.key;
        callback(null, convoId);
      });
  }

  markConversationAsReadByUser(convoId, userId) {
    firebase
      .database()
      .ref(`chat/conversations/${convoId}/lastMessage/usersWhoveRead/${userId}`)
      .set(true);
  }
}

const chatDb = new ChatDb();
export default chatDb;
