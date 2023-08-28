import fs from 'fs';
import { Data } from './types';
import { updateUserStats, updateWorkspaceStats } from './beans/analytics';
const dataFile = '../database.json';

let data: Data = {
  users: [],
  removedUsers: [],
  channels: [],
  DMs: [],
  messages: [],
  removedMessages: [],
  notifications: [],
  workspaceStats: undefined,
  resetCodes: [],
};

// Use get() to access the data
function getData() {
  return data;
}

// Use set(newData) to pass in the entire data object, with modifications made
function setData(newData: Data) {
  data = newData;
  updateUserStats();
  updateWorkspaceStats();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// Resets the internal data of the database to its initial state
function clear() {
  setData({
    users: [],
    removedUsers: [],
    channels: [],
    DMs: [],
    messages: [],
    removedMessages: [],
    notifications: [],
    workspaceStats: undefined,
    resetCodes: [],
  });
  return {};
}

export { dataFile, getData, setData, clear };
