
// ========== FOR FUNCTIONS ========== //

export type EmptyObj = (
  Record<string, never>
);

export type Auth = {
  token: string;
  authUserId: number;
};

export type ChannelId = {
  channelId: number;
};

export type DMId = {
  dmId: number;
};

export type MessageId = {
  messageId: number;
};

export type SharedMessageId = {
  sharedMessageId: number;
};

// =================================== //

export type Profile = {
  user: {
    uId: number;
    email: string;
    nameFirst: string;
    nameLast: string;
    handleStr: string;
    profileImgUrl: string;
  };
};

export type Profiles = {
  users: Profile['user'][];
};

// =================================== //

export type Channels = {
  channels: {
    channelId: number;
    name: string;
  }[];
};

export type ChannelDetails = {
  name: string;
  isPublic: boolean;
  ownerMembers: Profile['user'][];
  allMembers: Profile['user'][];
};

// =================================== //

export type DMs = {
  dms: {
    dmId: number;
    name: string;
  }[];
};

export type DMDetails = {
  name: string;
  members: Profile['user'][];
};

// =================================== //

export type React = {
  reactId: number;
  uIds: number[];
  isThisUserReacted: boolean;
};

export type Messages = {
  messages: {
    messageId: number;
    uId: number;
    message: string;
    timeSent: number;
    reacts: React[];
    isPinned: boolean;
  }[];
}

export type PaginatedMessages = {
  messages: Messages['messages'];
  start: number;
  end: number;
};

// =================================== //

export type TimeFinish = {
  timeFinish: number;
};

export type StandupActive = {
  isActive: boolean;
  timeFinish: number;
};

// =================================== //

export type Notifications = {
  notifications: {
    channelId: number;
    dmId: number;
    notificationMessage: string;
  }[];
};

export type UserStats = {
  userStats: {
    channelsJoined: {
      numChannelsJoined: number;
      timeStamp: number;
    }[];
    dmsJoined: {
      numDmsJoined: number;
      timeStamp: number;
    }[];
    messagesSent: {
      numMessagesSent: number;
      timeStamp: number;
    }[];
    involvementRate: number;
  };
};

export type WorkspaceStats = {
  workspaceStats: {
    channelsExist: {
      numChannelsExist: number;
      timeStamp: number;
    }[];
    dmsExist: {
      numDmsExist: number;
      timeStamp: number;
    }[];
    messagesExist: {
      numMessagesExist: number;
      timeStamp: number;
    }[];
    utilizationRate: number;
  };
};

// ========== FOR DATABASE ========== //

export type User = {
  uId: number;
  email: string;
  password: string;
  nameFirst: string;
  nameLast: string;
  handleStr: string;
  profileImgUrl: string;
  isGlobalOwner: boolean;
  tokens: string[];
  userStats: UserStats['userStats'];
};

export type Standup = {
  isActive: boolean;
  timeFinish: number;
  creatorId: number;
};

export type Channel = {
  channelId: number;
  name: string;
  isPublic: boolean;
  ownerIds: number[];
  memberIds: number[];
  standup: Standup;
};

export type DM = {
  dmId: number;
  name: string;
  ownerId: number;
  memberIds: number[];
};

export type Message = {
  messageId: number;
  uId: number;
  chatId: number;
  message: string;
  timeSent: number;
  reacts: React[];
  isPinned: boolean;
  isStandup: boolean;
};

export type Notification = {
  uId: number;
  channelId: number;
  dmId: number;
  notificationMessage: string;
};

export type Data = {
  users: User[];
  removedUsers: User[];
  channels: Channel[];
  DMs: DM[];
  messages: Message[];
  removedMessages: Message[];
  notifications: Notification[];
  workspaceStats: WorkspaceStats['workspaceStats'];
  resetCodes: {
    resetCode: string;
    uId: number;
  }[];
};

// =================================== //
