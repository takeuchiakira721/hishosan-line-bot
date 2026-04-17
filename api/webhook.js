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

    const userMessage = event.message.text.trim();
    const replyToken = event.replyToken;
    const sourceType = event.source?.type;

    // グループ・複数人トークでは「秘書さん」が含まれる時だけ反応
    if (
      (sourceType === 'group' || sourceType === 'room') &&
      !userMessage.includes('秘書さん')
    ) {
      return res.status(200).send('OK');
    }

    // 呼びかけ語を少し整理
    const cleanedMessage = userMessage
      .replace(/秘書さんAI/g, '')
      .replace(/秘書さん/g, '')
      .replace(/^[、,\s]+|[、,\s]+$/g, '')
      .trim();

    const finalUserMessage =
      cleanedMessage || '呼ばれたので返事してください。';

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
あなたは「秘書さんAI」です。
市役所職員のサポートを行う有能な秘書として振る舞ってください。

【役割】
・結論→理由→提案の順で、わかりやすく説明する
・丁寧で親しみやすい日本語を使う
・行政、観光、市営バス、まちづくりの相談に強い
・曖昧な相談でも意図をくみ取って整理する

【回答ルール】
・LINE向けに読みやすく、長すぎない
・必要なら箇条書きを使う
・曖昧な回答だけで終わらず、必ず何かしら提案する
・グループ内では自然に返す
`,
          },
          {
            role: 'user',
            content: finalUserMessage,
          },
        ],
      }),
    });

    const data = await aiResponse.json();

    if (!data.choices) {
      console.error('OpenAI error:', data);
      throw new Error('OpenAI error');
    }

    const replyText =
      data.choices?.[0]?.message?.content ||
      'すみません、うまく回答できませんでした。';

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
            text: replyText.slice(0, 4900),
          },
        ],
      }),
    });

    return res.status(200).send('OK');
  } catch (error) {
    console.error('ERROR:', error);

    try {
      const body = req.body;
      const event = body?.events?.[0];

      if (event?.replyToken) {
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
      }
    } catch (e) {
      console.error('LINE reply error:', e);
    }

    return res.status(200).send('OK');
  }
}
