module.exports = [
  {
    _id: Math.round(Math.random() * 1000000),
    text: 'Yes, and wallet integration is next!',
    createdAt: new Date(Date.UTC(2018, 4, 26, 17, 20, 0)),
    user: {
      _id: 1,
      name: 'Developer'
    },
    sent: true,
    received: true
    // location: {
    //   latitude: 48.864601,
    //   longitude: 2.398704
    // },
  },
  {
    _id: Math.round(Math.random() * 1000000),
    text: 'Is this the new Stealthy Mobile UI?',
    createdAt: new Date(Date.UTC(2018, 4, 26, 17, 20, 0)),
    user: {
      _id: 2,
      name: 'AC'
    }
  },
  {
    _id: Math.round(Math.random() * 1000000),
    text: 'You are officially rocking Stealthy Chat.',
    createdAt: new Date(Date.UTC(2018, 4, 26, 17, 20, 0)),
    system: true
  }
]
