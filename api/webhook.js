export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(200).send('OK');
    }

    const body = req.body || {};
    const events = body.events || [];

    if (events.length === 0) {
      return res.status(200).send('OK');
    }

    const event = events[0];

    if (
      event.type !== 'message' ||
      !event.message ||
      event.message.type !== 'text'
    ) {
      return res.status(200).send('OK');
    }

    const replyToken = event.replyToken;

    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [
          {
            type: 'text',
            text: '秘書さんAIです！'
          }
        ]
      })
    });

    return res.status(200).send('OK');
  } catch (error) {
    return res.status(200).send('OK');
  }
}
