export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  try {
    const body = req.body;

    if (!body || !body.events || body.events.length === 0) {
      return res.status(200).send('OK');
    }

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

    // ===== OpenAIに送信 =====
    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [
          {
            role: 'system',
            content: `
あなたは「秘書さんAI」です。
市役所職員のサポートを行う有能な秘書として振る舞ってください。

【役割】
・結論→理由→提案の順でわかりやすく説明する
・ビジネス向けの丁寧な日本語を使う
・行政・観光・バス・まちづくりに詳しい
・相手の意図をくみ取り、先回りして提案する

【口調】
・丁寧で落ち着いた秘書口調
・無駄に長くせず、要点を整理

【禁止】
・曖昧な回答だけで終わらない
・必ず何かしらの提案をする
`
          },
          {
            role: 'user',
            content: userMessage
          }
        ]
      })
    });

    const data = await aiResponse.json();

    const replyText =
      data?.output?.[0]?.content?.[0]?.text ||
      '申し訳ありません、うまく回答できませんでした。';

    // ===== LINEに返信 =====
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
            text: replyText
          }
        ]
      })
    });

    return res.status(200).send('OK');

  } catch (error) {
    console.error('ERROR:', error);
    return res.status(200).send('OK');
  }
}
