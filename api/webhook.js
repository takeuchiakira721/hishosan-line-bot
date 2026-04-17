export default async function handler(req, res) {
  // LINEのWebhookはPOSTのみ
  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  try {
    const body = req.body;

    // データがない場合は終了
    if (!body || !body.events || body.events.length === 0) {
      return res.status(200).send('OK');
    }

    const event = body.events[0];

    // テキスト以外は無視
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
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `
あなたは優秀な秘書AIです。
丁寧で親しみやすく、日本語で回答してください。
相手の意図をくみ取り、必要に応じて提案や分析も行ってください。
`,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    const data = await aiResponse.json();

    // エラー時
    if (!data.choices) {
      console.error('OpenAI error:', data);
      throw new Error('OpenAI error');
    }

    const replyText = data.choices[0].message.content;

    // ===== LINEに返信 =====
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [
          {
            type: 'text',
            text: replyText,
          },
        ],
      }),
    });

    return res.status(200).send('OK');

  } catch (error) {
    console.error('ERROR:', error);

    // エラー時もLINEに返す（ユーザー体験改善）
    try {
      const body = req.body;
      const event = body.events[0];

      await fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [
            {
              type: 'text',
              text: 'すみません、現在うまく回答できませんでした。',
            },
          ],
        }),
      });
    } catch (e) {
      console.error('LINE reply error:', e);
    }

    return res.status(200).send('OK');
  }
}
