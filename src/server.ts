import fs from 'fs';
import express, { json, Request, Response } from 'express';
import morgan from 'morgan';
import config from './config.json';
import cors from 'cors';
import errorHandler from 'middleware-http-errors';
import { getResetCode } from './helpers';
import {
  dataFile,
  setData,
  clear,
  getData
} from './dataStore';
import {
  removeUser,
  setUserPermission,
} from './beans/admin';
import {
  userStats,
  workspaceStats,
} from './beans/analytics';
import {
  authRegister,
  authLogin,
  authLogout,
  authReqPasswordReset,
  authPasswordReset,
} from './beans/auth';
import {
  channelsCreate,
  channelsList,
  channelsListAll,
} from './beans/channels';
import {
  channelDetails,
  channelJoin,
  channelInvite,
  channelLeave,
  channelAddOwner,
  channelRemoveOwner,
} from './beans/channel';
import {
  DMCreate,
  DMList,
  DMRemove,
  getDMDetails,
  DMLeave,
} from './beans/dm';
import {
  messageSend,
  messageEdit,
  messageRemove,
  chatMessages,
} from './beans/message1';
import {
  messageSearch,
  messageShare,
  messageReact,
  messageUnreact,
  messagePin,
  messageUnpin,
} from './beans/message2';
import {
  getNotifications,
} from './beans/notifications';
import {
  standupStart,
  standupActive,
  standupSend,
} from './beans/standup';
import {
  userProfile,
  usersAll,
  userSetName,
  userSetEmail,
  userSetHandle,
  userSetPhoto,
} from './beans/users';

// Set up web app
const app = express();
// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());
// storing user profile pictures in the server
app.use('/static', express.static('profile_photos'));

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || 'localhost';

// restore the previous state of the data
if (fs.existsSync(dataFile)) {
  const dataShape = getData();
  const prevData = JSON.parse(fs.readFileSync(dataFile).toString());
  if (Object.keys(dataShape).toString() === Object.keys(prevData).toString()) {
    setData(prevData);
  }
}

// ========================================================================= //

app.delete('/admin/user/remove/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const uId = req.query.uId as string;
  res.json(removeUser(token, parseInt(uId)));
});

app.post('/admin/userpermission/change/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const { uId, permissionId } = req.body;
  res.json(setUserPermission(token, parseInt(uId), parseInt(permissionId)));
});

// ========================================================================= //

app.get('/user/stats/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  res.json(userStats(token));
});

app.get('/users/stats/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  res.json(workspaceStats(token));
});

// ========================================================================= //

app.post('/auth/login/v3', (req: Request, res: Response) => {
  const { email, password } = req.body;
  res.json(authLogin(email, password));
});

app.post('/auth/register/v3', (req: Request, res: Response) => {
  const { email, password, nameFirst, nameLast } = req.body;
  res.json(authRegister(email, password, nameFirst, nameLast));
});

app.post('/auth/logout/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  res.json(authLogout(token));
});

app.post('/auth/passwordreset/request/v1', (req: Request, res: Response) => {
  const email = req.body.email;
  res.json(authReqPasswordReset(email));
});

app.post('/auth/passwordreset/reset/v1', (req: Request, res: Response) => {
  const { resetCode, newPassword } = req.body;
  res.json(authPasswordReset(resetCode, newPassword));
});

app.get('/get/resetcode', (req: Request, res: Response) => {
  const uId = req.query.uId as string;
  res.json(getResetCode(parseInt(uId)));
});

// ========================================================================= //

app.post('/channels/create/v3', (req: Request, res: Response) => {
  const token = req.header('token');
  const { name, isPublic } = req.body;
  res.json(channelsCreate(token, name, isPublic));
});

app.get('/channels/list/v3', (req: Request, res: Response) => {
  const token = req.header('token');
  res.json(channelsList(token));
});

app.get('/channels/listAll/v3', (req: Request, res: Response) => {
  const token = req.header('token');
  res.json(channelsListAll(token));
});

// ========================================================================= //

app.get('/channel/details/v3', (req: Request, res: Response) => {
  const token = req.header('token');
  const channelId = req.query.channelId as string;
  res.json(channelDetails(token, parseInt(channelId)));
});

app.post('/channel/join/v3', (req: Request, res: Response) => {
  const token = req.header('token');
  const { channelId } = req.body;
  res.json(channelJoin(token, channelId));
});

app.post('/channel/invite/v3', (req: Request, res: Response) => {
  const token = req.header('token');
  const { channelId, uId } = req.body;
  res.json(channelInvite(token, channelId, uId));
});

app.get('/channel/messages/v3', (req: Request, res: Response) => {
  const token = req.header('token');
  const channelId = req.query.channelId as string;
  const start = req.query.start as string;
  res.json(chatMessages(token, parseInt(channelId), parseInt(start)));
});

app.post('/channel/leave/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const { channelId } = req.body;
  res.json(channelLeave(token, channelId));
});

app.post('/channel/addowner/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const { channelId, uId } = req.body;
  res.json(channelAddOwner(token, channelId, uId));
});

app.post('/channel/removeowner/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const { channelId, uId } = req.body;
  res.json(channelRemoveOwner(token, channelId, uId));
});

// ========================================================================= //

app.post('/dm/create/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const { uIds } = req.body;
  res.json(DMCreate(token, uIds));
});

app.get('/dm/list/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  res.json(DMList(token));
});

app.delete('/dm/remove/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const dmId = req.query.dmId as string;
  res.json(DMRemove(token, parseInt(dmId)));
});

app.get('/dm/details/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const dmId = req.query.dmId as string;
  res.json(getDMDetails(token, parseInt(dmId)));
});

app.post('/dm/leave/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const { dmId } = req.body;
  res.json(DMLeave(token, dmId));
});

app.get('/dm/messages/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const dmId = req.query.dmId as string;
  const start = req.query.start as string;
  res.json(chatMessages(token, parseInt(dmId), parseInt(start)));
});

// ========================================================================= //

app.post('/message/send/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const { channelId, message } = req.body;
  res.json(messageSend(token, channelId, message));
});

app.post('/message/sendlater/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const { channelId, message, timeSent } = req.body;
  res.json(messageSend(token, channelId, message, timeSent));
});

app.post('/message/senddm/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const { dmId, message } = req.body;
  res.json(messageSend(token, dmId, message));
});

app.post('/message/sendlaterdm/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const { dmId, message, timeSent } = req.body;
  res.json(messageSend(token, dmId, message, timeSent));
});

app.put('/message/edit/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const { messageId, message } = req.body;
  res.json(messageEdit(token, messageId, message));
});

app.delete('/message/remove/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const messageId = req.query.messageId as string;
  res.json(messageRemove(token, parseInt(messageId)));
});

app.get('/search/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const queryStr = req.query.queryStr as string;
  res.json(messageSearch(token, queryStr));
});

app.post('/message/share/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const { ogMessageId, channelId, dmId, message } = req.body;
  res.json(messageShare(token, ogMessageId, channelId, dmId, message));
});

app.post('/message/react/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const { messageId, reactId } = req.body;
  res.json(messageReact(token, messageId, reactId));
});

app.post('/message/unreact/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const { messageId, reactId } = req.body;
  res.json(messageUnreact(token, messageId, reactId));
});

app.post('/message/pin/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const messageId = req.body.messageId;
  res.json(messagePin(token, messageId));
});

app.post('/message/unpin/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const messageId = req.body.messageId;
  res.json(messageUnpin(token, messageId));
});

// ========================================================================= //

app.post('/standup/start/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const { channelId, length } = req.body;
  res.json(standupStart(token, channelId, length));
});

app.get('/standup/active/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const channelId = req.query.channelId as string;
  res.json(standupActive(token, parseInt(channelId)));
});

app.post('/standup/send/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const { channelId, message } = req.body;
  res.json(standupSend(token, channelId, message));
});

// ========================================================================= //

app.get('/user/profile/v3', (req: Request, res: Response) => {
  const token = req.header('token');
  const uId = req.query.uId as string;
  res.json(userProfile(token, parseInt(uId)));
});

app.get('/users/all/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  res.json(usersAll(token));
});

app.put('/user/profile/setname/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const { nameFirst, nameLast } = req.body;
  res.json(userSetName(token, nameFirst, nameLast));
});

app.put('/user/profile/setemail/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const { email } = req.body;
  res.json(userSetEmail(token, email));
});

app.put('/user/profile/sethandle/v2', (req: Request, res: Response) => {
  const token = req.header('token');
  const { handleStr } = req.body;
  res.json(userSetHandle(token, handleStr));
});

app.post('/user/profile/uploadphoto/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  const { imgUrl, xStart, yStart, xEnd, yEnd } = req.body;
  res.json(userSetPhoto(token, imgUrl, [xStart, yStart, xEnd, yEnd]));
});

// ========================================================================= //

app.get('/notifications/get/v1', (req: Request, res: Response) => {
  const token = req.header('token');
  res.json(getNotifications(token));
});

// ========================================================================= //

app.delete('/clear/v1', (req: Request, res: Response) => {
  res.json(clear());
});

// handles errors nicely
app.use(errorHandler());
// for logging errors (print to terminal)
app.use(morgan('dev'));

// start server
const server = app.listen(PORT, HOST, () => {
  console.log(`⚡️ Server listening on port ${PORT} at ${HOST}`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  server.close(() => console.log('Shutting down server gracefully.'));
});

// ========================================================================= //
