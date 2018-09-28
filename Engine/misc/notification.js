import icon from './../images/icon-128x128.png';

export default function notification(data) {
  // https://developer.mozilla.org/en-US/docs/Web/API/notification
  // Let's check if the browser supports notifications
  if (!('Notification' in window)) {
    alert('This browser does not support desktop notification');
  }

  // Let's check whether notification permissions have already been granted
  else if (Notification.permission === 'granted') {
    // If it's okay let's create a notification
    const { title, body, tag } = data;
    const notification = new Notification(title, { body, tag, icon });
  }

  // Otherwise, we need to ask the user for permission
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission((permission) => {
      // If the user accepts, let's create a notification
      if (permission === 'granted') {
        const { title, body, tag } = data;
        const notification = new Notification(title, { body, tag, icon });
      }
    });
  }

  // At last, if the user has denied notifications, and you
  // want to be respectful there is no need to bother them any more.
}
