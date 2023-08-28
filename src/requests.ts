import request, { HttpVerb } from 'sync-request';
import { port, url } from './config.json';

export const OK = 200;
export const BAD_REQUEST = 400;
export const FORBIDDEN = 403;

// Helper function to generate any type of request given the path and paylod.
function makeReq(method: HttpVerb, path: string, payload: any) {
  let qs = {};
  let json = {};
  let headers = {};
  if ('token' in payload) {
    headers = { token: payload.token };
    delete payload.token;
  }

  if (['GET', 'DELETE'].includes(method)) {
    qs = payload;
  } else {
    json = payload;
  }

  const res = request(method, `${url}:${port}` + path, { qs, json, headers });
  return res.statusCode === OK ? JSON.parse(res.getBody('utf-8')) : res.statusCode;
}

// ========================================== WRAPPER FUNCTIONS =========================================== //

export const reqClear = () =>
  makeReq('DELETE', '/clear/v1', {});

// ======================================================================================================== //

export const reqUserRemove = (token: string, uId: number) =>
  makeReq('DELETE', '/admin/user/remove/v1', { token, uId });

export const reqSetUserPermission = (token: string, uId: number, permissionId: number) =>
  makeReq('POST', '/admin/userpermission/change/v1', { token, uId, permissionId });

// ======================================================================================================== //

export const reqUserStats = (token: string) =>
  makeReq('GET', '/user/stats/v1', { token });

export const reqWorkspaceStats = (token: string) =>
  makeReq('GET', '/users/stats/v1', { token });

// ======================================================================================================== //

export const reqAuthRegister = (email: string, password: string, nameFirst: string, nameLast: string) =>
  makeReq('POST', '/auth/register/v3', { email, password, nameFirst, nameLast });

export const reqAuthLogin = (email: string, password: string) =>
  makeReq('POST', '/auth/login/v3', { email, password });

export const reqAuthLogout = (token: string) =>
  makeReq('POST', '/auth/logout/v2', { token });

export const reqAuthReqPasswordReset = (email: string) =>
  makeReq('POST', '/auth/passwordreset/request/v1', { email });

export const reqAuthPasswordReset = (resetCode: string, newPassword: string) =>
  makeReq('POST', '/auth/passwordreset/reset/v1', { resetCode, newPassword });

export const reqGetResetCode = (uId: number) =>
  makeReq('GET', '/get/resetcode', { uId });

// ======================================================================================================== //

export const reqChannelsCreate = (token: string, name: string, isPublic: boolean) =>
  makeReq('POST', '/channels/create/v3', { token, name, isPublic });

export const reqChannelsList = (token: string) =>
  makeReq('GET', '/channels/list/v3', { token });

export const reqChannelsListAll = (token: string) =>
  makeReq('GET', '/channels/listAll/v3', { token });

// ======================================================================================================== //

export const reqChannelDetails = (token: string, channelId: number) =>
  makeReq('GET', '/channel/details/v3', { token, channelId });

export const reqChannelJoin = (token: string, channelId: number) =>
  makeReq('POST', '/channel/join/v3', { token, channelId });

export const reqChannelInvite = (token: string, channelId: number, uId: number) =>
  makeReq('POST', '/channel/invite/v3', { token, channelId, uId });

export const reqChannelMessages = (token: string, channelId: number, start: number) =>
  makeReq('GET', '/channel/messages/v3', { token, channelId, start });

export const reqChannelLeave = (token: string, channelId: number) =>
  makeReq('POST', '/channel/leave/v2', { token, channelId });

export const reqChannelAddOwner = (token: string, channelId: number, uId: number) =>
  makeReq('POST', '/channel/addowner/v2', { token, channelId, uId });

export const reqChannelRemoveOwner = (token: string, channelId: number, uId: number) =>
  makeReq('POST', '/channel/removeowner/v2', { token, channelId, uId });

// ======================================================================================================== //

export const reqDMCreate = (token: string, uIds: number[]) =>
  makeReq('POST', '/dm/create/v2', { token, uIds });

export const reqDMList = (token: string) =>
  makeReq('GET', '/dm/list/v2', { token });

export const reqDMRemove = (token: string, dmId: number) =>
  makeReq('DELETE', '/dm/remove/v2', { token, dmId });

export const reqGetDMDetails = (token: string, dmId: number) =>
  makeReq('GET', '/dm/details/v2', { token, dmId });

export const reqDMLeave = (token: string, dmId: number) =>
  makeReq('POST', '/dm/leave/v2', { token, dmId });

export const reqDMMessages = (token: string, dmId: number, start: number) =>
  makeReq('GET', '/dm/messages/v2', { token, dmId, start });

// ======================================================================================================== //

export const reqMessageSend = (token: string, channelId: number, message: string) =>
  makeReq('POST', '/message/send/v2', { token, channelId, message });

export const reqMessageSendLater = (token: string, channelId: number, message: string, timeSent: number) =>
  makeReq('POST', '/message/sendlater/v1', { token, channelId, message, timeSent });

export const reqMessageSendDM = (token: string, dmId: number, message: string) =>
  makeReq('POST', '/message/senddm/v2', { token, dmId, message });

export const reqMessageSendLaterDM = (token: string, dmId: number, message: string, timeSent: number) =>
  makeReq('POST', '/message/sendlaterdm/v1', { token, dmId, message, timeSent });

export const reqMessageEdit = (token: string, messageId: number, message: string) =>
  makeReq('PUT', '/message/edit/v2', { token, messageId, message });

export const reqMessageRemove = (token: string, messageId: number) =>
  makeReq('DELETE', '/message/remove/v2', { token, messageId });

export const reqMessageSearch = (token: string, queryStr: string) =>
  makeReq('GET', '/search/v1', { token, queryStr });

export const reqMessageShare = (token: string, ogMessageId: number, channelId: number, dmId: number, message?: string) =>
  makeReq('POST', '/message/share/v1', { token, ogMessageId, channelId, dmId, message });

export const reqMessageReact = (token: string, messageId: number, reactId: number) =>
  makeReq('POST', '/message/react/v1', { token, messageId, reactId });

export const reqMessageUnreact = (token: string, messageId: number, reactId: number) =>
  makeReq('POST', '/message/unreact/v1', { token, messageId, reactId });

export const reqMessagePin = (token: string, messageId: number) =>
  makeReq('POST', '/message/pin/v1', { token, messageId });

export const reqMessageUnpin = (token: string, messageId: number) =>
  makeReq('POST', '/message/unpin/v1', { token, messageId });

// ======================================================================================================== //

export const reqStandupStart = (token: string, channelId: number, length: number) =>
  makeReq('POST', '/standup/start/v1', { token, channelId, length });

export const reqStandupActive = (token: string, channelId: number) =>
  makeReq('GET', '/standup/active/v1', { token, channelId });

export const reqStandupSend = (token: string, channelId: number, message: string) =>
  makeReq('POST', '/standup/send/v1', { token, channelId, message });

// ======================================================================================================== //

export const reqUserProfile = (token: string, uId: number) =>
  makeReq('GET', '/user/profile/v3', { token, uId });

export const reqUsersAll = (token: string) =>
  makeReq('GET', '/users/all/v2', { token });

export const reqUserSetName = (token: string, nameFirst: string, nameLast: string) =>
  makeReq('PUT', '/user/profile/setname/v2', { token, nameFirst, nameLast });

export const reqUserSetEmail = (token: string, email: string) =>
  makeReq('PUT', '/user/profile/setemail/v2', { token, email });

export const reqUserSetHandle = (token: string, handleStr: string) =>
  makeReq('PUT', '/user/profile/sethandle/v2', { token, handleStr });

export const reqUserSetPhoto = (token: string, imgUrl: string, xStart: number, yStart: number, xEnd: number, yEnd: number) =>
  makeReq('POST', '/user/profile/uploadphoto/v1', { token, imgUrl, xStart, yStart, xEnd, yEnd });

// ======================================================================================================== //

export const reqGetNotifications = (token: string) =>
  makeReq('GET', '/notifications/get/v1', { token });

// ======================================================================================================== //
