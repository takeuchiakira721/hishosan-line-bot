import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const body = req.body;
    const event = body.events[0];

    if (
      event.type !== 'message' ||
      !event.message ||
      event.message.type !== 'text'
    ) {
      return res.status(200).send('OK');
    }

    const userMessage = event.message.text;
    const replyToken = event.replyToken;

    try {
      // OpenAIに送信
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: 'あなたは優秀でフレンドリーな秘書です。丁寧で自然な日本語で答えてください。' },
            { role: 'user', content: userMessage }
          ]
        })
      });

      const data = await aiResponse.json();
      const replyText = data.choices[0].message.content;

      // LINEに返信
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
              text: replyText
            }
          ]
        })
      });

      return res.status(200).send('OK');

    } catch (error) {
      console.error(error);
      return res.status(200).send('OK');
    }
  }
}
