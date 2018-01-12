import { observable, action } from "mobx";
import _ from "lodash";

import chatService from "../service/ChatService";
import usersStore from "./UsersStore";

class ChatStore {
  subscribeToEvents() {
    //must be inline functions, or use .bind(this)
    usersStore.onLogin(this.loadConversationsForUser.bind(this));
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
    chatService.listenToUsersConversationIds(user.id, (err, convoId) => {
      err ? console.log(err) : this.listenToConversation(convoId);
    });
  };

  @action
  loadMessagesForConversation(convoId, predefinedMessages) {
    if (this.messagesByConversation.get(convoId)) {
      //already listening to this convo's messages
      return;
    }
    this.messagesByConversation.set(convoId, {});
    this.listenToConversation(convoId);
    chatService.listenForNewMessages(convoId, (err, msg) => {
      if (err || !msg) {
        return console.log(err || "Null msg!");
      }
      if (
        msg.sentBy !== usersStore.userId &&
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
  listenToConversation = cid => {
    chatService.listenToConversation(cid, convo => {
      if (this.conversationContainsNewMessages(cid, convo)) {
        const participants = this.getOtherParticipantIdsInConversation(convo);
        this.openConversationWithUsers(participants);
      }
      this.conversationMap.set(cid, convo);
    });
  };

  findExistingConversationWithParticipants(friendIds) {
    const existingConvoEntry = this.conversationMap
      .entries()
      .find(([convoId, convo]) => {
        const participants =
          convo && convo.participants && Object.keys(convo.participants);
        if (participants && participants.length === friendIds.length + 1) {
          let nonInclusion = friendIds.find(fid => {
            return !participants.includes(fid);
          });
          return nonInclusion ? false : true;
        }
        return false;
      });
    return (existingConvoEntry && existingConvoEntry[1]) || null;
  }

  sendMessage(conversationId, messageBody) {
    const userId = usersStore.userId;
    const message = {
      body: messageBody,
      sentBy: userId
    };
    chatService.sendMessage(conversationId, message);
  }

  @action
  openConversationWithUsers(friendIds) {
    const existingConvo = this.findExistingConversationWithParticipants(
      friendIds
    );
    debugger;
    if (existingConvo) {
      this.markConvoAsOpen(existingConvo.id);
      this.loadMessagesForConversation(existingConvo.id);
    } else {
      const participants = friendIds.concat([usersStore.userId]);
      chatService.createConversation(participants, (err, convoId) => {
        this.markConvoAsOpen(convoId);
        this.loadMessagesForConversation(convoId);
      });
    }
  }

  openConversationWithUser(friendId) {
    this.openConversationWithUsers([friendId]);
  }

  @action
  markConvoAsOpen(convoId) {
    if (!this.openConversationIds.includes(convoId)) {
      this.openConversationIds.push(convoId);
    } else {
      //redudant call for some reason..
      debugger;
    }
  }

  @action
  markConvoAsClosed(convoId) {
    let i = this.openConversationIds.findIndex(iteratorId => {
      return convoId === iteratorId;
    });
    i >= 0 && this.openConversationIds.splice(i, 1);
  }

  getConversation(convoId) {
    return this.conversationMap.get(convoId);
  }

  getMessages(convoId) {
    let messages = [];
    let msgsObj = this.messagesByConversation.get(convoId);
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
    const userId = usersStore.userId;
    chatService.toggleUserTyping(convoId, userId, isTyping);
  }

  /**
   * returns an array of users typing, filtered by the chosen field
   * (default: displayName)
   * @param {string} convoId
   * @param {string} userFieldToReturn
   * @return {array}
   */
  getUsersTypingByField(convoId, userFieldToReturn) {
    userFieldToReturn = userFieldToReturn || "displayName";
    let usersTyping = [];
    const conversation = this.getConversation(convoId);
    conversation &&
      conversation.participants &&
      Object.keys(conversation.participants).forEach(uid => {
        if (
          uid !== usersStore.userId &&
          conversation.participants[uid].isTyping
        ) {
          let friend = usersStore.getUserById(uid);
          friend && usersTyping.push(friend[userFieldToReturn]);
        }
      });
    return usersTyping;
  }

  getUsersInConvo(convoId) {
    let currentConvo = this.conversationMap.get(convoId);
    let users = [];
    currentConvo &&
      currentConvo.participants &&
      Object.keys(currentConvo.participants).forEach(uid => {
        if (uid !== usersStore.userId) {
          let user = usersStore.getUserById(uid);
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
      return participantId !== usersStore.userId;
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
}

const chatStore = new ChatStore();
export default chatStore;
