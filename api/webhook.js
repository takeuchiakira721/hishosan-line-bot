export default async function handler(req, res) {
  if (req.method === 'POST') {
    const body = req.body;

    const replyToken = body.events[0].replyToken;

    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [
          {
            type: 'text',
            text: '秘書さんAIです！'
          }
        ]
      })
    });

    return res.status(200).end();
  }

  return res.status(200).send('OK');
}
