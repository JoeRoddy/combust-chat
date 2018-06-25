import { observable, action } from "mobx";
import _ from "lodash";

import chatDb from "../db/ChatDb";
import userStore from "./UserStore";

class ChatStore {
  init() {
    userStore.onLogin(this.loadConversationsForUser.bind(this));
    userStore.onLogout(this.closeAllConversations.bind(this));
  }

  @observable openConversationIds = [];
  @observable conversationMap = new Map();
  @observable messagesByConversation = new Map();
  @observable messageMap = new Map();

  onIncomingMessageTriggers = [];

  @action
  onIncomingMessage(func) {
    this.onIncomingMessageTriggers.push(func);
  }

  handleIncomingMessage(message, conversationId) {
    try {
      this.onIncomingMessageTriggers.forEach(event => {
        event(message, conversationId);
      });
    } catch (err) {
      console.log(err);
    }
  }

  loadConversationsForUser = user => {
    chatDb.listenToUsersConversationIds(user.id, (err, convoId) => {
      err ? console.log(err) : this.listenToConversation(convoId);
    });
  };

  @action
  loadMessagesForConversation(convoId) {
    if (this.messagesByConversation.get(convoId)) {
      //already listening to this convo's messages
      return;
    }
    this.messagesByConversation.set(convoId, {});
    this.listenToConversation(convoId);
    chatDb.listenForNewMessages(convoId, (err, msg) => {
      if (err || !msg) {
        return console.log(err || "Null msg!");
      }
      if (
        msg.sentBy !== userStore.userId &&
        msg.createdAt >= new Date() - 5000
      ) {
        this.handleIncomingMessage(msg, convoId);
      }

      let messages = this.messagesByConversation.get(convoId) || {};
      messages[msg.id] = msg;
      this.messagesByConversation.set(convoId, _.clone(messages));
    });
  }

  @action
  listenToConversation = convoId => {
    chatDb.listenToConversation(convoId, convo => {
      if (this.conversationContainsNewMessages(convoId, convo)) {
        this.openConversationById(convoId);
      }
      this.conversationMap.set(convoId, convo);
    });
  };

  @action
  openConversationById(convoId) {
    this.markConvoAsOpen(convoId);
    this.loadMessagesForConversation(convoId);
  }

  getConversationTitle(convoId) {
    const usersInConvo = this.getUsersInConvo(convoId);
    let title = "";
    usersInConvo &&
      usersInConvo.forEach((user, i) => {
        title +=
          user && user.displayName + (i < usersInConvo.length - 1 ? ", " : "");
      });
    return title;
  }

  findExistingConversationWithParticipants(friendIds) {
    const existingConvoEntry = this.conversationMap
      .entries()
      .find(([convoId, convo]) => {
        const participants =
          convo && convo.participants && Object.keys(convo.participants);
        if (participants && participants.length === friendIds.length + 1) {
          const nonInclusion = friendIds.find(fid => {
            return !participants.includes(fid);
          });
          return nonInclusion ? false : true;
        }
        return false;
      });
    return (existingConvoEntry && existingConvoEntry[1]) || null;
  }

  sendMessage(conversationId, messageBody) {
    const userId = userStore.userId;
    const message = {
      body: messageBody,
      sentBy: userId
    };
    chatDb.sendMessage(conversationId, message);
  }

  @action
  openConversationWithUsers(friendIds) {
    const existingConvo = this.findExistingConversationWithParticipants(
      friendIds
    );
    if (existingConvo) {
      this.markConvoAsOpen(existingConvo.id);
      this.loadMessagesForConversation(existingConvo.id);
    } else {
      const participants = friendIds.concat([userStore.userId]);
      chatDb.createConversation(participants, (err, convoId) => {
        this.markConvoAsOpen(convoId);
        this.loadMessagesForConversation(convoId);
      });
    }
  }

  @action
  openConversationWithUser(friendId) {
    this.openConversationWithUsers([friendId]);
  }

  @action
  markConvoAsOpen(convoId) {
    if (!this.openConversationIds.includes(convoId)) {
      this.openConversationIds.push(convoId);
    }
  }

  @action
  markConvoAsClosed(convoId) {
    const i = this.openConversationIds.findIndex(iteratorId => {
      return convoId === iteratorId;
    });
    i >= 0 && this.openConversationIds.splice(i, 1);
  }

  @action
  closeAllConversations() {
    this.openConversationIds = [];
  }

  getConversation(convoId) {
    return this.conversationMap.get(convoId);
  }

  getMessages(convoId) {
    let messages = [];
    const msgsObj = this.messagesByConversation.get(convoId);
    msgsObj &&
      Object.keys(msgsObj).forEach(msgId => {
        messages.push(msgsObj[msgId]);
      });
    return messages;
  }

  /**
   * sets the user's typing status in a conversation
   * @param {string} convoId
   * @param {boolean} isTyping
   */
  toggleUserTyping(convoId, isTyping) {
    const userId = userStore.userId;
    chatDb.toggleUserTyping(convoId, userId, isTyping);
  }

  /**
   * returns an array of users typing, filtered by the chosen field
   * (default: displayName)
   * @param {string} convoId
   * @param {string} userFieldToReturn
   * @return {array}
   */
  getUsersTypingByField(convoId, userFieldToReturn = "displayName") {
    let usersTyping = [];
    const conversation = this.getConversation(convoId);
    conversation &&
      conversation.participants &&
      Object.keys(conversation.participants).forEach(uid => {
        if (
          uid !== userStore.userId &&
          conversation.participants[uid].isTyping
        ) {
          const friend = userStore.getUserById(uid);
          friend && usersTyping.push(friend[userFieldToReturn]);
        }
      });
    return usersTyping;
  }

  getUsersInConvo(convoId) {
    const currentConvo = this.conversationMap.get(convoId);
    let users = [];
    currentConvo &&
      currentConvo.participants &&
      Object.keys(currentConvo.participants).forEach(uid => {
        if (uid !== userStore.userId) {
          const user = userStore.getUserById(uid);
          if (user) users.push(user);
        }
      });
    return users;
  }

  conversationContainsNewMessages(convoId, conversation) {
    const existingConvo = this.conversationMap.get(convoId);
    return existingConvo &&
      conversation.messages &&
      (!existingConvo.messages ||
        Object.keys(existingConvo.messages).length !==
          Object.keys(conversation.messages).length)
      ? true
      : false;
  }

  getOtherParticipantIdsInConversation(conversation) {
    const participants =
      conversation && conversation.participants
        ? Object.keys(conversation.participants)
        : [];
    const nonUserParticipants = participants.filter(participantId => {
      return participantId !== userStore.userId;
    });
    return nonUserParticipants;
  }

  addParticipantToConversation(userId, conversationId) {
    const convo = this.conversationMap.get(conversationId);
    let participants = this.getOtherParticipantIdsInConversation(convo);
    participants.push(userId);
    this.markConvoAsClosed(conversationId);
    this.openConversationWithUsers(participants);
  }

  markConversationAsRead(convoId) {
    chatDb.markConversationAsReadByUser(convoId, userStore.userId);
  }
}

const chatStore = new ChatStore();
export default chatStore;
