export const statusIndicators = {
  available: 'green',
  busy: 'red',
  inactive: 'yellow',
  offline: 'grey',
};

export const defaultSettings = {
  notifications: true,
  analytics: true,
  discovery: true,
  heartbeat: false,
  webrtc: false,
  twitterShare: false,
}


export const testContactArr = [
  {
    id: 'poochkin.id',
    title: 'Vladimir Poochkin',
    summary: 'World Domination!',
    unread: 0,
    time: '2 mins ago',
    status: statusIndicators.offline,
    publicKey: '0321f3753d7f1bde82672bbcca9363bc9f9f074ffdb5ec4741f76da47df97f90a8',
  },
  {
    id: 'batzdorff.id',
    title: 'Batzdorff Carreira',
    summary: 'Ruff!',
    unread: 0,
    time: '2 mins ago',
    status: statusIndicators.offline,
    publicKey: '0321f3753d7f1bde82672bbcca9363bc9f9f074ffdb5ec4741f76da47df97f90a8',
  },
  {
    id: 'piehead.id',
    title: 'Pie-Head Carreira',
    summary: 'Food?',
    unread: 0,
    time: '7 mins ago',
    status: statusIndicators.offline,
    publicKey: '0321f3753d7f1bde82672bbcca9363bc9f9f074ffdb5ec4741f76da47df97f90a8',
  },
];
